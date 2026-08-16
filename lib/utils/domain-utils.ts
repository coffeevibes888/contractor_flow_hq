/**
 * Get the root domain from the request host header
 * Falls back to NEXT_PUBLIC_ROOT_DOMAIN env variable if needed
 */
export function getRootDomainFromHost(host: string | null): string {
  if (!host) {
    return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'propertyflowhq.com';
  }

  const bareHost = host.split(':')[0].toLowerCase();
  
  // If it's localhost, return localhost
  if (bareHost.includes('localhost')) {
    return 'localhost:3000';
  }

  // For production, extract root domain from host
  // If host is "subdomain.propertyflowhq.com", return "propertyflowhq.com"
  // If host is "propertyflowhq.com", return "propertyflowhq.com"
  const parts = bareHost.split('.');
  
  // If it's a subdomain (has more than 2 parts), extract the root
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  
  // Otherwise, it's already the root domain
  return bareHost;
}

/**
 * Check if we're in production based on the host
 */
export function isProduction(host: string | null): boolean {
  if (!host) return false;
  const bareHost = host.split(':')[0].toLowerCase();
  return !bareHost.includes('localhost') && !bareHost.includes('127.0.0.1');
}

/**
 * Get the protocol (http/https) based on environment
 */
export function getProtocol(host: string | null): string {
  if (!host) return 'https';
  const bareHost = host.split(':')[0].toLowerCase();
  return bareHost.includes('localhost') || bareHost.includes('127.0.0.1') ? 'http' : 'https';
}

