import OAuthClient from 'intuit-oauth';
import { prisma } from '@/db/prisma';
import { decryptField, encryptField } from '@/lib/encrypt';

const getOAuthClient = () => {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks env vars QUICKBOOKS_CLIENT_ID/QUICKBOOKS_CLIENT_SECRET are not set');
  }

  const environment = (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox').toLowerCase();

  const redirectUri =
    process.env.QUICKBOOKS_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/integrations/quickbooks/callback`;

  return new OAuthClient({
    clientId,
    clientSecret,
    environment: environment === 'production' ? 'production' : 'sandbox',
    redirectUri,
  });
};

export type QuickBooksTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export const getQuickBooksAuthorizationUrl = async (opts: {
  landlordId: string;
  state: string;
}) => {
  const oauthClient = getOAuthClient();

  const url = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: opts.state,
  });

  await (prisma as any).quickBooksConnection.upsert({
    where: { landlordId: opts.landlordId },
    create: {
      landlordId: opts.landlordId,
      oauthState: opts.state,
      connectedAt: null,
    },
    update: {
      oauthState: opts.state,
    },
  });

  return url;
};

export const exchangeQuickBooksCode = async (opts: {
  landlordId: string;
  url: string;
}) => {
  const oauthClient = getOAuthClient();
  const tokenResp = await oauthClient.createToken(opts.url);

  const raw = tokenResp.getJson();
  const accessToken = raw.access_token as string | undefined;
  const refreshToken = raw.refresh_token as string | undefined;
  const expiresIn = raw.expires_in as number | undefined;

  const realmId = (tokenResp as any).getToken?.().realmId || (raw as any).realmId;

  if (!accessToken || !refreshToken || !expiresIn || !realmId) {
    throw new Error('QuickBooks token exchange failed: missing access/refresh token, expires_in, or realmId');
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await (prisma as any).quickBooksConnection.update({
    where: { landlordId: opts.landlordId },
    data: {
      realmId,
      accessTokenEncrypted: await encryptField(accessToken),
      refreshTokenEncrypted: await encryptField(refreshToken),
      accessTokenExpiresAt: expiresAt,
      connectedAt: new Date(),
      oauthState: null,
    },
  });
};

export const getQuickBooksAccessToken = async (landlordId: string): Promise<{
  accessToken: string;
  realmId: string;
}> => {
  const conn = await (prisma as any).quickBooksConnection.findUnique({
    where: { landlordId },
  });

  if (!conn?.realmId || !conn.accessTokenEncrypted || !conn.refreshTokenEncrypted) {
    throw new Error('QuickBooks not connected');
  }

  const accessToken = await decryptField(conn.accessTokenEncrypted);
  const refreshToken = await decryptField(conn.refreshTokenEncrypted);

  if (!accessToken || !refreshToken) {
    throw new Error('QuickBooks tokens missing');
  }

  const expiresAt = conn.accessTokenExpiresAt;
  const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() + 60_000 : true;

  if (!isExpired) {
    return { accessToken, realmId: conn.realmId };
  }

  const oauthClient = getOAuthClient();
  oauthClient.setToken({
    access_token: accessToken,
    refresh_token: refreshToken,
  } as any);

  const refreshed = await oauthClient.refresh();
  const refreshedJson = refreshed.getJson();

  const newAccess = refreshedJson.access_token as string | undefined;
  const newRefresh = refreshedJson.refresh_token as string | undefined;
  const newExpiresIn = refreshedJson.expires_in as number | undefined;

  if (!newAccess || !newRefresh || !newExpiresIn) {
    throw new Error('QuickBooks token refresh failed');
  }

  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);

  await (prisma as any).quickBooksConnection.update({
    where: { landlordId },
    data: {
      accessTokenEncrypted: await encryptField(newAccess),
      refreshTokenEncrypted: await encryptField(newRefresh),
      accessTokenExpiresAt: newExpiresAt,
    },
  });

  return { accessToken: newAccess, realmId: conn.realmId };
};

export const fetchQuickBooksCompanyInfo = async (opts: {
  landlordId: string;
}) => {
  const { accessToken, realmId } = await getQuickBooksAccessToken(opts.landlordId);

  const environment = (process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox').toLowerCase();
  const baseUrl =
    environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

  const url = `${baseUrl}/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error (${res.status}): ${text}`);
  }

  return res.json();
};
