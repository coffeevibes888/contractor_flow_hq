/**
 * Stripe Configuration
 * Auto-selects test or live keys based on environment
 */

const isProduction = process.env.NODE_ENV === 'production' && 
                     process.env.VERCEL_ENV === 'production';

export const stripeConfig = {
  publishableKey: isProduction
    ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    : process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  secretKey: isProduction
    ? process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
  
  prices: {
    // Monthly prices
    starter: isProduction
      ? process.env.STRIPE_LIVE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER
      : process.env.STRIPE_TEST_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER,
    
    pro: isProduction
      ? process.env.STRIPE_LIVE_PRICE_PRO || process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_TEST_PRICE_PRO || process.env.STRIPE_PRICE_PRO,
    
    enterprise: isProduction
      ? process.env.STRIPE_LIVE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_ENTERPRISE
      : process.env.STRIPE_TEST_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_ENTERPRISE,

    // Yearly prices (20% discount)
    starterYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_STARTER_YEARLY || process.env.STRIPE_PRICE_STARTER_YEARLY
      : process.env.STRIPE_TEST_PRICE_STARTER_YEARLY || process.env.STRIPE_PRICE_STARTER_YEARLY,

    proYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_PRO_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY
      : process.env.STRIPE_TEST_PRICE_PRO_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY,

    enterpriseYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_ENTERPRISE_YEARLY || process.env.STRIPE_PRICE_ENTERPRISE_YEARLY
      : process.env.STRIPE_TEST_PRICE_ENTERPRISE_YEARLY || process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,

    // Contractor monthly prices
    contractorStarter: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_STARTER || process.env.STRIPE_PRICE_CONTRACTOR_STARTER
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_STARTER || process.env.STRIPE_PRICE_CONTRACTOR_STARTER,

    contractorPro: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_PRO || process.env.STRIPE_PRICE_CONTRACTOR_PRO
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_PRO || process.env.STRIPE_PRICE_CONTRACTOR_PRO,

    contractorEnterprise: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_ENTERPRISE || process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_ENTERPRISE || process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE,

    // Contractor yearly prices (20% discount)
    contractorStarterYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_STARTER_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_STARTER_YEARLY
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_STARTER_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_STARTER_YEARLY,

    contractorProYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_PRO_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_PRO_YEARLY
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_PRO_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_PRO_YEARLY,

    contractorEnterpriseYearly: isProduction
      ? process.env.STRIPE_LIVE_PRICE_CONTRACTOR_ENTERPRISE_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE_YEARLY
      : process.env.STRIPE_TEST_PRICE_CONTRACTOR_ENTERPRISE_YEARLY || process.env.STRIPE_PRICE_CONTRACTOR_ENTERPRISE_YEARLY,
  },
  
  isTestMode: !isProduction,
};

// For backwards compatibility - export individual values
export const STRIPE_PUBLISHABLE_KEY = stripeConfig.publishableKey;
export const STRIPE_SECRET_KEY = stripeConfig.secretKey;
export const STRIPE_PRICE_STARTER = stripeConfig.prices.starter;
export const STRIPE_PRICE_PRO = stripeConfig.prices.pro;
export const STRIPE_PRICE_ENTERPRISE = stripeConfig.prices.enterprise;
