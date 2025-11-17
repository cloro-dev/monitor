import faviconFetch from 'favicon-fetch';

export interface DomainInfo {
  domain: string;
  name: string | null;
  faviconUrl: string | null;
}

/**
 * Extract brand information from a domain including name and favicon
 */
export async function fetchDomainInfo(domain: string): Promise<DomainInfo> {
  try {
    // Normalize the domain
    const normalizedDomain = normalizeDomain(domain);

    // Get favicon URL using the icon.horse service
    const faviconUrl = faviconFetch({ hostname: normalizedDomain, size: 64 });

    // Extract brand name from the domain
    const name = extractBrandName(normalizedDomain);

    return {
      domain: normalizedDomain,
      name,
      faviconUrl,
    };
  } catch (error) {
    console.error(`Error fetching domain info for ${domain}:`, error);

    // Fallback: use domain name and generic favicon
    const normalizedDomain = normalizeDomain(domain);
    const name = extractBrandName(normalizedDomain);

    return {
      domain: normalizedDomain,
      name,
      faviconUrl: null,
    };
  }
}

/**
 * Extract brand name from domain
 */
function extractBrandName(domain: string): string {
  // Remove subdomains and extract the main domain
  let name = '';
  const parts = domain.split('.');

  // Handle common TLDs like .co.uk, .com.au, etc.
  if (
    parts.length >= 3 &&
    ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(
      parts[parts.length - 2],
    )
  ) {
    name = parts[parts.length - 3];
  } else {
    // For regular domains, use the second-level domain
    name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }

  // Capitalize the first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Normalize a domain string
 */
function normalizeDomain(domain: string): string {
  try {
    // If domain already has protocol, use URL constructor
    if (domain.startsWith('http')) {
      const url = new URL(domain);
      return url.hostname
        .replace(/^www\./, '')
        .toLowerCase()
        .trim();
    }

    // Otherwise, just clean up the string
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '') // Remove any path
      .toLowerCase()
      .trim();
  } catch (error) {
    // If all else fails, return a cleaned version of the input
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();
  }
}

/**
 * Validate if a string is a valid domain format
 */
export function isValidDomain(domain: string): boolean {
  const normalizedDomain = normalizeDomain(domain);

  // Basic domain regex
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;

  return (
    domainRegex.test(normalizedDomain) &&
    normalizedDomain.length <= 253 &&
    !normalizedDomain.startsWith('.') &&
    !normalizedDomain.endsWith('.')
  );
}
