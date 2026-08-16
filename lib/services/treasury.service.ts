/**
 * Stripe Treasury Service
 * 
 * Manages Financial Accounts for landlords and contractors.
 * Financial accounts allow users to:
 * - Hold funds (like a bank account)
 * - Receive ACH transfers
 * - Send payments to contractors/vendors
 * - Issue debit cards (with Issuing)
 * 
 * REQUIREMENTS:
 * - Connected accounts must be Custom type (not Express)
 * - Connected accounts need 'treasury' capability
 * - Platform must have Treasury enabled in Stripe Dashboard
 */

import Stripe from 'stripe';
import { prisma } from '@/db/prisma';

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(stripeSecretKey);
}

// ============= CONNECTED ACCOUNT MANAGEMENT =============

/**
 * Create a Custom connected account with Treasury capability
 * Treasury requires Custom accounts (not Express)
 */
export async function createTreasuryConnectedAccount(params: {
  email: string;
  businessName?: string;
  type: 'landlord' | 'contractor';
  metadata?: Record<string, string>;
}): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const stripe = getStripe();

    const account = await stripe.accounts.create({
      country: 'US',
      email: params.email,
      capabilities: {
        transfers: { requested: true },
        treasury: { requested: true },
        us_bank_account_ach_payments: { requested: true },
        // card_issuing: { requested: true }, // Uncomment when ready for debit cards
      },
      business_type: 'individual',
      business_profile: {
        name: params.businessName,
        mcc: params.type === 'landlord' ? '6513' : '1520', // Real estate / contractors
        product_description: params.type === 'landlord' 
          ? 'Property management and rent collection'
          : 'Contractor services for property management',
      },
      controller: {
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        stripe_dashboard: { type: 'none' },
        requirement_collection: 'application',
      },
      metadata: {
        type: params.type,
        ...params.metadata,
      },
    });

    return { success: true, accountId: account.id };
  } catch (error: any) {
    console.error('Error creating Treasury connected account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update connected account with required information for Treasury
 * Custom accounts require platform to collect KYC info
 */
export async function updateConnectedAccountForTreasury(
  accountId: string,
  params: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dob: { day: number; month: number; year: number };
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
    };
    ssn_last_4?: string;
    id_number?: string; // Full SSN for verification
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = getStripe();

    await stripe.accounts.update(accountId, {
      individual: {
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        dob: params.dob,
        address: {
          line1: params.address.line1,
          city: params.address.city,
          state: params.address.state,
          postal_code: params.address.postal_code,
          country: 'US',
        },
        ssn_last_4: params.ssn_last_4,
        id_number: params.id_number,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: '127.0.0.1', // Should be actual user IP in production
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating connected account:', error);
    return { success: false, error: error.message };
  }
}

// ============= FINANCIAL ACCOUNT MANAGEMENT =============

/**
 * Create a Financial Account for a connected account
 * This is the actual "bank account" that holds funds
 */
export async function createFinancialAccount(
  connectedAccountId: string,
  params?: {
    features?: string[];
  }
): Promise<{ 
  success: boolean; 
  financialAccountId?: string; 
  routingNumber?: string;
  accountNumber?: string;
  error?: string 
}> {
  try {
    const stripe = getStripe();

    // Create financial account on the connected account
    const financialAccount = await stripe.treasury.financialAccounts.create(
      {
        supported_currencies: ['usd'],
        features: {
          financial_addresses: { aba: { requested: true } },
          deposit_insurance: { requested: true },
          inbound_transfers: { ach: { requested: true } },
          outbound_transfers: { ach: { requested: true }, us_domestic_wire: { requested: true } },
          outbound_payments: { ach: { requested: true }, us_domestic_wire: { requested: true } },
          intra_stripe_flows: { requested: true },
        },
      },
      {
        stripeAccount: connectedAccountId,
      }
    );

    // Get the ABA routing info if available
    let routingNumber: string | undefined;
    let accountNumber: string | undefined;

    if (financialAccount.financial_addresses?.length > 0) {
      const abaAddress = financialAccount.financial_addresses.find(
        (addr) => addr.type === 'aba'
      );
      if (abaAddress?.aba) {
        routingNumber = abaAddress.aba.routing_number ?? undefined;
        accountNumber = abaAddress.aba.account_number ?? undefined;
      }
    }

    return {
      success: true,
      financialAccountId: financialAccount.id,
      routingNumber,
      accountNumber,
    };
  } catch (error: any) {
    console.error('Error creating financial account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Financial Account details including balance
 */
export async function getFinancialAccount(
  connectedAccountId: string,
  financialAccountId: string
): Promise<{
  success: boolean;
  account?: {
    id: string;
    status: string;
    balance: {
      cash: number;
      inboundPending: number;
      outboundPending: number;
    };
    routingNumber?: string;
    accountNumberLast4?: string;
    features: string[];
  };
  error?: string;
}> {
  try {
    const stripe = getStripe();

    const financialAccount = await stripe.treasury.financialAccounts.retrieve(
      financialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: connectedAccountId }
    );

    // Get ABA info
    let routingNumber: string | undefined;
    let accountNumberLast4: string | undefined;

    if (financialAccount.financial_addresses?.length > 0) {
      const abaAddress = financialAccount.financial_addresses.find(
        (addr) => addr.type === 'aba'
      );
      if (abaAddress?.aba) {
        routingNumber = abaAddress.aba.routing_number;
        accountNumberLast4 = abaAddress.aba.account_number_last4;
      }
    }

    return {
      success: true,
      account: {
        id: financialAccount.id,
        status: financialAccount.status,
        balance: {
          cash: (financialAccount.balance?.cash?.usd || 0) / 100,
          inboundPending: (financialAccount.balance?.inbound_pending?.usd || 0) / 100,
          outboundPending: (financialAccount.balance?.outbound_pending?.usd || 0) / 100,
        },
        routingNumber,
        accountNumberLast4,
        features: financialAccount.active_features || [],
      },
    };
  } catch (error: any) {
    console.error('Error getting financial account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all Financial Accounts for a connected account
 */
export async function listFinancialAccounts(
  connectedAccountId: string
): Promise<{
  success: boolean;
  accounts?: Array<{
    id: string;
    status: string;
    balance: { cash: number };
  }>;
  error?: string;
}> {
  try {
    const stripe = getStripe();

    const accounts = await stripe.treasury.financialAccounts.list(
      {},
      { stripeAccount: connectedAccountId }
    );

    return {
      success: true,
      accounts: accounts.data.map((fa) => ({
        id: fa.id,
        status: fa.status,
        balance: {
          cash: (fa.balance?.cash?.usd || 0) / 100,
        },
      })),
    };
  } catch (error: any) {
    console.error('Error listing financial accounts:', error);
    return { success: false, error: error.message };
  }
}

// ============= MONEY MOVEMENT =============

/**
 * Transfer funds from Connected Account balance to Financial Account
 * (Payout from Stripe balance to Treasury account)
 */
export async function transferToFinancialAccount(
  connectedAccountId: string,
  financialAccountId: string,
  amount: number, // in dollars
  description?: string
): Promise<{ success: boolean; transferId?: string; error?: string }> {
  try {
    const stripe = getStripe();

    // Create an InboundTransfer to move funds into the financial account
    const transfer = await stripe.treasury.inboundTransfers.create(
      {
        financial_account: financialAccountId,
        amount: Math.round(amount * 100),
        currency: 'usd',
        origin_payment_method: 'pm_usBankAccount', // Platform's bank account
        description: description || 'Transfer to financial account',
      },
      { stripeAccount: connectedAccountId }
    );

    return { success: true, transferId: transfer.id };
  } catch (error: any) {
    console.error('Error transferring to financial account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment from Financial Account to external bank account
 * (OutboundPayment - like paying a contractor)
 */
export async function sendOutboundPayment(
  connectedAccountId: string,
  financialAccountId: string,
  params: {
    amount: number; // in dollars
    destinationBankAccount: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    description?: string;
  }
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const stripe = getStripe();

    const payment = await stripe.treasury.outboundPayments.create(
      {
        financial_account: financialAccountId,
        amount: Math.round(params.amount * 100),
        currency: 'usd',
        destination_payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            account_number: params.destinationBankAccount.accountNumber,
            routing_number: params.destinationBankAccount.routingNumber,
            account_holder_type: 'individual',
          },
          billing_details: {
            name: params.destinationBankAccount.accountHolderName,
          },
        },
        description: params.description || 'Payment',
      },
      { stripeAccount: connectedAccountId }
    );

    return { success: true, paymentId: payment.id };
  } catch (error: any) {
    console.error('Error sending outbound payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction history for a Financial Account
 */
export async function getTransactionHistory(
  connectedAccountId: string,
  financialAccountId: string,
  limit: number = 20
): Promise<{
  success: boolean;
  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    description: string;
    created: Date;
  }>;
  error?: string;
}> {
  try {
    const stripe = getStripe();

    const transactions = await stripe.treasury.transactions.list(
      {
        financial_account: financialAccountId,
        limit,
      },
      { stripeAccount: connectedAccountId }
    );

    return {
      success: true,
      transactions: transactions.data.map((tx) => ({
        id: tx.id,
        type: tx.flow_type || 'unknown',
        amount: tx.amount / 100,
        status: tx.status,
        description: tx.description || '',
        created: new Date(tx.created * 1000),
      })),
    };
  } catch (error: any) {
    console.error('Error getting transaction history:', error);
    return { success: false, error: error.message };
  }
}

// ============= WALLET-TO-WALLET TRANSFERS =============

/**
 * Transfer funds between two Treasury Financial Accounts
 * Used for contractor marketplace payments (landlord wallet → contractor wallet)
 * 
 * This uses OutboundPayment with the destination's Treasury account routing info.
 * Stripe recognizes it as an intra-Stripe transfer and processes it faster.
 */
export async function transferBetweenWallets(params: {
  fromConnectedAccountId: string;
  fromFinancialAccountId: string;
  toConnectedAccountId: string;
  toFinancialAccountId: string;
  amount: number; // in dollars
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ 
  success: boolean; 
  paymentId?: string; 
  status?: string;
  error?: string 
}> {
  try {
    const stripe = getStripe();

    // Get the destination financial account's ABA routing info
    const destFA = await stripe.treasury.financialAccounts.retrieve(
      params.toFinancialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: params.toConnectedAccountId }
    );

    const destABA = destFA.financial_addresses?.find(a => a.type === 'aba')?.aba;
    
    if (!destABA || !destABA.account_number) {
      return { 
        success: false, 
        error: 'Destination account does not have ABA routing info' 
      };
    }

    // Create OutboundPayment from source to destination
    const payment = await stripe.treasury.outboundPayments.create(
      {
        financial_account: params.fromFinancialAccountId,
        amount: Math.round(params.amount * 100),
        currency: 'usd',
        destination_payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: destABA.routing_number,
            account_number: destABA.account_number,
            account_holder_type: 'individual',
          },
          billing_details: {
            name: 'Contractor Payment', // Could be dynamic
          },
        },
        statement_descriptor: 'Platform Payment',
        description: params.description || 'Wallet transfer',
        metadata: params.metadata,
      },
      { stripeAccount: params.fromConnectedAccountId }
    );

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status,
    };
  } catch (error: any) {
    console.error('Error transferring between wallets:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the ABA routing info for a financial account
 * Useful for displaying account details or setting up transfers
 */
export async function getFinancialAccountABA(
  connectedAccountId: string,
  financialAccountId: string
): Promise<{
  success: boolean;
  routingNumber?: string;
  accountNumber?: string;
  accountNumberLast4?: string;
  error?: string;
}> {
  try {
    const stripe = getStripe();

    const fa = await stripe.treasury.financialAccounts.retrieve(
      financialAccountId,
      { expand: ['financial_addresses'] },
      { stripeAccount: connectedAccountId }
    );

    const aba = fa.financial_addresses?.find(a => a.type === 'aba')?.aba;

    if (!aba) {
      return { success: false, error: 'No ABA address found' };
    }

    return {
      success: true,
      routingNumber: aba.routing_number ?? undefined,
      accountNumber: aba.account_number ?? undefined,
      accountNumberLast4: aba.account_number_last4 ?? undefined,
    };
  } catch (error: any) {
    console.error('Error getting ABA info:', error);
    return { success: false, error: error.message };
  }
}

// ============= DATABASE HELPERS =============

/**
 * Save Financial Account info to database
 */
export async function saveFinancialAccountToDb(params: {
  landlordId?: string;
  contractorId?: string;
  stripeConnectedAccountId: string;
  stripeFinancialAccountId: string;
  routingNumber?: string;
  accountNumberLast4?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // For now, store in the existing wallet table or create a new one
    // This would need a migration to add FinancialAccount model
    
    if (params.landlordId) {
      await prisma.landlord.update({
        where: { id: params.landlordId },
        data: {
          // Store Treasury info - would need schema update
          // stripeFinancialAccountId: params.stripeFinancialAccountId,
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving financial account to DB:', error);
    return { success: false, error: error.message };
  }
}
