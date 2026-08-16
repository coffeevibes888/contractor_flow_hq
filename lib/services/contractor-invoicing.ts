import { prisma } from '@/db/prisma';
import { Prisma } from '@prisma/client';
import { htmlToPdfBuffer } from './pdf';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'material' | 'other';
}

export interface InvoiceData {
  contractorId: string;
  customerId: string;
  jobId?: string;
  appointmentId?: string;
  lineItems: LineItem[];
  taxRate?: number;
  notes?: string;
  terms?: string;
  dueDate: Date;
  depositPaid?: number;
}

export interface PaymentData {
  amount: number;
  method: 'card' | 'bank' | 'cash' | 'check';
  stripePaymentId?: string;
  notes?: string;
}

export class ContractorInvoicingService {
  /**
   * Generate a unique invoice number
   * Format: INV-YYYYMMDD-XXXXX
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of invoices created today to ensure uniqueness
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await prisma.contractorInvoice.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    
    const sequence = (count + 1).toString().padStart(5, '0');
    return `INV-${dateStr}-${sequence}`;
  }

  /**
   * Calculate invoice totals from line items
   */
  private static calculateTotals(lineItems: LineItem[], taxRate: number = 0, depositPaid: number = 0) {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const amountDue = total - depositPaid;
    
    return {
      subtotal,
      taxAmount,
      total,
      amountDue,
    };
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(data: InvoiceData) {
    const invoiceNumber = await this.generateInvoiceNumber();
    const { subtotal, taxAmount, total, amountDue } = this.calculateTotals(
      data.lineItems,
      data.taxRate || 0,
      data.depositPaid || 0
    );

    // Generate payment token for public payment link
    const paymentToken = crypto.randomBytes(32).toString('hex');
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const paymentLink = `${protocol}://${rootDomain}/pay/invoice/${paymentToken}`;

    const invoice = await prisma.contractorInvoice.create({
      data: {
        invoiceNumber,
        contractorId: data.contractorId,
        customerId: data.customerId,
        jobId: data.jobId,
        appointmentId: data.appointmentId,
        lineItems: data.lineItems as unknown as Prisma.InputJsonValue[],
        subtotal,
        taxRate: data.taxRate || 0,
        taxAmount,
        total,
        depositPaid: data.depositPaid || 0,
        amountPaid: 0,
        amountDue,
        status: 'draft',
        dueDate: data.dueDate,
        notes: data.notes,
        terms: data.terms,
        paymentLink,
      },
      include: {
        contractor: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            logoUrl: true,
          },
        },
        payments: true,
      },
    });

