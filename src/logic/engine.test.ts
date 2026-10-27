import test from 'node:test';
import assert from 'node:assert/strict';

import { generateStableHash } from './hash';
import { calculateDiscount, calculateOpportunityScore, generateAuthorizedAffiliateUrl, validateAffiliateUrl } from './validation';
import { evaluateDeduplication, recordPriceHistory } from './deduplication';
import {
  generateIdempotentSheetCreationPayload,
  verifyMandatorySheetsPreWrite,
  auditSheetHealth,
  autoRepairMissingTabs,
} from './sheetSchema';
import { transitionOfferStatus } from './stateMachine';
import { diagnoseRawErrorText } from './errorDiagnostics';
import { calculateAuditScore } from './correctionsAudit';
import { OfferItem, SystemConfig, ChannelConfig } from './types';

const mockConfig: SystemConfig = {
  frequencyMinutes: 15,
  globalKillSwitch: true, // Emergency lock active
  minDiscountPercent: 20,
  minOpportunityScore: 60,
  maxPriceLimit: 10000,
  affiliateTag: 'boxdogarimpo-20',
  requestRateLimitPerCycle: 25,
  cooldownDaysBetweenPosts: 7,
  priceDropThresholdPercent: 5,
  spreadsheetId: 'test_sheet_123',
  authorizedCategories: [],
};

const mockItem: OfferItem = {
  id: 'TEST_01',
  mlbId: 'MLB123456789',
  title: 'Smartphone Teste 128GB',
  category: 'Telefonia',
  categoryId: 'MLB1051',
  currentPrice: 1999.0,
  originalPrice: 2999.0,
  discountPercent: 33,
  permalink: 'https://www.mercadolivre.com.br/smartphone-teste/p/MLB123456789',
  affiliateUrl: '',
  isAffiliateValid: false,
  stockAvailable: true,
  sellerName: 'Loja Oficial Teste',
  sellerReputation: 'MercadoLider Platinum',
  freeShipping: true,
  thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf',
  opportunityScore: 85,
  stableHash: '',
  status: 'PRODUTO_ENCONTRADO',
  discoveredAt: new Date().toISOString(),
  history: [],
};

test('generateStableHash produces deterministic normalized 32-char hex', () => {
  const hash1 = generateStableHash('MLB123', 'Galaxy S23 128GB!', 'Samsung Oficial');
  const hash2 = generateStableHash('mlb123', 'galaxy s23 128gb', 'samsung oficial');
  assert.equal(hash1, hash2, 'Hash must be case and punctuation invariant');
  assert.equal(hash1.length, 32, 'Hash must be 32 characters in hex format');
});

test('calculateDiscount calculates real discount and detects fake discounts', () => {
  const valid = calculateDiscount(1500, 2000);
  assert.equal(valid.discountPercent, 25);
  assert.equal(valid.isFakeDiscount, false);

  const fakeSmall = calculateDiscount(99, 100);
  assert.equal(fakeSmall.discountPercent, 1);
  assert.equal(fakeSmall.isFakeDiscount, true);

  const fakeExtreme = calculateDiscount(10, 10000);
  assert.equal(fakeExtreme.discountPercent, 100);
  assert.equal(fakeExtreme.isFakeDiscount, true);
});

test('calculateOpportunityScore awards points for discount, reputation, and free shipping', () => {
  const score = calculateOpportunityScore({
    currentPrice: 2000,
    originalPrice: 4000,
    discountPercent: 50,
    sellerReputation: 'MercadoLider Platinum',
    freeShipping: true,
    stockAvailable: true,
  });
  assert.ok(score >= 80, `Expected score >= 80, got ${score}`);
});

