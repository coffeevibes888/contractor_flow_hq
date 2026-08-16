import Stripe from 'stripe';
import { prisma } from '@/db/prisma';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

const PLATFORM_FEE_FLAT = 1.00; // $1 flat fee per transaction (homeowner pays)

export class StripeEscrowService {
  /**
   * Create a Stripe customer for a user
   */
  static async createCustomer(userId: string, email: string, name: string) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
          platform: 'property-flow-hq'
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create Stripe customer');
    }
  }

  /**
   * Create a Connect Express account for a contractor
   */
  static async createConnectAccount(
    contractorId: string,
    email: string,
    businessName: string
  ) {
    try {
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
        country: 'US',
        email,
        capabilities: {
          transfers: { requested: true }
        },
        business_type: 'individual',
        metadata: {
          contractorId,
          platform: 'property-flow-hq'
        }
      });

      return account;
    } catch (error) {
      console.error('Error creating Connect account:', error);
      throw new Error('Failed to create Connect account');
    }
  }

  /**
   * Create an account link for Connect onboarding
   */
  static async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return accountLink;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw new Error('Failed to create account link');
    }
  }

  /**
   * Create a payment intent for escrow funding
   */
  static async createPaymentIntent(
    escrowId: string,
    amount: number,
    customerId: string,
    metadata: Record<string, string>
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        capture_method: 'manual', // Hold funds until milestone completion
        metadata: {
          escrowId,
          ...metadata
        },
        description: `Escrow funding for job ${metadata.jobId}`
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment intent (customer authorizes payment)
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: paymentMethodId
        }
      );

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  /**
   * Capture a payment intent (charge the customer)
   */
  static async capturePaymentIntent(
    paymentIntentId: string,
    amountToCapture?: number
  ) {
    try {
      const captureData: any = {};
      
      if (amountToCapture) {
        captureData.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId,
        captureData
      );

      return paymentIntent;
    } catch (error) {
      console.error('Error capturing payment intent:', error);
      throw new Error('Failed to capture payment');
    }
  }

  /**
   * Cancel a payment intent (release hold without charging)
   */
  static async cancelPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      throw new Error('Failed to cancel payment');
    }
  }

  /**
   * Transfer funds to contractor (after milestone completion)
   * Contractor receives 100% of milestone amount
   */
  static async transferToContractor(
    amount: number,
    contractorAccountId: string,
    metadata: Record<string, string>
  ) {
    try {
      // Contractor receives full amount (no platform fee deducted)
      const contractorAmount = amount;

      // Create transfer
      const transfer = await stripe.transfers.create({
        amount: Math.round(contractorAmount * 100), // Convert to cents
        currency: 'usd',
        destination: contractorAccountId,
        metadata: {
          ...metadata,
          contractorAmount: contractorAmount.toString()
        }
      });

      return {
        transfer,
        contractorAmount
      };
    } catch (error) {
      console.error('Error transferring to contractor:', error);
      throw new Error('Failed to transfer funds');
    }
  }

  /**
   * Get customer details
   */
  static async getCustomer(customerId: string) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      throw new Error('Failed to retrieve customer');
    }
  }

  /**
   * Charge platform fee to homeowner ($1 flat fee)
   */
  static async chargePlatformFee(
    customerId: string,
    paymentMethodId: string,
    metadata: Record<string, string>
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(PLATFORM_FEE_FLAT * 100), // $1 in cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: 'Platform service fee',
        metadata: {
          ...metadata,
          type: 'platform_fee',
          amount: PLATFORM_FEE_FLAT.toString()
        }
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error charging platform fee:', error);
      throw new Error('Failed to charge platform fee');
    }
  }
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ) {
    try {
      const refundData: any = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundData.reason = reason;
      }

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error('Failed to create refund');
    }
  }

  /**
   * Get payment intent details
   */
  static async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Get Connect account details
   */
  static async getConnectAccount(accountId: string) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      console.error('Error retrieving Connect account:', error);
      throw new Error('Failed to retrieve Connect account');
    }
  }

  /**
   * Get transfer details
   */
  static async getTransfer(transferId: string) {
    try {
      const transfer = await stripe.transfers.retrieve(transferId);
      return transfer;
    } catch (error) {
      console.error('Error retrieving transfer:', error);
      throw new Error('Failed to retrieve transfer');
    }
  }

  /**
   * Release milestone payment (capture + transfer)
   * Contractor receives 100% of milestone amount
   * Platform charges $1 fee separately to homeowner
   */
  static async releaseMilestonePayment(
    milestoneId: string,
    paymentIntentId: string,
    contractorAccountId: string,
    customerStripeId: string,
    paymentMethodId: string
  ) {
    try {
      // Get milestone details
      const milestone = await prisma.jobMilestone.findUnique({
        where: { id: milestoneId },
        include: {
          escrow: {
            include: {
              contractorJob: true
            }
          }
        }
      });

      if (!milestone) {
        throw new Error('Milestone not found');
      }

      const amount = Number(milestone.amount);

      // Step 1: Capture payment from customer
      const paymentIntent = await this.capturePaymentIntent(
        paymentIntentId,
        amount
      );

      // Step 2: Transfer full amount to contractor
      const { transfer, contractorAmount } = await this.transferToContractor(
        amount,
        contractorAccountId,
        {
          milestoneId,
          escrowId: milestone.escrowId,
          jobId: milestone.escrow.contractorJobId
        }
      );

      // Step 3: Charge $1 platform fee to homeowner
      const platformFeePayment = await this.chargePlatformFee(
        customerStripeId,
        paymentMethodId,
        {
          milestoneId,
          escrowId: milestone.escrowId,
          jobId: milestone.escrow.contractorJobId
        }
      );

      // Step 4: Create release record
      const release = await prisma.escrowRelease.create({
        data: {
          escrowId: milestone.escrowId,
          milestoneId,
          amount,
          platformFee: PLATFORM_FEE_FLAT,
          contractorAmount,
          stripeTransferId: transfer.id,
          releaseType: 'milestone_completion',
          status: 'completed'
        }
      });

      // Step 5: Update milestone status
      await prisma.jobMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'completed',
          releasedAt: new Date()
        }
      });

      return {
        paymentIntent,
        transfer,
        platformFeePayment,
        release,
        platformFee: PLATFORM_FEE_FLAT,
        contractorAmount
      };
    } catch (error) {
      console.error('Error releasing milestone payment:', error);
      throw new Error('Failed to release milestone payment');
    }
  }

  /**
   * Refund escrow (cancel payment intent or create refund)
   */
  static async refundEscrow(
    escrowId: string,
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ) {
    try {
      // Get payment intent status
      const paymentIntent = await this.getPaymentIntent(paymentIntentId);

      let refund;
      
      if (paymentIntent.status === 'requires_capture') {
        // Payment not captured yet, just cancel
        refund = await this.cancelPaymentIntent(paymentIntentId);
      } else if (paymentIntent.status === 'succeeded') {
        // Payment captured, create refund
        refund = await this.createRefund(paymentIntentId, amount, reason);
      } else {
        throw new Error(`Cannot refund payment intent with status: ${paymentIntent.status}`);
      }

      // Update escrow status
      await prisma.jobEscrow.update({
        where: { id: escrowId },
        data: {
          status: 'refunded',
        }
      });

      return refund;
    } catch (error) {
      console.error('Error refunding escrow:', error);
      throw new Error('Failed to refund escrow');
    }
  }

  /**
   * Get account balance
   */
  static async getBalance() {
    try {
      const balance = await stripe.balance.retrieve();
      return balance;
    } catch (error) {
      console.error('Error retrieving balance:', error);
      throw new Error('Failed to retrieve balance');
    }
  }

  /**
   * List all transfers
   */
  static async listTransfers(limit = 10) {
    try {
      const transfers = await stripe.transfers.list({ limit });
      return transfers;
    } catch (error) {
      console.error('Error listing transfers:', error);
      throw new Error('Failed to list transfers');
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ) {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, secret);
      return event;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}