    return invoice;
  }

  /**
   * Send invoice to customer via email
   */
  static async sendInvoice(invoiceId: string) {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        contractor: {
          select: {
            businessName: true,
            email: true,
            phone: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'draft') {
      throw new Error('Cannot send draft invoice. Please finalize it first.');
    }

    // Get customer email
    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: invoice.customerId },
      select: { email: true, name: true },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Generate invoice HTML for email
    const invoiceHtml = this.generateInvoiceHtml(invoice);

    // Send email with invoice
    const { data: emailData, error } = await resend.emails.send({
      from: `${invoice.contractor.businessName} <${process.env.SENDER_EMAIL || 'onboarding@resend.dev'}>`,
      to: customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.contractor.businessName}`,
      html: invoiceHtml,
      replyTo: invoice.contractor.email || undefined,
    });

    if (error) {
      console.error('Failed to send invoice email:', error);
      throw new Error('Failed to send invoice email');
    }

    // Update invoice status
    await prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: emailData?.id };
  }

  /**
   * Record a payment on an invoice
   */
  static async recordPayment(invoiceId: string, payment: PaymentData) {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Calculate new amounts
    const newAmountPaid = Number(invoice.amountPaid) + payment.amount;
    const newAmountDue = Number(invoice.total) - newAmountPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    // Create payment record and update invoice
    const result = await prisma.$transaction([
      prisma.contractorInvoicePayment.create({
        data: {
          invoiceId,
          amount: payment.amount,
          method: payment.method,
          stripePaymentId: payment.stripePaymentId,
          notes: payment.notes,
        },
      }),
      prisma.contractorInvoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : invoice.paidAt,
        },
        include: {
          contractor: true,
          payments: true,
        },
      }),
    ]);

    return result[1]; // Return updated invoice
  }

  /**
   * Generate PDF for an invoice
   */
  static async generatePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        contractor: {
          select: {
            businessName: true,
            email: true,
            phone: true,
            logoUrl: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get customer info
    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: invoice.customerId },
      select: { name: true, email: true, phone: true, address: true },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const html = this.generateInvoiceHtml(invoice, customer);
    return htmlToPdfBuffer(html);
  }

  /**
   * Generate HTML for invoice (used for both email and PDF)
   */
  private static generateInvoiceHtml(invoice: any, customer?: any): string {
    const lineItems = invoice.lineItems as LineItem[];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .logo {
            max-width: 200px;
            max-height: 80px;
          }
          .invoice-title {
            font-size: 32px;
            font-weight: bold;
            text-align: right;
          }
          .invoice-number {
            font-size: 14px;
            color: #666;
            text-align: right;
          }
          .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .address-block {
            flex: 1;
          }
          .address-block h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 10px;
          }
          .address-block p {
            margin: 5px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          .text-right {
            text-align: right;
          }
          .totals {
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .totals-row.total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 12px;
            margin-top: 8px;
          }
          .notes {
            margin-top: 40px;
            padding: 20px;
            background-color: #f9f9f9;
            border-left: 4px solid #000;
          }
          .notes h3 {
            margin-top: 0;
          }
          .payment-link {
            margin-top: 30px;
            padding: 20px;
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            text-align: center;
          }
          .payment-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0ea5e9;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 10px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-paid { background-color: #dcfce7; color: #166534; }
          .status-partial { background-color: #fef3c7; color: #92400e; }
          .status-sent { background-color: #dbeafe; color: #1e40af; }
          .status-overdue { background-color: #fee2e2; color: #991b1b; }
          .status-draft { background-color: #f3f4f6; color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${invoice.contractor.logoUrl ? `<img src="${invoice.contractor.logoUrl}" alt="Logo" class="logo">` : ''}
            <h2>${invoice.contractor.businessName}</h2>
            ${invoice.contractor.email ? `<p>${invoice.contractor.email}</p>` : ''}
            ${invoice.contractor.phone ? `<p>${invoice.contractor.phone}</p>` : ''}
          </div>
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div class="invoice-number">
              <span class="status-badge status-${invoice.status}">${invoice.status}</span>
            </div>
          </div>
        </div>

        <div class="addresses">
          <div class="address-block">
            <h3>Bill To:</h3>
            ${customer ? `
              <p><strong>${customer.name}</strong></p>
              ${customer.email ? `<p>${customer.email}</p>` : ''}
              ${customer.phone ? `<p>${customer.phone}</p>` : ''}
            ` : '<p>Customer information not available</p>'}
          </div>
          <div class="address-block">
            <h3>Invoice Details:</h3>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            ${invoice.jobId ? `<p><strong>Job ID:</strong> ${invoice.jobId}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.type}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${Number(invoice.taxRate) > 0 ? `
            <div class="totals-row">
              <span>Tax (${Number(invoice.taxRate).toFixed(2)}%):</span>
              <span>$${Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
          ` : ''}
          ${Number(invoice.depositPaid) > 0 ? `
            <div class="totals-row">
              <span>Deposit Paid:</span>
              <span>-$${Number(invoice.depositPaid).toFixed(2)}</span>
            </div>
          ` : ''}
          ${Number(invoice.amountPaid) > 0 ? `
            <div class="totals-row">
              <span>Amount Paid:</span>
              <span>-$${Number(invoice.amountPaid).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>Amount Due:</span>
            <span>$${Number(invoice.amountDue).toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <h3>Notes</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        ${invoice.terms ? `
          <div class="notes">
            <h3>Terms & Conditions</h3>
            <p>${invoice.terms}</p>
          </div>
        ` : ''}

        ${invoice.status !== 'paid' && invoice.paymentLink ? `
          <div class="payment-link">
            <h3>Pay Online</h3>
            <p>Click the button below to pay this invoice securely online.</p>
            <a href="${invoice.paymentLink}" class="payment-button">Pay Now</a>
          </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  /**
   * Send reminder for overdue invoice
   */
  static async sendReminder(invoiceId: string) {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        contractor: {
          select: {
            businessName: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get customer email
    const customer = await prisma.contractorCustomer.findUnique({
      where: { id: invoice.customerId },
      select: { email: true, name: true },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const daysOverdue = Math.floor(
      (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send reminder email
    const { data: emailData, error } = await resend.emails.send({
      from: `${invoice.contractor.businessName} <${process.env.SENDER_EMAIL || 'onboarding@resend.dev'}>`,
      to: customer.email,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Dear ${customer.name},</p>
          <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
          <p><strong>Amount Due:</strong> $${Number(invoice.amountDue).toFixed(2)}</p>
          <p><strong>Original Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p>Please submit payment at your earliest convenience.</p>
          ${invoice.paymentLink ? `
            <p style="margin-top: 30px;">
              <a href="${invoice.paymentLink}" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px;">
                Pay Now
              </a>
            </p>
          ` : ''}
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            If you have already submitted payment, please disregard this notice.
          </p>
          <p>Thank you,<br>${invoice.contractor.businessName}</p>
        </div>
      `,
      replyTo: invoice.contractor.email || undefined,
    });

    if (error) {
      console.error('Failed to send reminder email:', error);
      throw new Error('Failed to send reminder email');
    }

    return { success: true, messageId: emailData?.id };
  }

  /**
   * Get invoice by ID with all relations
   */
  static async getInvoice(invoiceId: string) {
    return prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        contractor: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            baseCity: true,
            baseState: true,
            logoUrl: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get all invoices for a contractor
   */
  static async getInvoices(
    contractorId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    return prisma.contractorInvoice.findMany({
      where: {
        contractorId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && filters?.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update invoice
   */
  static async updateInvoice(
    invoiceId: string,
    data: Partial<InvoiceData>
  ) {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Can only update draft invoices');
    }

    // Recalculate totals if line items changed
    let updateData: any = {
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.terms !== undefined && { terms: data.terms }),
      ...(data.dueDate && { dueDate: data.dueDate }),
    };

    if (data.lineItems) {
      const { subtotal, taxAmount, total, amountDue } = this.calculateTotals(
        data.lineItems,
        data.taxRate || Number(invoice.taxRate),
        data.depositPaid || Number(invoice.depositPaid)
      );

      updateData = {
        ...updateData,
        lineItems: data.lineItems,
        subtotal,
        taxAmount,
        total,
        amountDue,
      };
    }

    return prisma.contractorInvoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        contractor: true,
        payments: true,
      },
    });
  }

  /**
   * Delete invoice (only drafts)
   */
  static async deleteInvoice(invoiceId: string) {
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Can only delete draft invoices');
    }

    return prisma.contractorInvoice.delete({
      where: { id: invoiceId },
    });
  }
}
