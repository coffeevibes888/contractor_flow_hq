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

    // Notify contractor that invoice was auto-created
    const contractor = await db.contractorProfile.findUnique({
      where: { id: job.contractorId },
      select: { userId: true },
    });

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
