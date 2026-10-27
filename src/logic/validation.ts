import { OfferItem, SystemConfig } from './types';

/**
 * Validates price sanity and calculates genuine discount percentage.
 */
export function calculateDiscount(currentPrice: number, originalPrice: number): {
  discountPercent: number;
  savings: number;
  isFakeDiscount: boolean;
  isValidPrice: boolean;
} {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !Number.isFinite(originalPrice) || originalPrice < 0) {
    return { discountPercent: 0, savings: 0, isFakeDiscount: true, isValidPrice: false };
  }

  // If no original price or lower than current price, genuine discount is 0%
  if (originalPrice === 0 || originalPrice <= currentPrice) {
    return {
      discountPercent: 0,
      savings: 0,
      isFakeDiscount: false,
      isValidPrice: true,
    };
  }

  const savings = Math.max(0, originalPrice - currentPrice);
  const discountPercent = Math.round((savings / originalPrice) * 100);

  // Fake discount heuristics: e.g. inflated original price causing > 92% on luxury electronics or < 3%
  const isFakeDiscount = discountPercent < 3 || discountPercent > 92;

  return {
    discountPercent,
    savings,
    isFakeDiscount,
    isValidPrice: true,
  };
}

/**
 * Evaluates the Opportunity Score (0 to 100) of a deal for BOX DO GARIMPO.
 */
export function calculateOpportunityScore(item: {
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  sellerReputation: string;
  freeShipping: boolean;
  stockAvailable: boolean;
}): number {
  if (!item.stockAvailable || !Number.isFinite(item.currentPrice) || item.currentPrice <= 0 || !Number.isFinite(item.discountPercent)) {
    return 0;
  }

  let score = 0;

  // 1. Discount magnitude (up to 40 pts)
  if (item.discountPercent >= 50) score += 40;
  else if (item.discountPercent >= 40) score += 35;
  else if (item.discountPercent >= 30) score += 30;
  else if (item.discountPercent >= 20) score += 20;
  else if (item.discountPercent >= 10) score += 10;
  else score += 5;

  // 2. Seller reputation (up to 25 pts)
  if (item.sellerReputation === 'MercadoLider Platinum') score += 25;
  else if (item.sellerReputation === 'MercadoLider Gold') score += 20;
  else if (item.sellerReputation === 'MercadoLider') score += 15;
  else score += 5;

  // 3. Free Shipping (15 pts)
  if (item.freeShipping) score += 15;

  // 4. Absolute savings value (up to 20 pts)
  const savings = item.originalPrice - item.currentPrice;
  if (savings >= 500) score += 20;
  else if (savings >= 200) score += 15;
  else if (savings >= 100) score += 10;
  else if (savings >= 30) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Fail-closed affiliate URL generation.
 *
 * A product permalink is not an affiliate URL. Do not fabricate tracking parameters:
 * the official affiliate program must return the tracked URL before publication.
 */
export function generateAuthorizedAffiliateUrl(
  permalink: string,
  mlbId: string,
  affiliateTag: string = 'boxdogarimpo-20'
): { affiliateUrl: string; isValid: boolean; trackingMethod: string } {
  const productId = typeof mlbId === 'string' ? mlbId.trim() : '';
  const tag = typeof affiliateTag === 'string' ? affiliateTag.trim() : '';
  if (!isValidMarketplaceProductUrl(permalink) || !/^MLB\d+$/i.test(productId) || !tag) {
    return { affiliateUrl: '', isValid: false, trackingMethod: 'INVALID_INPUT' };
  }

  // No official affiliate API/portal adapter is implemented in this repository yet.
  // Deliberately return no URL rather than inventing a tracking URL.
  return {
    affiliateUrl: '',
    isValid: false,
    trackingMethod: 'UNVERIFIED_OFFICIAL_AFFILIATE_INTEGRATION',
  };
}

/**
 * Returns true only when the candidate exactly matches an independently supplied
 * official URL returned by the affiliate platform. Presence of query parameters
 * or a /sec/ path is not proof of commission attribution.
 */
export function validateAffiliateUrl(
  url: string,
  affiliateTag: string = 'boxdogarimpo',
  officialUrl?: string
): boolean {
  if (!url || !officialUrl || !affiliateTag.trim()) return false;
  try {
    const candidate = new URL(url);
    const official = new URL(officialUrl);
    if (
      candidate.protocol !== 'https:' ||
      official.protocol !== 'https:' ||
      !isAllowedMarketplaceHost(candidate.hostname) ||
      !isAllowedMarketplaceHost(official.hostname) ||
      candidate.username ||
      candidate.password ||
      official.username ||
      official.password
    ) return false;

    // Exact URL equality avoids accepting a raw permalink or a modified tracking URL.
    return candidate.href === official.href && candidate.pathname.includes('/sec/');
  } catch {
    return false;
  }
}

function isValidMarketplaceProductUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' &&
      isAllowedMarketplaceHost(parsed.hostname) &&
      !parsed.username &&
      !parsed.password;
  } catch {
    return false;
  }
}

function isAllowedMarketplaceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'mercadolivre.com.br' ||
    host.endsWith('.mercadolivre.com.br') ||
    host === 'mercadolivre.com' ||
    host.endsWith('.mercadolivre.com');
}