test('generateAuthorizedAffiliateUrl builds tracked link and validates tracking presence', () => {
  const generated = generateAuthorizedAffiliateUrl(
    'https://www.mercadolivre.com.br/produto-teste/p/MLB123',
    'MLB123',
    'boxdogarimpo-20'
  );
  assert.equal(generated.isValid, true);
  assert.ok(generated.affiliateUrl.includes('matt_tool=afiliados_boxdogarimpo'));
  assert.ok(generated.affiliateUrl.includes('matt_word=boxdogarimpo-20'));

  const isValid = validateAffiliateUrl(generated.affiliateUrl, 'boxdogarimpo');
  assert.equal(isValid, true);

  // Raw URL without affiliate parameters must fail validation
  const isRawValid = validateAffiliateUrl('https://mercadolivre.com.br/produto-teste');
  assert.equal(isRawValid, false);
});

test('evaluateDeduplication prevents duplicate post within cooldown unless price dropped', () => {
  const hash = generateStableHash(mockItem.mlbId, mockItem.title, mockItem.sellerName);
  const publishedItem: OfferItem = {
    ...mockItem,
    stableHash: hash,
    status: 'PUBLICADO',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    currentPrice: 2000,
  };

  // Same price -> must be suppressed
  const samePriceItem: OfferItem = {
    ...publishedItem,
    currentPrice: 2000,
  };
  const dec1 = evaluateDeduplication(samePriceItem, [publishedItem], {
    cooldownDays: 7,
    priceDropThresholdPercent: 5,
  });
  assert.equal(dec1.isDuplicate, true);
  assert.equal(dec1.action, 'SUPPRESS_IDENTICAL');

  // Price dropped by 10% (from 2000 to 1800) -> must be allowed as price drop
  const droppedItem: OfferItem = {
    ...publishedItem,
    currentPrice: 1800,
  };
  const dec2 = evaluateDeduplication(droppedItem, [publishedItem], {
    cooldownDays: 7,
    priceDropThresholdPercent: 5,
  });
  assert.equal(dec2.isDuplicate, false);
  assert.equal(dec2.action, 'UPDATE_PRICE_DROP');
});

test('recordPriceHistory appends events non-destructively', () => {
  const item: OfferItem = {
    ...mockItem,
    currentPrice: 2000,
    history: [{ timestamp: '2026-10-01T00:00:00Z', price: 2200, originalPrice: 3000, discountPercent: 26, source: 'ML' }],
  };

  const updated = recordPriceHistory(item, 1900, 3000, 'Ciclo 2');
  assert.equal(updated.currentPrice, 1900);
  assert.equal(updated.history.length, 2);
  assert.equal(updated.history[0].price, 1900);
  assert.equal(updated.history[1].price, 2200);
});

test('generateIdempotentSheetCreationPayload prevents duplicate sheet creation in Make Module 32', () => {
  const existingSheets = ['Página1', 'CONFIG', 'OFERTAS'];
  const result = generateIdempotentSheetCreationPayload(existingSheets);

  assert.deepEqual(result.existingTabs.sort(), ['CONFIG', 'OFERTAS'].sort());
  assert.deepEqual(result.missingTabs.sort(), ['CANAIS', 'HISTORICO', 'LOGS'].sort());
  // Must NOT include CONFIG or OFERTAS in safeGoogleSheetsRequests
  assert.equal(result.safeGoogleSheetsRequests.length, 3);
  const titlesCreated = result.safeGoogleSheetsRequests.map((r) => r.addSheet?.properties.title);
  assert.ok(!titlesCreated.includes('CONFIG'));
  assert.ok(!titlesCreated.includes('OFERTAS'));
});

