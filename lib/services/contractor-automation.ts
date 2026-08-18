/**
 * Contractor Automation Service
 * Handles the full pipeline: Quote Accepted → Contract → Job → Payment → Completion
 * Mirrors the PM-side tenant automation flow.
 */

import { prisma } from '@/db/prisma';
import { randomBytes } from 'crypto';
import { eventBus } from '@/lib/event-system';

const db = prisma as any;

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CTR-${year}-${rand}`;
}

function generateJobNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `JOB-${year}-${rand}`;
}

// ── Quote Accepted Pipeline ───────────────────────────────────────────────────

export async function onQuoteAccepted(quoteId: string) {
  const quote = await db.contractorQuote.findUnique({
    where: { id: quoteId },
    include: {
      lead: true,
      contractor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phoneNumber: true } },
    },
  });

  if (!quote) throw new Error('Quote not found');

  const contractor = quote.contractor;
  const customer = quote.customer;
  const lead = quote.lead;

  // 1. Ensure customer record exists in contractor's CRM
  const customerRecord = await ensureCustomerRecord({
    contractorId: contractor.id,
    userId: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phoneNumber,
    source: lead?.source || 'marketplace',
  });

  // 2. Create the job
  const job = await createJobFromQuote(quote, customerRecord.id);

  // 3. Create the contract from quote
  const contract = await createContractFromQuote(quote, job.id, contractor, customer);

  // 4. Auto-send the contract for signing
  const signingUrl = await sendContractForSigning(contract.id, contractor);

  // 5. Send email to customer with signing link
  await sendContractEmail({
    customerEmail: customer.email,
    customerName: customer.name,
    contractorName: contractor.businessName || contractor.user.name,
    contractTitle: contract.title,
    contractAmount: quote.totalPrice,
    signingUrl,
  });

  // 6. Notify contractor
  await db.notification.create({
    data: {
      userId: contractor.user.id,
      type: 'reminder',
      title: 'Quote Accepted!',
      message: `${customer.name} accepted your quote "${quote.title}". A contract has been auto-generated and sent for signing.`,
      actionUrl: `/contractor-dashboard/contracts/${contract.id}`,
    },
  });

  // 7. Update lead stage if applicable
  if (lead) {
    await db.contractorLead.update({
      where: { id: lead.id },
      data: {
        stage: 'won',
        convertedToJobId: job.id,
      },
    });
  }

  // 8. Emit events for downstream automation
  await eventBus.emit('contractor.quote.accepted', {
    quoteId: quote.id,
    jobId: job.id,
    contractId: contract.id,
    contractorId: contractor.id,
    customerId: customer.id,
    contractorUserId: contractor.user.id,
  });

  return { job, contract, signingUrl };
}

// ── Contract Signed Pipeline ──────────────────────────────────────────────────

export async function onContractSigned(contractId: string) {
  const contract = await db.contractorContract.findUnique({
    where: { id: contractId },
    include: {
      job: true,
      contractor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!contract) return;

  // 1. Transition job to "scheduled"
  if (contract.job) {
    await db.contractorJob.update({
      where: { id: contract.job.id },
      data: {
        status: 'scheduled',
      },
    });

    await eventBus.emit('contractor.job.status_changed', {
      jobId: contract.job.id,
      previousStatus: contract.job.status,
      newStatus: 'scheduled',
      contractorId: contract.contractorId,
      contractorUserId: contract.contractor.user.id,
    });
  }

  // 2. Notify contractor
  await db.notification.create({
    data: {
      userId: contract.contractor.user.id,
      type: 'reminder',
      title: 'Contract Signed — Ready to Schedule',
      message: `${contract.customerName} signed "${contract.title}". The job is now ready to be scheduled.`,
      actionUrl: contract.job
        ? `/contractor-dashboard/jobs/${contract.job.id}`
        : `/contractor-dashboard/contracts/${contract.id}`,
    },
  });

  // 3. Emit event
  await eventBus.emit('contractor.contract.signed', {
    contractId: contract.id,
    jobId: contract.job?.id,
    contractorId: contract.contractorId,
    contractorUserId: contract.contractor.user.id,
    customerName: contract.customerName,
    customerEmail: contract.customerEmail,
  });
}

// ── Job Status Change Pipeline ────────────────────────────────────────────────

export async function onJobStatusChanged(
  jobId: string,
  previousStatus: string,
  newStatus: string
) {
  const job = await db.contractorJob.findUnique({
    where: { id: jobId },
    include: {
      contractor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      customer: true,
    },
  });

  if (!job) return;

  // Job started → notify customer
  if (newStatus === 'in_progress' && previousStatus !== 'in_progress') {
    if (job.customer?.userId) {
      await db.notification.create({
        data: {
          userId: job.customer.userId,
          type: 'reminder',
          title: 'Work Has Started',
          message: `${job.contractor.businessName || 'Your contractor'} has started work on "${job.title}".`,
          actionUrl: `/customer/jobs/${job.id}`,
        },
      });
    }
  }

  // Job scheduled → notify assigned crew members
  if (newStatus === 'scheduled' && previousStatus !== 'scheduled') {
    const assignedIds: string[] = Array.isArray(job.assignedEmployeeIds) ? job.assignedEmployeeIds : [];
    if (assignedIds.length > 0) {
      const employees = await db.contractorEmployee.findMany({
        where: { id: { in: assignedIds }, contractorId: job.contractorId },
        select: { id: true, firstName: true, lastName: true, userId: true },
      });

      const jobAddress = [job.address, job.city, job.state].filter(Boolean).join(', ');
      const startStr = job.estimatedStartDate
        ? new Date(job.estimatedStartDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : null;

      for (const emp of employees) {
        if (!emp.userId) continue;
        await db.notification.create({
          data: {
            userId: emp.userId,
            type: 'reminder',
            title: `Scheduled: ${job.title}`,
            message: `You're assigned to ${job.jobNumber}${jobAddress ? ` at ${jobAddress}` : ''}${startStr ? ` on ${startStr}` : ''}.`,
            actionUrl: `/contractor-dashboard/jobs/${job.id}`,
          },
        });
      }
    }

    // Auto-check inventory and create POs for material shortages
    try {
      await autoCreatePurchaseOrdersOnSchedule({
        jobId: job.id,
        contractorId: job.contractorId,
      });
    } catch (err) {
      console.error('[onJobStatusChanged] auto-PO creation failed:', err);
    }

    // Auto-assign crew if none assigned and automation is enabled
    if (!Array.isArray(job.assignedEmployeeIds) || job.assignedEmployeeIds.length === 0) {
      try {
        await autoAssignCrewToJob({
          jobId: job.id,
          contractorId: job.contractorId,
        });
      } catch (err) {
        console.error('[onJobStatusChanged] auto-assign crew failed:', err);
      }
    }
  }

  // Job completed → notify customer, request review
  if (newStatus === 'completed' && previousStatus !== 'completed') {
    if (job.customer?.userId) {
      await db.notification.create({
        data: {
          userId: job.customer.userId,
          type: 'reminder',
          title: 'Job Completed — Review Required',
          message: `${job.contractor.businessName || 'Your contractor'} has marked "${job.title}" as complete. Please review and approve.`,
          actionUrl: `/customer/jobs/${job.id}`,
        },
      });
    }

    // Auto-generate final invoice
    await eventBus.emit('contractor.job.completed', {
      jobId: job.id,
      contractorId: job.contractorId,
      contractorUserId: job.contractor.user.id,
      customerId: job.customer?.id,
      customerUserId: job.customer?.userId,
      totalCost: job.actualCost || job.estimatedCost,
    });
  }

  // Job approved by customer → trigger payment
  if (newStatus === 'approved' && previousStatus !== 'approved') {
    await eventBus.emit('contractor.job.approved', {
      jobId: job.id,
      contractorId: job.contractorId,
      contractorUserId: job.contractor.user.id,
    });
  }
}

// ── Helper Functions ──────────────────────────────────────────────────────────

async function ensureCustomerRecord({
  contractorId,
  userId,
  name,
  email,
  phone,
  source,
}: {
  contractorId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
}) {
  // Check if customer already exists for this contractor
  const existing = await db.contractorCustomer.findFirst({
    where: {
      contractorId,
      email,
    },
  });

  if (existing) {
    // Upgrade status if still a lead
    if (existing.status === 'lead' || existing.status === 'prospect') {
      await db.contractorCustomer.update({
        where: { id: existing.id },
        data: { status: 'customer', userId },
      });
    }
    return existing;
  }

  return db.contractorCustomer.create({
    data: {
      contractorId,
      userId,
      name,
      email,
      phone,
      status: 'customer',
      source,
    },
  });
}

