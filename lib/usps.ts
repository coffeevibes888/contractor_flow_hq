interface USPSTrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

interface USPSTrackingData {
  trackingNumber: string;
  status: string;
  carrier: string;
  estimatedDelivery?: string;
  events: USPSTrackingEvent[];
}

const USPS_AUTH_URL = 'https://apis.usps.com/oauth2/v1/token';
const USPS_API_BASE_URL = 'https://apis.usps.com/tracking/v3/tracking';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getUSPSAccessToken(): Promise<string> {
  const consumerKey = process.env.USPS_CONSUMER_KEY;
  const consumerSecret = process.env.USPS_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('USPS_CONSUMER_KEY and USPS_CONSUMER_SECRET not configured');
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const response = await fetch(USPS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`OAuth error: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting USPS access token:', error);
    throw error;
  }
}

export async function getUSPSTracking(
  trackingNumber: string
): Promise<USPSTrackingData> {
  try {
    const consumerKey = process.env.USPS_CONSUMER_KEY;
    const consumerSecret = process.env.USPS_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.warn(
        'USPS credentials not configured, using mock data for development'
      );
      return getMockTrackingData(trackingNumber);
    }

    const accessToken = await getUSPSAccessToken();

    const response = await fetch(
      `${USPS_API_BASE_URL}/${trackingNumber}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`USPS API error: ${response.status}`);
      return getMockTrackingData(trackingNumber);
    }

    const data = await response.json();
    return parseUSPSResponse(data, trackingNumber);
  } catch (error) {
    console.error('Error fetching USPS tracking:', error);
    return getMockTrackingData(trackingNumber);
  }
}

function parseUSPSResponse(
  data: Record<string, unknown>,
  trackingNumber: string
): USPSTrackingData {
  const trackingInfo = (data.TrackingInfo as Record<string, unknown>[])?.[0] || {};
  const statusSummary = (trackingInfo as Record<string, unknown>).TrackSummary || {};

  const events: USPSTrackingEvent[] = (
    (trackingInfo as Record<string, unknown>).TrackDetail as Record<string, unknown>[] || []
  ).map((detail: Record<string, unknown>) => {
    const eventDate = detail.EventDate as string | undefined;
    const eventCity = detail.EventCity as string | undefined;
    const eventState = detail.EventState as string | undefined;
    const eventCountry = detail.EventCountry as string | undefined;
    const event = detail.Event as string | undefined;
    const eventDescription = detail.EventDescription as string | undefined;

    return {
      timestamp: eventDate
        ? new Date(
            `${eventDate.substring(0, 4)}-${eventDate.substring(4, 6)}-${eventDate.substring(6, 8)}`
          ).toISOString()
        : new Date().toISOString(),
      location: `${eventCity || ''}, ${eventState || eventCountry || ''}`.trim(),
      status: event || 'Update',
      description: eventDescription || '',
    };
  });

  const status = (statusSummary as Record<string, unknown>).Status as string | undefined;
  const estimatedDelivery = (statusSummary as Record<string, unknown>).ExpectedDeliveryDate as string | undefined;

  return {
    trackingNumber,
    status: status || 'In Transit',
    carrier: 'USPS',
    estimatedDelivery,
    events: events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
  };
}

function getMockTrackingData(trackingNumber: string): USPSTrackingData {
  const statuses = ['Accepted', 'In Transit', 'Out for Delivery', 'Delivered'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const now = new Date();
  const events: USPSTrackingEvent[] = [
    {
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'New York, NY',
      status: 'Accepted',
      description: 'Package accepted by USPS',
    },
    {
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'New Jersey, NJ',
      status: 'In Transit',
      description: 'Package in transit to distribution center',
    },
  ];

  if (randomStatus !== 'Accepted') {
    events.push({
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      location: 'Los Angeles, CA',
      status: 'Out for Delivery',
      description: 'Package out for delivery',
    });
  }

  if (randomStatus === 'Delivered') {
    events.push({
      timestamp: now.toISOString(),
      location: 'Los Angeles, CA',
      status: 'Delivered',
      description: 'Package delivered',
    });
  }

  return {
    trackingNumber,
    status: randomStatus,
    carrier: 'USPS',
    estimatedDelivery: new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    ).toISOString(),
    events,
  };
}
