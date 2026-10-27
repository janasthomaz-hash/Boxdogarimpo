import { OfferItem, PriceHistoryEntry } from './types';

export interface DeduplicationDecision {
  isDuplicate: boolean;
  action: 'PROCESS_NEW' | 'UPDATE_PRICE_DROP' | 'SUPPRESS_IDENTICAL' | 'MERGE_HISTORY';
  reason: string;
  previousPrice?: number;
  priceDifferencePercent?: number;
}

/**
 * Evaluates an incoming candidate offer against the existing database / sheet of offers.
 */
export function evaluateDeduplication(
  candidate: OfferItem,
  existingOffers: OfferItem[],
  options: {
    cooldownDays: number;
    priceDropThresholdPercent: number; // e.g. 5%
  } = { cooldownDays: 7, priceDropThresholdPercent: 5 }
): DeduplicationDecision {
  // Find matching existing offer by stable hash or canonical MLB id
  const existing = existingOffers.find(
    (item) => item.stableHash === candidate.stableHash || item.mlbId === candidate.mlbId
  );

  if (!existing) {
    return {
      isDuplicate: false,
      action: 'PROCESS_NEW',
      reason: 'Nova oferta não registrada no histórico.',
    };
  }

  const prevPrice = existing.currentPrice;
  const newPrice = candidate.currentPrice;
  const priceDiff = prevPrice > 0 ? ((prevPrice - newPrice) / prevPrice) * 100 : 0;

  // If previous item was published
  if (existing.status === 'PUBLICADO') {
    const publishedTime = existing.publishedAt ? new Date(existing.publishedAt).getTime() : 0;
    const nowTime = Date.now();
    const daysSincePublish = (nowTime - publishedTime) / (1000 * 60 * 60 * 24);

    // If price dropped significantly (e.g. >= 5%), it is a real new opportunity
    if (priceDiff >= options.priceDropThresholdPercent) {
      return {
        isDuplicate: false,
        action: 'UPDATE_PRICE_DROP',
        reason: `Queda de preço expressiva detectada: R$ ${prevPrice.toFixed(2)} → R$ ${newPrice.toFixed(2)} (-${priceDiff.toFixed(1)}%). Elegível para reavaliação.`,
        previousPrice: prevPrice,
        priceDifferencePercent: priceDiff,
      };
    }

    // Still within cooldown period and price hasn't dropped
    if (daysSincePublish < options.cooldownDays) {
      return {
        isDuplicate: true,
        action: 'SUPPRESS_IDENTICAL',
        reason: `Oferta já publicada há ${daysSincePublish.toFixed(1)} dias com preço equivalente. Cooldown ativo de ${options.cooldownDays} dias para evitar spam.`,
        previousPrice: prevPrice,
        priceDifferencePercent: priceDiff,
      };
    }
  }

  // If item is pending validation or approval, merge history rather than creating duplicate row
  return {
    isDuplicate: true,
    action: 'MERGE_HISTORY',
    reason: `Oferta já presente na fila (Estado atual: ${existing.status}). Histórico de preço atualizado sem duplicar linha.`,
    previousPrice: prevPrice,
    priceDifferencePercent: priceDiff,
  };
}

/**
 * Appends a new price observation to the item's historical record without overwriting previous data.
 */
export function recordPriceHistory(
  existingItem: OfferItem,
  newPrice: number,
  originalPrice: number,
  source: string = 'Mercado Livre API'
): OfferItem {
  const newEntry: PriceHistoryEntry = {
    timestamp: new Date().toISOString(),
    price: newPrice,
    originalPrice,
    discountPercent:
      originalPrice > newPrice ? Math.round(((originalPrice - newPrice) / originalPrice) * 100) : 0,
    source,
    notes:
      existingItem.currentPrice !== newPrice
        ? `Preço variou de R$ ${existingItem.currentPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}`
        : 'Verificação periódica de preço mantido',
  };

  return {
    ...existingItem,
    currentPrice: newPrice,
    originalPrice: originalPrice || existingItem.originalPrice,
    discountPercent: newEntry.discountPercent,
    history: [newEntry, ...(existingItem.history || [])],
  };
}