async function createJobFromQuote(quote: any, customerRecordId: string) {
  let jobNumber = generateJobNumber();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.contractorJob.findUnique({ where: { jobNumber } });
    if (!existing) break;
    jobNumber = generateJobNumber();
    attempts++;
  }

  return db.contractorJob.create({
    data: {
      contractorId: quote.contractorId,
      customerId: customerRecordId,
      leadId: quote.leadId,
      jobNumber,
      title: quote.title,
      description: quote.projectScope || quote.description,
      status: 'approved',
      estimatedCost: quote.totalPrice,
      laborCost: quote.hourlyRate
        ? quote.hourlyRate * (quote.estimatedHours || 0)
        : null,
      estimatedStartDate: quote.startDate,
      estimatedEndDate: quote.completionDate,
      estimatedHours: quote.estimatedHours
        ? Math.round(Number(quote.estimatedHours))
        : null,
      priority: 'normal',
    },
  });
}

async function createContractFromQuote(
  quote: any,
  jobId: string,
  contractor: any,
  customer: any
) {
  let contractNumber = generateContractNumber();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.contractorContract.findUnique({
      where: { contractNumber },
    });
    if (!existing) break;
    contractNumber = generateContractNumber();
    attempts++;
  }

  const contractBody = generateContractBody(quote, contractor, customer);

  return db.contractorContract.create({
    data: {
      contractorId: contractor.id,
      jobId,
      contractNumber,
      title: `Service Agreement — ${quote.title}`,
      type: 'service_agreement',
      body: contractBody,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phoneNumber || null,
      contractorName: contractor.businessName || contractor.user.name,
      contractorEmail: contractor.email || contractor.user.email,
      contractorPhone: contractor.phone || null,
      contractAmount: quote.totalPrice,
      depositAmount: quote.paymentTerms === 'upfront' ? quote.totalPrice : null,
      paymentTerms: quote.paymentTerms || 'due_on_completion',
      expiresAt: new Date(Date.now() + 14 * 86_400_000), // 14 days to sign
      notes: quote.notes,
      status: 'draft',
    },
  });
}

