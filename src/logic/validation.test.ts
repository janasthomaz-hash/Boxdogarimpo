import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount, generateAuthorizedAffiliateUrl, validateAffiliateUrl } from './validation';
import { transitionOfferStatus } from './stateMachine';
import type { OfferItem, SystemConfig } from './types';

const config: SystemConfig = {
  frequencyMinutes: 15,
  globalKillSwitch: true,
  minDiscountPercent: 15,
  minOpportunityScore: 60,
  maxPriceLimit: 100000,
  affiliateTag: 'boxdogarimpo-20',
  requestRateLimitPerCycle: 30,
  cooldownDaysBetweenPosts: 7,
  priceDropThresholdPercent: 5,
  spreadsheetId: 'test-sheet',
  authorizedCategories: [],
};

const baseOffer: OfferItem = {
  id: 'test-offer',
  mlbId: 'MLB123456',
  title: 'Produto de teste',
  category: 'Teste',
  categoryId: 'test',
  currentPrice: 100,
  originalPrice: 150,
  discountPercent: 33,
  permalink: 'https://www.mercadolivre.com.br/produto/p/MLB123456',
  affiliateUrl: '',
  isAffiliateValid: false,
  affiliateVerificationStatus: 'UNVERIFIED',
  stockAvailable: true,
  sellerName: 'Vendedor teste',
  sellerReputation: 'Normal',
  freeShipping: false,
  thumbnail: '',
  opportunityScore: 50,
  stableHash: 'test-hash',
  status: 'PRODUTO_ENCONTRADO',
  discoveredAt: '2026-01-01T00:00:00.000Z',
  history: [],
};

test('calculateDiscount returns the expected genuine discount', () => {
  const result = calculateDiscount(1999, 2999);
  assert.equal(result.isValidPrice, true);
  assert.equal(result.discountPercent, 33);
  assert.equal(result.savings, 1000);
});

test('calculateDiscount rejects non-finite or invalid prices', () => {
  for (const [current, original] of [
    [Number.NaN, 100],
    [Number.POSITIVE_INFINITY, 100],
    [100, Number.NaN],
    [100, Number.POSITIVE_INFINITY],
    [0, 100],
    [-1, 100],
  ]) {
    assert.equal(calculateDiscount(current, original).isValidPrice, false);
  }
});

test('affiliate URL generator fails closed instead of fabricating tracking URLs', () => {
  const result = generateAuthorizedAffiliateUrl(
    'https://www.mercadolivre.com.br/produto/p/MLB123456',
    'MLB123456',
    config.affiliateTag,
  );
  assert.equal(result.isValid, false);
  assert.equal(result.affiliateUrl, '');
});

test('affiliate URL validation accepts only an exact independently supplied official URL', () => {
  const official = 'https://www.mercadolivre.com.br/sec/teste?matt_word=boxdogarimpo';
  assert.equal(validateAffiliateUrl(official, config.affiliateTag, official), true);
  assert.equal(validateAffiliateUrl(`${official}&extra=1`, config.affiliateTag, official), false);
  assert.equal(validateAffiliateUrl(official, config.affiliateTag), false);
  assert.equal(
    validateAffiliateUrl(
      'https://mercadolivre.com.br.attacker.example/sec/teste?matt_word=boxdogarimpo',
      config.affiliateTag,
      official,
    ),
    false,
  );
});

test('state machine rejects NaN current prices during product validation', () => {
  const result = transitionOfferStatus(
    { ...baseOffer, currentPrice: Number.NaN },
    'PRODUTO_VALIDADO',
    { systemConfig: config },
  );
  assert.equal(result.success, false);
  assert.equal(result.toStatus, 'PRODUTO_VALIDADO');
});

test('state machine blocks affiliate confirmation without official verification', () => {
  const result = transitionOfferStatus(
    { ...baseOffer, status: 'PRODUTO_VALIDADO' },
    'AFILIADO_CONFIRMADO',
    { systemConfig: config },
  );
  assert.equal(result.success, false);
  assert.equal(result.item.status, 'PRODUTO_VALIDADO');
});

test('state machine allows affiliate confirmation only with exact official URL evidence', () => {
  const official = 'https://www.mercadolivre.com.br/sec/teste?matt_word=boxdogarimpo';
  const result = transitionOfferStatus(
    {
      ...baseOffer,
      status: 'PRODUTO_VALIDADO',
      affiliateUrl: official,
      affiliateOfficialUrl: official,
      affiliateVerificationStatus: 'VERIFIED',
      isAffiliateValid: true,
    },
    'AFILIADO_CONFIRMADO',
    { systemConfig: config },
  );
  assert.equal(result.success, true);
  assert.equal(result.item.status, 'AFILIADO_CONFIRMADO');
});
