// import { stripe } from '@/lib/stripe'; // Uncomment when Stripe is configured

interface CashPaymentOptions {
  tenantId: string;
  amount: number;
  propertyId: string;
  description: string;
}

interface CashPaymentPartner {
  id: string;
  name: string;
  fee: number;
  maxAmount: number;
  barcodePrefix: string;
}

// Temporary storage until migration runs
const cashPayments: any[] = [];

export class CashPaymentService {
  
  // Cash payment partners (you'd integrate with these APIs)
  private static partners: CashPaymentPartner[] = [
    {
      id: 'cash_retail',
      name: 'Cash Retail',
      fee: 0.88,
      maxAmount: 3000,
      barcodePrefix: 'RF'
    },
    {
      id: 'greendot',
      name: 'Green Dot',
      fee: 0.95,
      maxAmount: 2500,
      barcodePrefix: 'GD'
    },
    {
      id: 'moneygram',
      name: 'MoneyGram',
      fee: 1.50,
      maxAmount: 2000,
      barcodePrefix: 'MG'
    }
  ];

  // Generate cash payment barcode using Stripe + Custom
  static async generateCashPayment(options: CashPaymentOptions, partnerId: string) {
    const partner = this.partners.find(p => p.id === partnerId);
    if (!partner) throw new Error('Invalid payment partner');

    // 1. Create a Stripe Payment Intent (holds the money)
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(options.amount * 100), // Convert to cents
    //   currency: 'usd',
    //   metadata: {
    //     tenantId: options.tenantId,
    //     propertyId: options.propertyId,
    //     type: 'cash_payment',
    //     partner: partnerId
    //   },
    //   description: options.description,
    //   // This allows offline payment capture
    //   capture_method: 'manual',
    //   payment_method_types: ['cashapp'] // Stripe supports Cash App
    // });

    // Mock payment intent for now
    const paymentIntent = { id: `pi_mock_${Date.now()}` };

    // 2. Generate unique reference ID
    const referenceId = `${partner.barcodePrefix}${Date.now()}${options.tenantId.slice(-4)}`;

    // 3. Create barcode data
    const barcodeData = {
      referenceId,
      paymentIntentId: paymentIntent.id,
      amount: options.amount,
      fee: partner.fee,
      totalAmount: options.amount + partner.fee,
      partner: partner.name,
      tenantId: options.tenantId,
      propertyId: options.propertyId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // 4. Store in temporary storage (replace with DB after migration)
    const cashPayment = {
      id: Date.now().toString(),
      referenceId,
      paymentIntentId: paymentIntent.id,
      tenantId: options.tenantId,
      propertyId: options.propertyId,
      amount: options.amount,
      fee: partner.fee,
      status: 'pending',
      partnerId,
      barcodeData: JSON.stringify(barcodeData),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    cashPayments.push(cashPayment);

    // 5. Generate actual barcode (you'd use a library like 'jsbarcode')
    const barcode = this.generateBarcode(referenceId);

    return {
      ...cashPayment,
      barcode,
      barcodeData,
      partner
    };
  }

  // Process cash payment when tenant pays at retail location
  static async processCashPayment(referenceId: string, confirmationNumber: string) {
    const cashPayment = cashPayments.find(cp => cp.referenceId === referenceId);
    
    if (!cashPayment) throw new Error('Payment not found');
    if (cashPayment.status !== 'pending') throw new Error('Payment already processed');
    if (new Date() > cashPayment.expiresAt) throw new Error('Payment expired');

    // 1. Capture the Stripe payment
    // const paymentIntent = await stripe.paymentIntents.capture(cashPayment.paymentIntentId);
    
    // Mock payment intent capture for now
    const paymentIntent = { id: cashPayment.paymentIntentId, status: 'succeeded' };

    // 2. Update payment status
    cashPayment.status = 'completed';
    cashPayment.confirmationNumber = confirmationNumber;
    cashPayment.processedAt = new Date();

    // 3. Send confirmation notification (when database is ready)
    // await this.sendPaymentConfirmation(tenant, cashPayment);

    return {
      success: true,
      paymentIntent,
      cashPayment
    };
  }

  // Generate barcode (simplified - use proper barcode library)
  private static generateBarcode(data: string): string {
    // In production, use: import JsBarcode from 'jsbarcode'
    // For now, return base64 encoded data
    return Buffer.from(data).toString('base64');
  }

  // Send payment confirmation
  private static async sendPaymentConfirmation(tenant: any, payment: any) {
    // Use your NotificationService when ready
    console.log('Payment confirmation sent to:', tenant.email);
  }

  // Get available partners
  static getPartners() {
    return this.partners;
  }

  // Check payment status
  static async checkPaymentStatus(referenceId: string) {
    const payment = cashPayments.find(cp => cp.referenceId === referenceId);

    if (!payment) return null;

    return {
      referenceId: payment.referenceId,
      status: payment.status,
      amount: payment.amount,
      fee: payment.fee,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      tenant: { name: 'Tenant Name', email: 'tenant@example.com' } // Mock data
    };
  }
}