async function sendContractForSigning(contractId: string, contractor: any) {
  const token = randomBytes(32).toString('hex');

  await db.contractorContract.update({
    where: { id: contractId },
    data: {
      token,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  await db.contractorContractEvent.create({
    data: {
      contractId,
      eventType: 'sent',
      actor: 'system',
      actorName: 'Automation',
      note: 'Auto-sent after quote acceptance',
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return `${baseUrl}/sign/contractor/${token}`;
}

function generateContractBody(quote: any, contractor: any, customer: any): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const deliverables = (quote.deliverables || [])
    .map((d: string, i: number) => `  ${i + 1}. ${d}`)
    .join('\n');

  return `SERVICE AGREEMENT

Date: ${today}
Contract #: [Auto-assigned]

BETWEEN:
Contractor: ${contractor.businessName || contractor.user.name}
Email: ${contractor.email || contractor.user.email}
${contractor.phone ? `Phone: ${contractor.phone}` : ''}

AND:
Client: ${customer.name}
Email: ${customer.email}
${customer.phoneNumber ? `Phone: ${customer.phoneNumber}` : ''}

─────────────────────────────────────────────

1. SCOPE OF WORK

${quote.title}

${quote.projectScope || quote.description || 'As discussed and agreed upon.'}

${deliverables ? `Deliverables:\n${deliverables}` : ''}

2. TIMELINE

${quote.startDate ? `Estimated Start: ${new Date(quote.startDate).toLocaleDateString()}` : 'Start date to be scheduled after signing.'}
${quote.completionDate ? `Estimated Completion: ${new Date(quote.completionDate).toLocaleDateString()}` : ''}
${quote.estimatedHours ? `Estimated Hours: ${quote.estimatedHours}` : ''}

3. PRICING

Total Price: $${Number(quote.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
${Number(quote.discount) > 0 ? `Discount Applied: $${Number(quote.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${Number(quote.tax) > 0 ? `Tax: $${Number(quote.tax).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}

4. PAYMENT TERMS

${quote.paymentTerms === 'upfront' ? 'Full payment due before work begins.' : ''}${quote.paymentTerms === 'milestone' ? 'Payment due at completion of each milestone.' : ''}${quote.paymentTerms === 'net_30' ? 'Payment due within 30 days of invoice.' : ''}${!quote.paymentTerms || quote.paymentTerms === 'due_on_completion' ? 'Payment due upon completion of work.' : ''}

5. WARRANTY

${quote.warranty || 'Standard workmanship warranty applies. Contractor guarantees quality of work for 30 days after completion.'}

6. TERMS & CONDITIONS

a) Any changes to the scope of work must be agreed upon in writing by both parties.
b) Either party may cancel this agreement with 48 hours written notice.
c) The contractor is not liable for delays caused by weather, material shortages, or other circumstances beyond their control.
d) All work will be performed in a professional manner and in compliance with applicable codes and regulations.

${quote.notes ? `7. ADDITIONAL NOTES\n\n${quote.notes}` : ''}

─────────────────────────────────────────────

By signing below, both parties agree to the terms outlined in this agreement.`;
}

// ── Email Sending ─────────────────────────────────────────────────────────────

async function sendContractEmail({
  customerEmail,
  customerName,
  contractorName,
  contractTitle,
  contractAmount,
  signingUrl,
}: {
  customerEmail: string;
  customerName: string;
  contractorName: string;
  contractTitle: string;
  contractAmount: any;
  signingUrl: string;
}) {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    const amount = Number(contractAmount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    await resend.emails.send({
      from: `PropertyFlowHQ <${senderEmail}>`,
      to: customerEmail,
      subject: `Contract Ready to Sign: ${contractTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0891b2, #2563eb); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Contract Ready for Signing</h1>
          </div>
          
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #374151;">Hi ${customerName},</p>
            
            <p style="color: #6b7280;">
              <strong>${contractorName}</strong> has prepared a service agreement for your review and signature.
            </p>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-weight: 600; color: #111827;">${contractTitle}</p>
              <p style="margin: 0; color: #6b7280;">Contract Amount: <strong style="color: #059669;">${amount}</strong></p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891b2, #2563eb); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review & Sign Contract
              </a>
            </div>
            
            <p style="font-size: 13px; color: #9ca3af; text-align: center;">
              This link expires in 14 days. If you have questions, reply directly to ${contractorName}.
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Secured by PropertyFlowHQ</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send contract email:', error);
  }
}

// ── Auto-Invoice on Job Completion ───────────────────────────────────────────
/**
 * Called when a job moves to "completed".
 * If the job has a customer and no existing unpaid invoice, auto-creates
 * a draft invoice from the job's time entries and expenses, then sends it.
 * The contractor can still edit it before the customer sees it — but the
 * heavy lifting (line items, totals, payment link) is done automatically.
 */
export async function autoInvoiceOnJobComplete(jobId: string) {
  try {
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        timeEntries: {
          where: { status: 'approved', clockOut: { not: null } },
          select: { id: true, billableHours: true, hourlyRate: true, totalAmount: true },
        },
        expenses: {
          where: { status: { not: 'rejected' } },
          select: { id: true, description: true, amount: true, category: true },
        },
        invoices: {
          where: { status: { not: 'paid' } },
          select: { id: true },
        },
      },
    });

    if (!job || !job.customer) return;

    // Don't auto-invoice if there's already an open invoice
    if (job.invoices?.length > 0) return;

    const lineItems: Array<{ description: string; quantity: number; unitPrice: number; type: 'labor' | 'material' | 'other' }> = [];

    // Labor from approved time entries
    for (const entry of job.timeEntries) {
      if (entry.billableHours && entry.hourlyRate) {
        lineItems.push({
          description: `Labor \u2014 ${job.title}`,
          quantity: Number(entry.billableHours),
          unitPrice: Number(entry.hourlyRate),
          type: 'labor' as const,
        });
      }
    }

    // Fall back to estimated cost if no time entries
    if (lineItems.length === 0 && job.estimatedCost) {
      lineItems.push({
        description: job.title,
        quantity: 1,
        unitPrice: Number(job.estimatedCost),
        type: 'labor' as const,
      });
    }

    // Expenses
    for (const exp of job.expenses) {
      lineItems.push({
        description: exp.description || exp.category,
        quantity: 1,
        unitPrice: Number(exp.amount),
        type: 'material' as const,
      });
    }

    if (lineItems.length === 0) return; // Nothing to invoice

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Net 30

    const { ContractorInvoicingService } = await import('./contractor-invoicing');
    const invoice = await ContractorInvoicingService.createInvoice({
      contractorId: job.contractorId,
      customerId: job.customer.id,
      jobId: job.id,
      lineItems,
      dueDate,
      notes: `Invoice for completed job: ${job.title} (${job.jobNumber})`,
    });

    // Check if contractor has auto-send enabled
    const contractor = await db.contractorProfile.findUnique({
      where: { id: job.contractorId },
      select: { userId: true, autoSendInvoiceOnComplete: true },
    });

    if (contractor?.autoSendInvoiceOnComplete) {
      // Auto-finalize and send the invoice to the customer
      try {
        await ContractorInvoicingService.sendInvoice(invoice.id, { skipDraftCheck: true });

        if (contractor.userId) {
          await db.notification.create({
            data: {
              userId: contractor.userId,
              type: 'reminder',
              title: `Invoice auto-sent for ${job.title}`,
              message: `Invoice ${invoice.invoiceNumber} for $${Number(invoice.total).toFixed(2)} was automatically sent to ${job.customer.name}.`,
              actionUrl: `/contractor-dashboard/invoices/${invoice.id}`,
            },
          });
        }
      } catch (sendErr) {
        console.error('[autoInvoiceOnJobComplete] auto-send failed, invoice left as draft:', sendErr);
        // Fall back to notifying the contractor to send manually
        if (contractor.userId) {
          await db.notification.create({
            data: {
              userId: contractor.userId,
              type: 'reminder',
              title: `Invoice created for ${job.title} (send failed)`,
              message: `Invoice ${invoice.invoiceNumber} was created for $${Number(invoice.total).toFixed(2)} but couldn't be sent automatically. Please review and send it to ${job.customer.name}.`,
              actionUrl: `/contractor-dashboard/invoices/${invoice.id}`,
            },
          });
        }
      }
    } else {
      // Notify contractor to review and send manually
      if (contractor?.userId) {
        await db.notification.create({
          data: {
            userId: contractor.userId,
            type: 'reminder',
            title: `Invoice auto-created for ${job.title}`,
            message: `Invoice ${invoice.invoiceNumber} was created for $${Number(invoice.total).toFixed(2)}. Review and send it to ${job.customer.name}.`,
            actionUrl: `/contractor-dashboard/invoices/${invoice.id}`,
          },
        });
      }
    }
  } catch (err) {
    console.error('[autoInvoiceOnJobComplete]', err);
  }
}

// ── Daily Morning Briefing Email ──────────────────────────────────────────────
/**
 * Sends a daily 7am summary email to the contractor with:
 * - Today's jobs + crew assignments
 * - Unassigned jobs
 * - Low stock alerts
 * - Overdue invoices count
 *
 * Called by the cron job at /api/cron/daily-briefing
 */
export async function sendDailyBriefingEmail(contractorId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [profile, todayJobs, unassignedJobs, lowStock, overdueInvoices] = await Promise.all([
      db.contractorProfile.findUnique({
        where: { id: contractorId },
        select: { businessName: true, email: true, userId: true },
      }),
      db.contractorJob.findMany({
        where: {
          contractorId,
          status: { in: ['scheduled', 'in_progress', 'approved'] },
          estimatedStartDate: { gte: today, lt: tomorrow },
        },
        select: {
          id: true, title: true, jobNumber: true, status: true,
          address: true, city: true, state: true,
          estimatedStartDate: true, estimatedHours: true,
          assignedEmployeeIds: true,
          customer: { select: { name: true, phone: true } },
        },
        orderBy: { estimatedStartDate: 'asc' },
      }),
      db.contractorJob.count({
        where: {
          contractorId,
          status: { in: ['scheduled', 'approved'] },
          assignedEmployeeIds: { equals: [] },
        },
      }),
      db.contractorInventoryItem.count({
        where: {
          contractorId,
          reorderPoint: { not: null },
        },
      }),
      db.contractorInvoice.count({
        where: {
          contractorId,
          status: { in: ['sent', 'viewed', 'partial'] },
          dueDate: { lt: today },
        },
      }),
    ]);

    if (!profile?.email) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propertyflowhq.com';
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const jobRows = todayJobs.map((j: any) => {
      const addr = [j.address, j.city, j.state].filter(Boolean).join(', ');
      const time = j.estimatedStartDate
        ? new Date(j.estimatedStartDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      const crew = j.assignedEmployeeIds?.length > 0 ? `${j.assignedEmployeeIds.length} crew` : '⚠ No crew';
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
          <strong>${j.title}</strong><br>
          <span style="color:#6b7280;font-size:12px;">${j.jobNumber} · ${time}${addr ? ` · ${addr}` : ''}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${j.assignedEmployeeIds?.length > 0 ? '#059669' : '#dc2626'};font-size:13px;">${crew}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
          ${j.customer?.name ? `<a href="tel:${j.customer.phone}" style="color:#2563eb;">${j.customer.name}</a>` : '—'}
        </td>
      </tr>`;
    }).join('');

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `${profile.businessName || 'PropertyFlowHQ'} <${process.env.SENDER_EMAIL || 'onboarding@resend.dev'}>`,
      to: profile.email,
      subject: `📋 Daily Briefing — ${dateStr}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;">Good Morning, ${profile.businessName || 'Team'}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">${dateStr}</p>
          </div>

          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">

            <!-- Summary pills -->
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;text-align:center;min-width:80px;">
                <div style="font-size:24px;font-weight:bold;color:#1d4ed8;">${todayJobs.length}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Jobs Today</div>
              </div>
              <div style="background:${unassignedJobs > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${unassignedJobs > 0 ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:12px 16px;text-align:center;min-width:80px;">
                <div style="font-size:24px;font-weight:bold;color:${unassignedJobs > 0 ? '#dc2626' : '#16a34a'};">${unassignedJobs}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Unassigned</div>
              </div>
              <div style="background:${lowStock > 0 ? '#fffbeb' : '#f0fdf4'};border:1px solid ${lowStock > 0 ? '#fde68a' : '#bbf7d0'};border-radius:8px;padding:12px 16px;text-align:center;min-width:80px;">
                <div style="font-size:24px;font-weight:bold;color:${lowStock > 0 ? '#d97706' : '#16a34a'};">${lowStock}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Low Stock</div>
              </div>
              <div style="background:${overdueInvoices > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${overdueInvoices > 0 ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:12px 16px;text-align:center;min-width:80px;">
                <div style="font-size:24px;font-weight:bold;color:${overdueInvoices > 0 ? '#dc2626' : '#16a34a'};">${overdueInvoices}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Overdue Invoices</div>
              </div>
            </div>

            <!-- Today's jobs table -->
            ${todayJobs.length > 0 ? `
              <h3 style="margin:0 0 12px;font-size:15px;color:#111;">Today's Jobs</h3>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Job</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Crew</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Client</th>
                  </tr>
                </thead>
                <tbody>${jobRows}</tbody>
              </table>
            ` : `<p style="color:#6b7280;font-size:14px;margin-bottom:24px;">No jobs scheduled for today.</p>`}

            <!-- CTA -->
            <div style="text-align:center;margin-top:8px;">
              <a href="${appUrl}/contractor-dashboard/dispatch"
                style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#f97316);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Open Morning Briefing →
              </a>
            </div>

          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:12px;">
            ${profile.businessName} · Sent by PropertyFlowHQ ·
            <a href="${appUrl}/contractor-dashboard/settings/account" style="color:#9ca3af;">Manage email preferences</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[sendDailyBriefingEmail]', err);
  }
}

// ── Overdue Invoice Reminder Sweep ────────────────────────────────────────────
/**
 * Scans all sent/viewed invoices past their due date and sends reminders.
 * Called by the daily cron job. Respects a 7-day cooldown between reminders
 * (tracked via lastReminderAt on the invoice).
 */
export async function sweepOverdueInvoiceReminders() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const overdueInvoices = await db.contractorInvoice.findMany({
      where: {
        status: { in: ['sent', 'viewed', 'partial'] },
        dueDate: { lt: now },
        OR: [
          { lastReminderAt: null },
          { lastReminderAt: { lt: sevenDaysAgo } },
        ],
      },
      select: { id: true, invoiceNumber: true, contractorId: true },
      take: 50, // Process in batches
    });

    let sent = 0;
    for (const invoice of overdueInvoices) {
      try {
        const { ContractorInvoicingService } = await import('./contractor-invoicing');
        await ContractorInvoicingService.sendReminder(invoice.id);

        // Update lastReminderAt
        await db.contractorInvoice.update({
          where: { id: invoice.id },
          data: { lastReminderAt: now },
        });
        sent++;
      } catch (err) {
        console.error(`[sweepOverdueInvoiceReminders] Failed for ${invoice.invoiceNumber}:`, err);
      }
    }

    return { processed: overdueInvoices.length, sent };
  } catch (err) {
    console.error('[sweepOverdueInvoiceReminders]', err);
    return { processed: 0, sent: 0 };
  }
}

// ── Auto-Create Contract on Job Creation ─────────────────────────────────────

/**
 * Creates a default contract automatically when a job is created.
 * Mirrors the PM-side pattern where leases auto-create on application approval.
 * The contract uses the hardcoded legal template, populated from contractor profile
 * and job data. A signing token is generated and the customer is emailed.
 */
export async function autoCreateContractForJob(jobId: string): Promise<{ contract: any; signingUrl: string } | null> {
  try {
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      include: {
        contractor: {
          include: { user: { select: { name: true, email: true } } },
        },
        customer: true,
      },
    });

    if (!job) {
      console.warn('[autoCreateContractForJob] Job not found:', jobId);
      return null;
    }

    // Don't create if job already has a contract
    const existingContracts = await db.contractorContract.findMany({
      where: { jobId: job.id },
      take: 1,
    });
    if (existingContracts.length > 0) {
      return null;
    }

    const contractor = job.contractor;
    const customer = job.customer;

    // Generate contract number
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const contractNumber = `CTR-${year}-${rand}`;

    // Generate tokens
    const customerToken = require('crypto').randomBytes(32).toString('hex');
    const contractorToken = require('crypto').randomBytes(32).toString('hex');

    // Build contract data from job + contractor + customer
    const jobAddress = [job.address, job.city, job.state, job.zipCode].filter(Boolean).join(', ') || '';
    const contractorAddress = [contractor.baseCity, contractor.baseState].filter(Boolean).join(', ') || '';
    const customerAddress = customer
      ? [customer.address, customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ')
      : '';

    const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Import and generate the default template
    const { generateDefaultContractHtml } = await import('./contractor-default-template');
    const html = generateDefaultContractHtml({
      contractorName: contractor.businessName || contractor.user?.name || 'Contractor',
      contractorLicense: contractor.licenseNumber || undefined,
      contractorAddress,
      contractorState: contractor.baseState || undefined,
      customerName: customer?.name || job.title || 'Customer',
      customerAddress,
      jobTitle: job.title,
      jobDescription: job.description || job.title,
      jobAddress,
      jobCity: job.city || undefined,
      jobState: job.state || undefined,
      jobZip: job.zipCode || undefined,
      contractAmount: Number(job.estimatedCost || 0),
      depositAmount: undefined,
      paymentSchedule: 'Payment due upon completion of work unless otherwise agreed in writing',
      startDate: job.estimatedStartDate ? new Date(job.estimatedStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      completionDate: job.estimatedEndDate ? new Date(job.estimatedEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
      contractNumber,
      effectiveDate,
      expiryDate,
      warrantyPeriod: 'one (1) year',
      governingState: contractor.baseState || 'Texas',
      arbitrationCity: job.city || contractor.baseCity || undefined,
      permitCostsIncluded: true,
    });

    // Create contract record
    const contract = await db.contractorContract.create({
      data: {
        contractorId: contractor.id,
        jobId: job.id,
        contractNumber,
        title: job.title,
        type: 'service_agreement',
        body: html,
        customerName: customer?.name || job.title || 'Customer',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phoneNumber || null,
        contractorName: contractor.businessName || contractor.user?.name || 'Contractor',
        contractorEmail: contractor.email || contractor.user?.email || '',
        contractorPhone: contractor.phone || null,
        contractAmount: job.estimatedCost || null,
        paymentTerms: 'Payment due upon completion of work unless otherwise agreed in writing',
        token: customerToken,
        contractorToken,
        contractorTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'draft',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Log audit event
    await db.contractorContractEvent.create({
      data: {
        contractId: contract.id,
        eventType: 'created',
        actor: 'system',
        note: `Auto-created for job ${job.jobNumber}`,
      },
    });

    // Build signing URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propertyflowhq.com';
    const signingUrl = `${appUrl}/sign/contractor/${customerToken}`;

    return { contract, signingUrl };
  } catch (err) {
    console.error('[autoCreateContractForJob] Failed:', err);
    return null;
  }
}

/**
 * Auto-sends the contract for customer signing.
 * Called after autoCreateContractForJob or manually by the contractor.
 */
export async function autoSendContractForSigning(contractId: string): Promise<string | null> {
  try {
    const contract = await db.contractorContract.findUnique({
      where: { id: contractId },
      include: {
        contractor: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    if (!contract || contract.status !== 'draft') return null;

    // Update status to sent
    await db.contractorContract.update({
      where: { id: contractId },
      data: { status: 'sent', sentAt: new Date() },
    });

    // Log audit event
    await db.contractorContractEvent.create({
      data: {
        contractId: contract.id,
        eventType: 'sent',
        actor: 'contractor',
        actorName: contract.contractorName,
        note: 'Contract sent for customer signing',
      },
    });

    // Build signing URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://propertyflowhq.com';
    const signingUrl = `${appUrl}/sign/contractor/${contract.token}`;

    // Send email to customer
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const senderEmail = process.env.SENDER_EMAIL || 'noreply@propertyflowhq.com';

      await resend.emails.send({
        from: `PropertyFlowHQ <${senderEmail}>`,
        to: contract.customerEmail,
        subject: `Contract Ready to Sign: ${contract.title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0891b2, #2563eb); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Contract Ready for Signing</h1>
            </div>
            <div style="padding: 32px; background: #ffffff;">
              <p style="font-size: 16px; color: #374151;">Hi ${contract.customerName},</p>
              <p style="color: #6b7280;">
                <strong>${contract.contractorName}</strong> has prepared a service agreement for your review and signature.
              </p>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${contract.title}</p>
                <p style="margin: 0; color: #6b7280;">Contract: ${contract.contractNumber}</p>
                ${contract.contractAmount ? `<p style="margin: 4px 0 0; color: #6b7280;">Amount: <strong style="color: #059669;">$${Number(contract.contractAmount).toLocaleString()}</strong></p>` : ''}
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891b2, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                  Review & Sign Contract
                </a>
              </div>
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">This link expires in 30 days.</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[autoSendContractForSigning] Email failed (non-blocking):', emailErr);
    }

    return signingUrl;
  } catch (err) {
    console.error('[autoSendContractForSigning] Failed:', err);
    return null;
  }
}

// ── Invoice Paid → Auto-Generate Payroll for Job Crew ────────────────────────

/**
 * When a contractor's job invoice is paid by the customer, auto-create a
 * payroll run for the crew members who logged approved time on that job.
 *
 * This doesn't auto-withdraw money — it creates paycheck records in 'pending'
 * status so the contractor can review and approve the disbursement.
 *
 * Mirrors the PM-side flow: tenant pays rent → landlord wallet funded →
 * team payroll ready to process.
 */
export async function autoPayrollOnInvoicePaid(args: {
  invoiceId: string;
  contractorId: string;
  jobId: string;
  amountPaid: number;
}) {
  const { invoiceId, contractorId, jobId, amountPaid } = args;

  try {
    // 1. Fetch approved time entries for this job, grouped by employee
    const timeEntries = await db.contractorTimeEntry.findMany({
      where: {
        contractorId,
        jobId,
        status: 'approved',
        clockOut: { not: null },
        employeeId: { not: null },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            payRate: true,
            payType: true,
            employeeType: true,
          },
        },
      },
    });

    if (timeEntries.length === 0) return; // No employee time logged

    // 2. Group entries by employee and calculate pay
    const employeeMap = new Map<string, {
      employee: any;
      entries: typeof timeEntries;
      totalHours: number;
    }>();

    for (const entry of timeEntries) {
      if (!entry.employeeId || !entry.employee) continue;
      const existing = employeeMap.get(entry.employeeId) || {
        employee: entry.employee,
        entries: [],
        totalHours: 0,
      };

      const hours = entry.clockOut
        ? Math.max(0, (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3_600_000 - (entry.breakMinutes || 0) / 60)
        : 0;

      existing.entries.push(entry);
      existing.totalHours += hours;
      employeeMap.set(entry.employeeId, existing);
    }

    if (employeeMap.size === 0) return;

    // 3. Fetch the job for context
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      select: { title: true, jobNumber: true },
    });

    // 4. Create payroll run
    const now = new Date();
    const payroll = await db.contractorPayroll.create({
      data: {
        contractorId,
        periodStart: now,
        periodEnd: now,
        payDate: now,
        paySchedule: 'per_job',
        status: 'completed',
        runAt: now,
        runBy: null, // system-generated
        notes: `Auto-generated from paid invoice (${job?.jobNumber || jobId})`,
      },
    });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const [employeeId, data] of employeeMap) {
      const rate = Number(data.employee.payRate);
      let regularHours = data.totalHours;
      let overtimeHours = 0;

      // Standard OT: over 40h
      if (regularHours > 40) {
        overtimeHours = regularHours - 40;
        regularHours = 40;
      }

      const regularPay = regularHours * rate;
      const overtimeRate = rate * 1.5;
      const overtimePay = overtimeHours * overtimeRate;
      const grossPay = data.employee.payType === 'salary'
        ? rate // salary is per-period
        : regularPay + overtimePay;

      // Estimate deductions (skip for 1099)
      let deductionLines: Array<{ label: string; amount: number; type: string }> = [];
      if (data.employee.employeeType !== '1099' && grossPay > 0) {
        deductionLines = [
          { label: 'Federal Income Tax (est.)', amount: parseFloat((grossPay * 0.12).toFixed(2)), type: 'federal_tax' },
          { label: 'Social Security (6.2%)', amount: parseFloat((grossPay * 0.062).toFixed(2)), type: 'social_security' },
          { label: 'Medicare (1.45%)', amount: parseFloat((grossPay * 0.0145).toFixed(2)), type: 'medicare' },
        ];
      }

      const totalDed = deductionLines.reduce((s, d) => s + d.amount, 0);
      const netPay = grossPay - totalDed;

      totalGross += grossPay;
      totalDeductions += totalDed;
      totalNet += netPay;

      await db.contractorPaycheck.create({
        data: {
          payrollId: payroll.id,
          employeeId,
          contractorId,
          payType: data.employee.payType,
          regularHours,
          overtimeHours,
          payRate: rate,
          overtimeRate,
          ptoHours: 0,
          ptoPay: 0,
          regularPay,
          overtimePay,
          grossPay,
          deductions: deductionLines,
          totalDeductions: totalDed,
          netPay,
          timeEntryIds: data.entries.map((e: any) => e.id),
          status: 'pending',
          notes: `Job: ${job?.title || 'Unknown'} (${job?.jobNumber || ''})`,
        },
      });
    }

    // 5. Update payroll totals
    await db.contractorPayroll.update({
      where: { id: payroll.id },
      data: {
        totalGrossPay: totalGross,
        totalDeductions: totalDeductions,
        totalNetPay: totalNet,
        employeeCount: employeeMap.size,
      },
    });

    // 6. Notify the contractor
    const contractor = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (contractor?.userId) {
      await db.notification.create({
        data: {
          userId: contractor.userId,
          type: 'reminder',
          title: `Payroll ready — ${job?.title || 'Job'}`,
          message: `Invoice paid! Payroll for ${employeeMap.size} crew member${employeeMap.size > 1 ? 's' : ''} ($${totalNet.toFixed(2)} net) is ready to review and distribute.`,
          actionUrl: `/contractor-dashboard/payroll/${payroll.id}`,
        },
      });
    }
  } catch (err) {
    console.error('[autoPayrollOnInvoicePaid]', err);
  }
}

// ── Job Scheduled → Auto-Check Inventory → Auto-Create PO ───────────────────

/**
 * When a job transitions to 'scheduled', check all linked materials against
 * current inventory. If any items are short, auto-create a Purchase Order
 * grouped by vendor for the shortfall quantities.
 *
 * Only runs if the contractor has `autoCreatePoOnSchedule` enabled.
 *
 * Flow:
 * 1. Fetch ContractorJobMaterial records for the job
 * 2. Compare quantityNeeded vs current item.quantity in inventory
 * 3. Group shortages by vendor (using the item's vendorId)
 * 4. Create ContractorPurchaseOrder + line items per vendor
 * 5. Notify the contractor with shortage summary
 */
export async function autoCreatePurchaseOrdersOnSchedule(args: {
  jobId: string;
  contractorId: string;
}) {
  const { jobId, contractorId } = args;

  try {
    // Check if automation is enabled for this contractor
    const profile = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true, autoCreatePoOnSchedule: true },
    });

    if (!profile?.autoCreatePoOnSchedule) return;

    // Fetch job materials with inventory item and vendor info
    const jobMaterials = await db.contractorJobMaterial.findMany({
      where: { jobId, contractorId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
            unitCost: true,
            vendorId: true,
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (jobMaterials.length === 0) return;

    // Identify shortages
    const shortages: Array<{
      itemId: string;
      itemName: string;
      sku: string | null;
      unit: string;
      unitCost: number;
      shortfall: number;
      vendorId: string | null;
      vendorName: string | null;
    }> = [];

    for (const mat of jobMaterials) {
      const inStock = Number(mat.item.quantity);
      const needed = mat.quantityNeeded;
      if (inStock < needed) {
        shortages.push({
          itemId: mat.item.id,
          itemName: mat.item.name,
          sku: mat.item.sku,
          unit: mat.item.unit,
          unitCost: Number(mat.item.unitCost),
          shortfall: needed - inStock,
          vendorId: mat.item.vendorId,
          vendorName: mat.item.vendor?.name || null,
        });
      }
    }

    if (shortages.length === 0) return; // All materials in stock

    // Group shortages by vendor
    const byVendor = new Map<string | null, typeof shortages>();
    for (const s of shortages) {
      const key = s.vendorId;
      const group = byVendor.get(key) || [];
      group.push(s);
      byVendor.set(key, group);
    }

    // Fetch job info for PO notes
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      select: { title: true, jobNumber: true, address: true, city: true, state: true },
    });

    const createdPOs: string[] = [];

    // Create a PO for each vendor group
    for (const [vendorId, items] of byVendor) {
      // Generate PO number
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      let poNumber = `PO-${year}-${rand}`;
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.contractorPurchaseOrder.findUnique({ where: { poNumber } });
        if (!existing) break;
        poNumber = `PO-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
        attempts++;
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.shortfall * item.unitCost, 0);
      const tax = 0; // Can't estimate tax — contractor reviews before sending
      const total = subtotal + tax;

      const jobAddress = job
        ? [job.address, job.city, job.state].filter(Boolean).join(', ')
        : undefined;

      const po = await db.contractorPurchaseOrder.create({
        data: {
          contractorId,
          poNumber,
          status: 'draft',
          vendorId: vendorId || null,
          jobId,
          subtotal,
          tax,
          total,
          requiredDate: null, // Contractor sets this on review
          deliveryAddress: job?.address || null,
          deliveryCity: job?.city || null,
          deliveryState: job?.state || null,
          notes: `Auto-generated for job ${job?.jobNumber || ''}: ${job?.title || ''}`,
          internalNotes: `Material shortage detected when job was scheduled.${jobAddress ? ` Deliver to: ${jobAddress}` : ''}`,
        },
      });

      // Create line items
      for (const item of items) {
        await db.contractorPurchaseOrderItem.create({
          data: {
            poId: po.id,
            itemName: item.itemName,
            sku: item.sku || null,
            quantity: item.shortfall,
            unit: item.unit,
            unitPrice: item.unitCost,
            total: item.shortfall * item.unitCost,
            quantityOrdered: item.shortfall,
            inventoryItemId: item.itemId,
          },
        });
      }

      createdPOs.push(poNumber);
    }

    // Notify contractor
    if (profile.userId && createdPOs.length > 0) {
      const vendorCount = byVendor.size;
      const totalItems = shortages.length;
      await db.notification.create({
        data: {
          userId: profile.userId,
          type: 'alert',
          title: `📦 ${createdPOs.length} PO${createdPOs.length > 1 ? 's' : ''} auto-created for ${job?.title || 'job'}`,
          message: `${totalItems} material${totalItems > 1 ? 's' : ''} short for ${job?.jobNumber || 'the job'}. ${createdPOs.length} draft PO${createdPOs.length > 1 ? 's' : ''} created across ${vendorCount} vendor${vendorCount > 1 ? 's' : ''}. Review and send.`,
          actionUrl: `/contractor-dashboard/purchase-orders`,
        },
      });
    }
  } catch (err) {
    console.error('[autoCreatePurchaseOrdersOnSchedule]', err);
  }
}

// ── Materials Received → Job Readiness Check ────────────────────────────────

/**
 * When materials are received into inventory, check if any scheduled jobs
 * that require that item now have ALL their materials in stock.
 *
 * If a job becomes "materials-ready", notify the contractor and assigned crew.
 *
 * Flow:
 * 1. Find all ContractorJobMaterial records for the received item
 *    where the linked job is in 'scheduled' or 'approved' status
 * 2. For each such job, check if ALL its materials are now in stock
 * 3. If fully stocked, notify contractor + crew that job is ready to dispatch
 */
export async function checkJobReadinessOnReceive(args: {
  contractorId: string;
  itemId: string;
}) {
  const { contractorId, itemId } = args;

  try {
    // Find jobs that need this item and are in a "waiting" state
    const jobMaterials = await db.contractorJobMaterial.findMany({
      where: {
        contractorId,
        itemId,
        job: {
          status: { in: ['scheduled', 'approved'] },
        },
      },
      select: {
        jobId: true,
        job: { select: { id: true, title: true, jobNumber: true, assignedEmployeeIds: true } },
      },
    });

    if (jobMaterials.length === 0) return;

    // Deduplicate jobs (an item might appear once per job)
    const uniqueJobIds = [...new Set(jobMaterials.map((m) => m.jobId))];

    for (const jobId of uniqueJobIds) {
      // Fetch ALL materials for this job with current inventory levels
      const allJobMats = await db.contractorJobMaterial.findMany({
        where: { jobId, contractorId },
        include: {
          item: { select: { id: true, name: true, quantity: true } },
        },
      });

      // Check if every material is now in stock
      const allInStock = allJobMats.every(
        (mat: any) => Number(mat.item.quantity) >= mat.quantityNeeded
      );

      if (!allInStock) continue; // Still waiting on other materials

      // Job is materials-ready! Notify contractor
      const job = jobMaterials.find((m) => m.jobId === jobId)?.job;
      if (!job) continue;

      const profile = await db.contractorProfile.findUnique({
        where: { id: contractorId },
        select: { userId: true },
      });

      if (profile?.userId) {
        await db.notification.create({
          data: {
            userId: profile.userId,
            type: 'reminder',
            title: `✅ Materials ready — ${job.title}`,
            message: `All ${allJobMats.length} material(s) for ${job.jobNumber} are now in stock. Job is ready to dispatch.`,
            actionUrl: `/contractor-dashboard/jobs/${job.id}`,
          },
        });
      }

      // Notify assigned crew members
      const assignedIds: string[] = Array.isArray(job.assignedEmployeeIds)
        ? job.assignedEmployeeIds
        : [];

      if (assignedIds.length > 0) {
        const employees = await db.contractorEmployee.findMany({
          where: { id: { in: assignedIds }, contractorId },
          select: { userId: true, firstName: true },
        });

        for (const emp of employees) {
          if (!emp.userId) continue;
          await db.notification.create({
            data: {
              userId: emp.userId,
              type: 'reminder',
              title: `Materials ready for ${job.title}`,
              message: `All materials have arrived for ${job.jobNumber}. Ready to go!`,
              actionUrl: `/contractor-dashboard/jobs/${job.id}`,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[checkJobReadinessOnReceive]', err);
  }
}

// ── Shipment Delivered → Job Site Delivery Confirmation ──────────────────────

/**
 * When a shipment is marked 'delivered', check if it's linked to a job site
 * and notify the contractor + assigned crew that materials have arrived.
 *
 * Also triggers the same job readiness check as receiving (since delivered
 * materials to a job site mean they're available for the job).
 *
 * Flow:
 * 1. Fetch the shipment with its items
 * 2. If the shipment destination is a job, update inventory items for that job
 * 3. Notify contractor and crew that the shipment arrived
 * 4. Run the materials readiness check for the linked job
 */
export async function onShipmentDelivered(args: {
  shipmentId: string;
  contractorId: string;
}) {
  const { shipmentId, contractorId } = args;

  try {
    const shipment = await db.contractorShipment.findUnique({
      where: { id: shipmentId },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!shipment) return;

    // Notify contractor about delivery
    const profile = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    const itemSummary = shipment.items
      .slice(0, 3)
      .map((i: any) => `${i.item.name} (×${i.quantityShipped})`)
      .join(', ');
    const moreItems = shipment.items.length > 3 ? ` +${shipment.items.length - 3} more` : '';

    if (profile?.userId) {
      await db.notification.create({
        data: {
          userId: profile.userId,
          type: 'reminder',
          title: `📦 Shipment ${shipment.shipmentNumber} delivered`,
          message: `${itemSummary}${moreItems} delivered to ${shipment.destinationName || shipment.destinationAddress || 'destination'}.`,
          actionUrl: `/contractor-dashboard/shipping`,
        },
      });
    }

    // If shipped to a job site, notify crew and check readiness
    if (shipment.destinationType === 'job_site' && shipment.destinationId) {
      const jobId = shipment.destinationId;

      // Fetch the job to notify crew
      const job = await db.contractorJob.findUnique({
        where: { id: jobId },
        select: { id: true, title: true, jobNumber: true, assignedEmployeeIds: true },
      });

      if (job) {
        // Notify assigned crew
        const assignedIds: string[] = Array.isArray(job.assignedEmployeeIds)
          ? job.assignedEmployeeIds
          : [];

        if (assignedIds.length > 0) {
          const employees = await db.contractorEmployee.findMany({
            where: { id: { in: assignedIds }, contractorId },
            select: { userId: true, firstName: true },
          });

          for (const emp of employees) {
            if (!emp.userId) continue;
            await db.notification.create({
              data: {
                userId: emp.userId,
                type: 'reminder',
                title: `Materials arrived at job site`,
                message: `Shipment ${shipment.shipmentNumber} delivered for ${job.title} (${job.jobNumber}): ${itemSummary}${moreItems}`,
                actionUrl: `/contractor-dashboard/jobs/${job.id}`,
              },
            });
          }
        }

        // Run material readiness check for each delivered item
        for (const shipItem of shipment.items) {
          try {
            await checkJobReadinessOnReceive({
              contractorId,
              itemId: shipItem.item.id,
            });
          } catch (err) {
            // Non-blocking per-item
          }
        }
      }
    }
  } catch (err) {
    console.error('[onShipmentDelivered]', err);
  }
}

// ── Auto-Assign Crew Based on Skills + Availability ──────────────────────────

/**
 * When a job is scheduled with no crew assigned, auto-suggest or auto-assign
 * the best available employees based on their skills, availability, and
 * current workload.
 *
 * Only runs if the contractor has `autoAssignCrew` enabled.
 *
 * Scoring logic:
 * - +10 points per matching skill (job.jobType matches employee.skills)
 * - +5 points for being a Lead Technician
 * - -20 points if employee has a conflicting shift on the same date
 * - +3 points per star of avgRating
 *
 * If the job has `estimatedHours` and we need multiple people, we assign
 * up to ceil(estimatedHours / 8) employees (1 employee per 8-hour workday).
 */
export async function autoAssignCrewToJob(args: {
  jobId: string;
  contractorId: string;
}) {
  const { jobId, contractorId } = args;

  try {
    // Check if automation is enabled
    const profile = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true, autoAssignCrew: true },
    });

    if (!profile?.autoAssignCrew) return;

    // Fetch the job
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        jobType: true,
        status: true,
        estimatedStartDate: true,
        estimatedHours: true,
        assignedEmployeeIds: true,
      },
    });

    if (!job) return;

    // Skip if crew is already assigned
    const currentAssigned: string[] = Array.isArray(job.assignedEmployeeIds)
      ? job.assignedEmployeeIds
      : [];
    if (currentAssigned.length > 0) return;

    // Determine how many crew members we need
    const crewNeeded = job.estimatedHours
      ? Math.max(1, Math.ceil(Number(job.estimatedHours) / 8))
      : 1;

    // Fetch all active employees
    const employees = await db.contractorEmployee.findMany({
      where: {
        contractorId,
        status: 'active',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
        role: true,
        skills: true,
        avgRating: true,
      },
    });

    if (employees.length === 0) return;

    // Get conflicting shifts on the job's start date
    let conflictingEmployeeIds = new Set<string>();
    if (job.estimatedStartDate) {
      const jobDate = new Date(job.estimatedStartDate);
      const startOfDay = new Date(jobDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(jobDate);
      endOfDay.setHours(23, 59, 59, 999);

      const conflictingShifts = await db.contractorShift.findMany({
        where: {
          contractorId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'scheduled',
        },
        select: { employeeId: true },
      });

      conflictingEmployeeIds = new Set(conflictingShifts.map((s: any) => s.employeeId));
    }

    // Score employees
    const jobSkills = job.jobType
      ? job.jobType.toLowerCase().split(/[\s,/&]+/)
      : [];

    const scored = employees.map((emp: any) => {
      let score = 0;

      // Skill matching
      const empSkills = (emp.skills || []).map((s: string) => s.toLowerCase());
      for (const skill of jobSkills) {
        if (empSkills.some((es: string) => es.includes(skill) || skill.includes(es))) {
          score += 10;
        }
      }

      // Role bonus
      if (emp.role?.toLowerCase().includes('lead') || emp.role?.toLowerCase().includes('technician')) {
        score += 5;
      }

      // Rating bonus
      score += Number(emp.avgRating || 0) * 3;

      // Availability penalty
      if (conflictingEmployeeIds.has(emp.id)) {
        score -= 20;
      }

      return { ...emp, score };
    });

    // Sort by score descending, take top N
    scored.sort((a: any, b: any) => b.score - a.score);
    const assigned = scored.slice(0, crewNeeded).filter((e: any) => e.score > 0);

    if (assigned.length === 0) return; // No suitable employees

    const assignedIds = assigned.map((e: any) => e.id);

    // Update job with assigned employees
    await db.contractorJob.update({
      where: { id: jobId },
      data: {
        assignedEmployeeIds: assignedIds,
      },
    });

    // Create job assignments for tracking
    for (const emp of assigned) {
      try {
        await db.contractorJobAssignment.create({
          data: {
            contractorId,
            jobId,
            employeeId: emp.id,
            role: emp.role || 'crew',
            assignedAt: new Date(),
          },
        });
      } catch {
        // Might already exist — skip
      }
    }

    // Notify contractor
    const names = assigned.map((e: any) => `${e.firstName} ${e.lastName}`).join(', ');
    if (profile.userId) {
      await db.notification.create({
        data: {
          userId: profile.userId,
          type: 'reminder',
          title: `🧑‍🔧 Crew auto-assigned to ${job.title}`,
          message: `${assigned.length} team member${assigned.length > 1 ? 's' : ''} assigned: ${names}. Based on skills & availability.`,
          actionUrl: `/contractor-dashboard/jobs/${job.id}`,
        },
      });
    }

    // Notify assigned employees
    for (const emp of assigned) {
      if (!emp.userId) continue;
      await db.notification.create({
        data: {
          userId: emp.userId,
          type: 'reminder',
          title: `You've been assigned to ${job.title}`,
          message: `Job ${job.jobNumber}${job.estimatedStartDate ? ` — starts ${new Date(job.estimatedStartDate).toLocaleDateString()}` : ''}`,
          actionUrl: `/contractor-dashboard/jobs/${job.id}`,
        },
      });
    }
  } catch (err) {
    console.error('[autoAssignCrewToJob]', err);
  }
}

// ── Auto-Generate Timesheets at Pay Period Close ─────────────────────────────

/**
 * At the end of a pay period, aggregate all approved time entries for each
 * employee into a draft timesheet summary. Called by a cron job (e.g., daily
 * at midnight) that checks if any pay periods closed today.
 *
 * For each contractor with active employees:
 * 1. Determine the pay schedule (weekly, biweekly, monthly)
 * 2. Check if today is the end of a pay period
 * 3. Aggregate approved time entries for each employee in that period
 * 4. Create a summary notification so the contractor can review and run payroll
 *
 * This doesn't auto-run payroll — it surfaces a "timesheets ready" notification
 * so the contractor knows it's time to review and approve.
 */
export async function autoGenerateTimesheetSummaries() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  try {
    // Find all contractors with active employees that have a pay schedule set
    const contractors = await db.contractorProfile.findMany({
      where: {
        employees: {
          some: { status: 'active' },
        },
      },
      select: {
        id: true,
        userId: true,
        businessName: true,
      },
    });

    let processed = 0;
    let notified = 0;

    for (const contractor of contractors) {
      // Get the contractor's employees grouped by pay schedule
      const employees = await db.contractorEmployee.findMany({
        where: {
          contractorId: contractor.id,
          status: 'active',
          paySchedule: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          paySchedule: true,
          payRate: true,
          payType: true,
        },
      });

      if (employees.length === 0) continue;

      // Group employees by pay schedule
      const scheduleGroups = new Map<string, typeof employees>();
      for (const emp of employees) {
        const schedule = emp.paySchedule || 'biweekly';
        const group = scheduleGroups.get(schedule) || [];
        group.push(emp);
        scheduleGroups.set(schedule, group);
      }

      for (const [schedule, groupEmployees] of scheduleGroups) {
        // Determine if today is the end of a pay period for this schedule
        const periodEnd = getPayPeriodEnd(schedule, today);
        if (!periodEnd) continue; // Not the end of a period today

        const periodStart = getPayPeriodStart(schedule, periodEnd);

        // Check if we already generated a summary for this period
        const existingPayroll = await db.contractorPayroll.findFirst({
          where: {
            contractorId: contractor.id,
            periodStart: { gte: periodStart },
            periodEnd: { lte: new Date(periodEnd.getTime() + 86400000) }, // +1 day buffer
          },
        });

        if (existingPayroll) continue; // Already processed

        // Aggregate time entries for these employees in this period
        const employeeIds = groupEmployees.map((e) => e.id);
        const timeEntries = await db.contractorTimeEntry.findMany({
          where: {
            contractorId: contractor.id,
            employeeId: { in: employeeIds },
            clockIn: { gte: periodStart },
            clockOut: { lte: periodEnd, not: null },
            status: 'approved',
          },
          select: {
            employeeId: true,
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
          },
        });

        if (timeEntries.length === 0) continue; // No time logged

        // Calculate totals per employee
        const employeeTotals = new Map<string, { hours: number; name: string }>();
        for (const entry of timeEntries) {
          if (!entry.employeeId || !entry.clockOut) continue;
          const hours = Math.max(
            0,
            (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3_600_000 -
              (entry.breakMinutes || 0) / 60
          );
          const existing = employeeTotals.get(entry.employeeId) || { hours: 0, name: '' };
          existing.hours += hours;
          employeeTotals.set(entry.employeeId, existing);
        }

        // Fill in names
        for (const emp of groupEmployees) {
          const totals = employeeTotals.get(emp.id);
          if (totals) {
            totals.name = `${emp.firstName} ${emp.lastName}`;
          }
        }

        const totalHours = [...employeeTotals.values()].reduce((sum, e) => sum + e.hours, 0);
        const employeesWithHours = employeeTotals.size;

        // Notify contractor that timesheets are ready for review
        if (contractor.userId && employeesWithHours > 0) {
          const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

          await db.notification.create({
            data: {
              userId: contractor.userId,
              type: 'reminder',
              title: `📋 Timesheets ready for review (${schedule})`,
              message: `${employeesWithHours} employee${employeesWithHours > 1 ? 's' : ''} logged ${totalHours.toFixed(1)} hours for ${periodLabel}. Ready to review and run payroll.`,
              actionUrl: `/contractor-dashboard/payroll?periodStart=${periodStart.toISOString().split('T')[0]}&periodEnd=${periodEnd.toISOString().split('T')[0]}`,
            },
          });
          notified++;
        }

        processed++;
      }
    }

    return { processed, notified };
  } catch (err) {
    console.error('[autoGenerateTimesheetSummaries]', err);
    return { processed: 0, notified: 0, error: String(err) };
  }
}

/**
 * Determine if today is the end of a pay period for the given schedule.
 * Returns the period end date if today is a period boundary, null otherwise.
 */
function getPayPeriodEnd(schedule: string, today: Date): Date | null {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = today.getDate();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  switch (schedule) {
    case 'weekly':
      // Period ends every Sunday
      if (dayOfWeek === 0) return today;
      return null;

    case 'biweekly':
      // Period ends every other Sunday — use epoch-based week counting
      const epochWeek = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (dayOfWeek === 0 && epochWeek % 2 === 0) return today;
      return null;

    case 'semimonthly':
      // Period ends on the 15th and last day of month
      if (dayOfMonth === 15 || dayOfMonth === lastDayOfMonth) return today;
      return null;

    case 'monthly':
      // Period ends on the last day of month
      if (dayOfMonth === lastDayOfMonth) return today;
      return null;

    default:
      // Default to biweekly
      const defEpochWeek = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (dayOfWeek === 0 && defEpochWeek % 2 === 0) return today;
      return null;
  }
}

/**
 * Calculate the start of a pay period given its end date and schedule.
 */
function getPayPeriodStart(schedule: string, periodEnd: Date): Date {
  const start = new Date(periodEnd);

  switch (schedule) {
    case 'weekly':
      start.setDate(start.getDate() - 6); // Mon-Sun
      break;

    case 'biweekly':
      start.setDate(start.getDate() - 13); // 14 days
      break;

    case 'semimonthly':
      if (periodEnd.getDate() === 15) {
        start.setDate(1); // 1st through 15th
      } else {
        start.setDate(16); // 16th through end of month
      }
      break;

    case 'monthly':
      start.setDate(1); // 1st through last day
      break;

    default:
      start.setDate(start.getDate() - 13); // biweekly default
      break;
  }

  return start;
}

// ── Payroll Auto-Run on Timesheet Approval (with admin confirmation gate) ────

/**
 * When all timesheets for a pay period are approved, auto-queue a payroll
 * run and send a confirmation notification to the contractor. The payroll
 * is created in 'pending_approval' status — the contractor must click
 * "Confirm & Run Payroll" to actually process payments.
 *
 * This bridges the gap between "all timesheets approved" and "someone
 * remembers to run payroll" without removing human oversight on the
 * actual money movement.
 *
 * Called when a timesheet/time-entry batch is approved. It checks whether
 * ALL employees for that period now have approved entries, and if so,
 * pre-calculates the payroll and queues it for one-click confirmation.
 */
export async function autoQueuePayrollOnAllApproved(args: {
  contractorId: string;
  periodStart: Date;
  periodEnd: Date;
  paySchedule: string;
}) {
  const { contractorId, periodStart, periodEnd, paySchedule } = args;

  try {
    // Check if a payroll already exists for this period
    const existingPayroll = await db.contractorPayroll.findFirst({
      where: {
        contractorId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: new Date(periodEnd.getTime() + 86400000) },
      },
    });

    if (existingPayroll) return; // Already queued or processed

    // Fetch active employees on this pay schedule
    const employees = await db.contractorEmployee.findMany({
      where: {
        contractorId,
        status: 'active',
        paySchedule: paySchedule || undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        payRate: true,
        payType: true,
        employeeType: true,
      },
    });

    if (employees.length === 0) return;

    // Fetch all time entries in this period
    const timeEntries = await db.contractorTimeEntry.findMany({
      where: {
        contractorId,
        employeeId: { in: employees.map((e: any) => e.id) },
        clockIn: { gte: periodStart },
        clockOut: { lte: periodEnd, not: null },
        status: 'approved',
      },
      select: {
        id: true,
        employeeId: true,
        clockIn: true,
        clockOut: true,
        breakMinutes: true,
      },
    });

    if (timeEntries.length === 0) return;

    // Check if there are any unapproved entries still pending
    const pendingEntries = await db.contractorTimeEntry.count({
      where: {
        contractorId,
        employeeId: { in: employees.map((e: any) => e.id) },
        clockIn: { gte: periodStart },
        clockOut: { lte: periodEnd, not: null },
        status: 'pending',
      },
    });

    if (pendingEntries > 0) return; // Not all entries approved yet

    // All entries for this period are approved — pre-calculate payroll
    const employeeCalcs: Array<{
      employeeId: string;
      firstName: string;
      lastName: string;
      regularHours: number;
      overtimeHours: number;
      payRate: number;
      payType: string;
      employeeType: string;
      grossPay: number;
      deductions: number;
      netPay: number;
      entryIds: string[];
    }> = [];

    // Group entries by employee
    const entriesByEmployee = new Map<string, typeof timeEntries>();
    for (const entry of timeEntries) {
      if (!entry.employeeId) continue;
      const group = entriesByEmployee.get(entry.employeeId) || [];
      group.push(entry);
      entriesByEmployee.set(entry.employeeId, group);
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const emp of employees) {
      const empEntries = entriesByEmployee.get(emp.id);
      if (!empEntries || empEntries.length === 0) continue;

      const rate = Number(emp.payRate);
      let totalHours = 0;
      const entryIds: string[] = [];

      for (const entry of empEntries) {
        if (!entry.clockOut) continue;
        const hours = Math.max(
          0,
          (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3_600_000 -
            (entry.breakMinutes || 0) / 60
        );
        totalHours += hours;
        entryIds.push(entry.id);
      }

      let regularHours = totalHours;
      let overtimeHours = 0;
      if (regularHours > 40) {
        overtimeHours = regularHours - 40;
        regularHours = 40;
      }

      const regularPay = regularHours * rate;
      const overtimePay = overtimeHours * (rate * 1.5);
      const grossPay = emp.payType === 'salary' ? rate : regularPay + overtimePay;

      // Estimate deductions (skip 1099)
      let dedAmount = 0;
      if (emp.employeeType !== '1099' && grossPay > 0) {
        dedAmount = parseFloat((grossPay * 0.12).toFixed(2)) + // federal
          parseFloat((grossPay * 0.062).toFixed(2)) + // SS
          parseFloat((grossPay * 0.0145).toFixed(2)); // Medicare
      }

      const netPay = grossPay - dedAmount;

      totalGross += grossPay;
      totalDeductions += dedAmount;
      totalNet += netPay;

      employeeCalcs.push({
        employeeId: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        regularHours,
        overtimeHours,
        payRate: rate,
        payType: emp.payType,
        employeeType: emp.employeeType,
        grossPay,
        deductions: dedAmount,
        netPay,
        entryIds,
      });
    }

    if (employeeCalcs.length === 0) return;

    // Create the payroll in 'pending_approval' status — requires contractor confirmation
    const payDate = new Date(periodEnd);
    payDate.setDate(payDate.getDate() + 3); // Default: pay 3 days after period end

    const payroll = await db.contractorPayroll.create({
      data: {
        contractorId,
        periodStart,
        periodEnd,
        payDate,
        paySchedule,
        status: 'pending_approval', // <-- Key: NOT 'completed' — needs admin click
        totalGrossPay: totalGross,
        totalDeductions,
        totalNetPay: totalNet,
        employeeCount: employeeCalcs.length,
        notes: `Auto-generated. ${employeeCalcs.length} employees, ${timeEntries.length} time entries. Awaiting your confirmation to process.`,
      },
    });

    // Create paychecks in 'pending' status
    for (const calc of employeeCalcs) {
      const deductionLines = calc.employeeType !== '1099' && calc.grossPay > 0
        ? [
            { label: 'Federal Income Tax (est.)', amount: parseFloat((calc.grossPay * 0.12).toFixed(2)), type: 'federal_tax' },
            { label: 'Social Security (6.2%)', amount: parseFloat((calc.grossPay * 0.062).toFixed(2)), type: 'social_security' },
            { label: 'Medicare (1.45%)', amount: parseFloat((calc.grossPay * 0.0145).toFixed(2)), type: 'medicare' },
          ]
        : [];

      await db.contractorPaycheck.create({
        data: {
          payrollId: payroll.id,
          employeeId: calc.employeeId,
          contractorId,
          payType: calc.payType,
          regularHours: calc.regularHours,
          overtimeHours: calc.overtimeHours,
          payRate: calc.payRate,
          overtimeRate: calc.payRate * 1.5,
          ptoHours: 0,
          ptoPay: 0,
          regularPay: calc.regularHours * calc.payRate,
          overtimePay: calc.overtimeHours * calc.payRate * 1.5,
          grossPay: calc.grossPay,
          deductions: deductionLines,
          totalDeductions: calc.deductions,
          netPay: calc.netPay,
          timeEntryIds: calc.entryIds,
          status: 'pending',
        },
      });
    }

    // Notify contractor — one-click confirmation gate
    const profile = await db.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (profile?.userId) {
      const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      await db.notification.create({
        data: {
          userId: profile.userId,
          type: 'alert',
          title: `💰 Payroll ready to confirm (${periodLabel})`,
          message: `All timesheets approved. $${totalNet.toFixed(2)} net for ${employeeCalcs.length} employee${employeeCalcs.length > 1 ? 's' : ''}. Review and confirm to process payments.`,
          actionUrl: `/contractor-dashboard/payroll/${payroll.id}`,
        },
      });
    }
  } catch (err) {
    console.error('[autoQueuePayrollOnAllApproved]', err);
  }
}
