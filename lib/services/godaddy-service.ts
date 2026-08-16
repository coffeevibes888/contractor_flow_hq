/**
 * GoDaddy API Service
 * Handles domain search and purchase through GoDaddy API
 * White-label integration - clients won't know we're using GoDaddy
 */

const GODADDY_API_KEY = process.env.GODADDY_KEY || process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_SECRET || process.env.GOADDY_SECRET_KEY || process.env.GODADDY_API_SECRET;
const GODADDY_API_BASE_URL = process.env.GODADDY_API_BASE_URL || 'https://api.godaddy.com/v1';

if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
  console.warn('GoDaddy API credentials not configured. Domain search/purchase will not work.');
}

interface DomainAvailability {
  domain: string;
  available: boolean;
  price: number;
  currency: string;
  period?: number;
}

interface DomainSuggestion {
  domain: string;
  price: number;
  currency: string;
}

/**
 * Search for domain availability
 */
export async function searchDomain(domainName: string): Promise<DomainAvailability | null> {
  if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
    throw new Error('GoDaddy API credentials not configured');
  }

  try {
    // Check domain availability
    const availabilityResponse = await fetch(
      `${GODADDY_API_BASE_URL}/domains/available?domain=${encodeURIComponent(domainName)}&checkType=FAST&forTransfer=false`,
      {
        method: 'GET',
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!availabilityResponse.ok) {
      const errorText = await availabilityResponse.text();
      throw new Error(`GoDaddy API error: ${errorText}`);
    }

    const availabilityData = await availabilityResponse.json();

    // Get pricing information
    const pricingResponse = await fetch(
      `${GODADDY_API_BASE_URL}/domains/available?domain=${encodeURIComponent(domainName)}&checkType=FULL`,
      {
        method: 'GET',
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let price = 0;
    let currency = 'USD';
    let period = 1;

    if (pricingResponse.ok) {
      const pricingData = await pricingResponse.json();
      if (pricingData.price) {
        price = pricingData.price / 1000000; // GoDaddy returns price in micros
        currency = pricingData.currency || 'USD';
        period = pricingData.period || 1;
      }
    }

    return {
      domain: domainName,
      available: availabilityData.available === true,
      price,
      currency,
      period,
    };
  } catch (error) {
    console.error('Error searching domain:', error);
    throw error;
  }
}

/**
 * Get domain suggestions based on a search term
 */
export async function getDomainSuggestions(searchTerm: string, limit: number = 10): Promise<DomainSuggestion[]> {
  if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
    throw new Error('GoDaddy API credentials not configured');
  }

  try {
    const response = await fetch(
      `${GODADDY_API_BASE_URL}/domains/suggest?query=${encodeURIComponent(searchTerm)}&limit=${limit}&waitMs=1000`,
      {
        method: 'GET',
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GoDaddy API error: ${errorText}`);
    }

    const suggestions = await response.json();

    return suggestions.map((suggestion: any) => ({
      domain: suggestion.domain,
      price: suggestion.price ? suggestion.price / 1000000 : 0, // Convert from micros
      currency: suggestion.currency || 'USD',
    }));
  } catch (error) {
    console.error('Error getting domain suggestions:', error);
    throw error;
  }
}

/**
 * Purchase a domain
 */
export async function purchaseDomain(
  domain: string,
  contactInfo: {
    nameFirst: string;
    nameLast: string;
    email: string;
    phone: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  },
  years: number = 1
): Promise<{ success: boolean; orderId?: string; message?: string }> {
  if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
    throw new Error('GoDaddy API credentials not configured');
  }

  try {
    const purchaseData = {
      domain: domain,
      years: years,
      privacy: true,
      renewAuto: true,
      consent: {
        agreedAt: new Date().toISOString(),
        agreedBy: `${contactInfo.nameFirst} ${contactInfo.nameLast}`,
        agreementKeys: ['DNRA'],
      },
      contactAdmin: {
        nameFirst: contactInfo.nameFirst,
        nameLast: contactInfo.nameLast,
        email: contactInfo.email,
        phone: contactInfo.phone,
        address1: contactInfo.address1,
        city: contactInfo.city,
        state: contactInfo.state,
        zip: contactInfo.zip,
        country: contactInfo.country,
      },
      contactBilling: {
        nameFirst: contactInfo.nameFirst,
        nameLast: contactInfo.nameLast,
        email: contactInfo.email,
        phone: contactInfo.phone,
        address1: contactInfo.address1,
        city: contactInfo.city,
        state: contactInfo.state,
        zip: contactInfo.zip,
        country: contactInfo.country,
      },
      contactRegistrant: {
        nameFirst: contactInfo.nameFirst,
        nameLast: contactInfo.nameLast,
        email: contactInfo.email,
        phone: contactInfo.phone,
        address1: contactInfo.address1,
        city: contactInfo.city,
        state: contactInfo.state,
        zip: contactInfo.zip,
        country: contactInfo.country,
      },
      contactTech: {
        nameFirst: contactInfo.nameFirst,
        nameLast: contactInfo.nameLast,
        email: contactInfo.email,
        phone: contactInfo.phone,
        address1: contactInfo.address1,
        city: contactInfo.city,
        state: contactInfo.state,
        zip: contactInfo.zip,
        country: contactInfo.country,
      },
    };

    const response = await fetch(`${GODADDY_API_BASE_URL}/domains/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || 'Failed to purchase domain',
      };
    }

    return {
      success: true,
      orderId: responseData.orderId,
    };
  } catch (error) {
    console.error('Error purchasing domain:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to purchase domain',
    };
  }
}

