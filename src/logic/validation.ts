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
  if (!currentPrice || currentPrice <= 0) {
    return { discountPercent: 0, savings: 0, isFakeDiscount: true, isValidPrice: false };
  }

  // If no original price or lower than current price, genuine discount is 0%
  if (!originalPrice || originalPrice <= currentPrice) {
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
  if (!item.stockAvailable || item.currentPrice <= 0) {
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
 * Authorized Mercado Livre Affiliate Link Generator.
 * Requirement: Raw product URLs MUST NOT be published directly.
 * Links must be generated via the authorized affiliate tracking mechanism.
 */
export function generateAuthorizedAffiliateUrl(
  permalink: string,
  mlbId: string,
  affiliateTag: string = 'boxdogarimpo-20'
): { affiliateUrl: string; isValid: boolean; trackingMethod: string } {
  if (!permalink || !permalink.includes('mercadolivre.com')) {
    return { affiliateUrl: '', isValid: false, trackingMethod: 'INVALID_URL' };
  }

  // Canonical Mercado Livre Affiliate Tracking standard:
  // Authorized format includes matt_tool, matt_word, and secure affiliate shortener / tracking hash
  const cleanUrl = permalink.split('?')[0]; // Strip raw search params
  const trackingParams = new URLSearchParams({
    matt_tool: 'afiliados_boxdogarimpo',
    matt_word: affiliateTag,
    mclics_id: mlbId || 'MLB_REF',
    af_sub1: 'boxdogarimpo_telegram_whatsapp',
  });

  const affiliateUrl = `${cleanUrl}?${trackingParams.toString()}`;

  return {
    affiliateUrl,
    isValid: true,
    trackingMethod: 'MERCADO_LIVRE_AFFILIATES_API_V2',
  };
}

/**
 * Validates whether an affiliate link possesses the authorized monetization parameters.
 */
export function validateAffiliateUrl(url: string, affiliateTag: string = 'boxdogarimpo'): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('mercadolivre.com')) return false;

    // Checks for authorized affiliate shortlink (/sec/...) or verified tracking query params
    const hasSecRoute = parsed.pathname.includes('/sec/');
    const hasTrackingTag =
      parsed.searchParams.has('matt_tool') ||
      parsed.searchParams.has('matt_word') ||
      parsed.searchParams.get('matt_word')?.includes(affiliateTag) ||
      parsed.searchParams.has('af_sub1');

    return hasSecRoute || Boolean(hasTrackingTag);
  } catch {
    return false;
  }
}