test('verifyMandatorySheetsPreWrite blocks writes when mandatory tabs are missing', () => {
  // Scenario 1: Only Página1 and CONFIG exist (as in Make failed state)
  const check1 = verifyMandatorySheetsPreWrite(['Página1', 'CONFIG']);
  assert.equal(check1.canWrite, false, 'Write must be blocked if tabs are missing');
  assert.equal(check1.status, 'BLOCKED_MISSING_TABS');
  assert.deepEqual(check1.missingTabs.sort(), ['CANAIS', 'HISTORICO', 'LOGS', 'OFERTAS'].sort());
  assert.equal(check1.hasOriginalPagina1, true);
  // safeGoogleSheetsRequests must only request the 4 missing tabs, NEVER CONFIG or Página1
  assert.equal(check1.safeGoogleSheetsRequests.length, 4);
  const requested = check1.safeGoogleSheetsRequests.map((r) => r.addSheet?.properties.title);
  assert.ok(!requested.includes('CONFIG'), 'Must not recreate CONFIG');
  assert.ok(!requested.includes('Página1'), 'Must not recreate Página1');
});

test('verifyMandatorySheetsPreWrite unlocks writes when all 5 mandatory tabs exist', () => {
  // Scenario 2: All 5 tabs + Página1 exist
  const check2 = verifyMandatorySheetsPreWrite(['Página1', 'CONFIG', 'OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS']);
  assert.equal(check2.canWrite, true, 'Write must be allowed when all 5 tabs exist');
  assert.equal(check2.status, 'READY_FOR_WRITE');
  assert.equal(check2.missingTabs.length, 0);
  assert.equal(check2.safeGoogleSheetsRequests.length, 0, 'No addSheet requests should be emitted when all tabs exist');
  assert.equal(check2.hasOriginalPagina1, true);
  assert.ok(check2.message.includes('liberadas'));
});

test('transitionOfferStatus enforces emergency kill switch and channel authorization', () => {
  // Step 1: Validate found item
  const validItem: OfferItem = { ...mockItem, discountPercent: 30, stockAvailable: true };
  const res1 = transitionOfferStatus(validItem, 'PRODUTO_VALIDADO', { systemConfig: mockConfig });
  assert.equal(res1.success, true);
  assert.equal(res1.item.status, 'PRODUTO_VALIDADO');

  // Step 2: Confirm affiliate
  const affiliateGen = generateAuthorizedAffiliateUrl(validItem.permalink, validItem.mlbId, 'boxdogarimpo-20');
  const withAffiliate: OfferItem = {
    ...res1.item,
    affiliateUrl: affiliateGen.affiliateUrl,
    isAffiliateValid: true,
  };
  const res2 = transitionOfferStatus(withAffiliate, 'AFILIADO_CONFIRMADO', { systemConfig: mockConfig });
  assert.equal(res2.success, true);

  // Step 3: Approve for publication
  const res3 = transitionOfferStatus(res2.item, 'APROVADO_PUBLICACAO', { systemConfig: mockConfig });
  assert.equal(res3.success, true);

  // Step 4: Attempt to publish while globalKillSwitch is TRUE -> MUST BE BLOCKED
  const res4 = transitionOfferStatus(res3.item, 'PUBLICADO', {
    systemConfig: { ...mockConfig, globalKillSwitch: true },
    channels: [{ id: 'C1', name: 'Telegram', targetId: '@boxdogarimpo', type: 'telegram', status: 'ATIVO', isPublishAuthorized: true, messageTemplate: '' }],
  });
  assert.equal(res4.success, false, 'Publishing must fail when kill switch is active');
  assert.ok(res4.message.includes('BLOQUEIO DE SEGURANÇA'));

  // Step 5: Publish when killSwitch is disabled and channel is authorized -> MUST SUCCEED
  const res5 = transitionOfferStatus(res3.item, 'PUBLICADO', {
    systemConfig: { ...mockConfig, globalKillSwitch: false },
    channels: [{ id: 'C1', name: 'Telegram', targetId: '@boxdogarimpo', type: 'telegram', status: 'ATIVO', isPublishAuthorized: true, messageTemplate: '' }],
  });
  assert.equal(res5.success, true, 'Publishing must succeed with killswitch disabled and channel authorized');
  assert.equal(res5.item.status, 'PUBLICADO');
});

test('diagnoseRawErrorText accurately matches Make Module 32 duplicate sheet error', () => {
  const { matchedErrors } = diagnoseRawErrorText(
    'Error 400: A sheet with that name already exists in Module 32'
  );
  const found = matchedErrors.some((e: any) => e.id === 'ERR_MOD32_DUPLICATE_SHEET');
  assert.equal(found, true, 'Must identify Module 32 duplicate sheet error');
});

test('diagnoseRawErrorText detects affiliate unmonetized URL issues', () => {
  const { matchedErrors } = diagnoseRawErrorText(
    'O link de afiliado não gerou comissão e não tem matt_tool'
  );
  const found = matchedErrors.some((e: any) => e.id === 'ERR_AFFILIATE_UNTRACKED_URL');
  assert.equal(found, true, 'Must identify untracked affiliate link issue');
});

test('calculateAuditScore returns 100% homologated and PRONTO_PARA_PRODUCAO', () => {
  const score = calculateAuditScore();
  assert.equal(score.percentage, 100);
  assert.equal(score.readinessLevel, 'PRONTO_PARA_PRODUCAO');
  assert.equal(score.homologatedItems, score.totalItems);
});

test('auditSheetHealth correctly audits mandatory tabs and flags critical missing ones', () => {
  // Scenario 1: Only Página1 and CONFIG exist -> 4 tabs missing, health is 20%
  const audit1 = auditSheetHealth(['Página1', 'CONFIG']);
  assert.equal(audit1.healthScorePct, 20);
  assert.equal(audit1.status, 'CRITICAL');
  assert.equal(audit1.missingTabs.length, 4);
  assert.deepEqual(audit1.missingTabs, ['OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS']);
  assert.equal(audit1.hasLegacyPagina1, true);

  // Scenario 2: Partial failure (CANAIS and LOGS missing) -> health is 60%
  const audit2 = auditSheetHealth(['Página1', 'CONFIG', 'OFERTAS', 'HISTORICO']);
  assert.equal(audit2.healthScorePct, 60);
  assert.equal(audit2.status, 'DEGRADED');
  assert.deepEqual(audit2.missingTabs, ['CANAIS', 'LOGS']);

  // Scenario 3: All 5 tabs exist -> 100% HEALTHY
  const audit3 = auditSheetHealth(['Página1', 'CONFIG', 'OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS']);
  assert.equal(audit3.healthScorePct, 100);
  assert.equal(audit3.status, 'HEALTHY');
  assert.equal(audit3.missingTabs.length, 0);
  assert.equal(audit3.existingMandatoryCount, 5);
});

test('autoRepairMissingTabs immediately restores missing tabs idempotently', () => {
  // Scenario: Starting with only Página1 and CONFIG
  const initialTabs = ['Página1', 'CONFIG'];
  const repair = autoRepairMissingTabs(initialTabs);

  assert.equal(repair.success, true);
  assert.equal(repair.repairedTabs.length, 4);
  assert.deepEqual(repair.repairedTabs, ['OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS']);
  
  // All 5 mandatory tabs + Página1 must be in updatedSheetNames
  assert.equal(repair.updatedSheetNames.length, 6);
  assert.ok(repair.updatedSheetNames.includes('CONFIG'));
  assert.ok(repair.updatedSheetNames.includes('OFERTAS'));
  assert.ok(repair.updatedSheetNames.includes('HISTORICO'));
  assert.ok(repair.updatedSheetNames.includes('CANAIS'));
  assert.ok(repair.updatedSheetNames.includes('LOGS'));
  assert.ok(repair.updatedSheetNames.includes('Página1'));

  // Running autoRepair again when all tabs exist should do nothing
  const secondRepair = autoRepairMissingTabs(repair.updatedSheetNames);
  assert.equal(secondRepair.repairedTabs.length, 0);
  assert.equal(secondRepair.updatedSheetNames.length, 6);
});


