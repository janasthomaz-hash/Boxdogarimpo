export type OfferStatus =
  | 'PRODUTO_ENCONTRADO'
  | 'PRODUTO_VALIDADO'
  | 'AFILIADO_CONFIRMADO'
  | 'APROVADO_PUBLICACAO'
  | 'PUBLICADO'
  | 'REJEITADO'
  | 'EXPIRADO';

export interface PriceHistoryEntry {
  timestamp: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  source: string;
  notes?: string;
}

export interface OfferItem {
  id: string; // Internal unique ID
  mlbId: string; // Mercado Livre ID e.g. MLB342910482
  title: string;
  category: string;
  categoryId: string;
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  permalink: string;
  affiliateUrl: string;
  isAffiliateValid: boolean;
  stockAvailable: boolean;
  sellerName: string;
  sellerReputation: 'MercadoLider Platinum' | 'MercadoLider Gold' | 'MercadoLider' | 'Normal';
  freeShipping: boolean;
  installments?: string;
  thumbnail: string;
  opportunityScore: number; // 0 to 100
  stableHash: string;
  status: OfferStatus;
  rejectionReason?: string;
  discoveredAt: string;
  validatedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  history: PriceHistoryEntry[];
}

export interface ChannelConfig {
  id: string;
  name: string;
  targetId: string; // e.g. "boxdogarimpo" or "@boxdogarimpo"
  directUrl?: string; // Direct invite or join link
  type: 'telegram' | 'whatsapp' | 'instagram' | 'shopee' | 'shein';
  status: 'ATIVO' | 'HOMOLOGADO_TESTE' | 'CONECTADO_DIVULGACAO' | 'INTEGRACAO_FUTURA' | 'DESCONECTADO';
  isPublishAuthorized: boolean;
  lastTestAt?: string;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  messageTemplate: string;
}

export interface SystemConfig {
  frequencyMinutes: number; // 15 by default
  globalKillSwitch: boolean; // TRUE = BLOQUEADO / INATIVO (safe default); FALSE = PUBLICACAO LIBERADA
  minDiscountPercent: number; // e.g. 15%
  minOpportunityScore: number; // e.g. 60
  maxPriceLimit: number;
  affiliateTag: string; // e.g. "boxdogarimpo-20"
  requestRateLimitPerCycle: number; // e.g. 30 requests to prevent Make credit exhaust
  cooldownDaysBetweenPosts: number; // 7 days
  priceDropThresholdPercent: number; // 5% drop to allow re-post
  spreadsheetId: string;
  authorizedCategories: Array<{
    id: string;
    name: string;
    enabled: boolean;
    searchQuery: string;
  }>;
}

export interface SheetTabDefinition {
  name: string;
  purpose: string;
  headers: string[];
  sampleRow: Record<string, any>;
  isProtected?: boolean;
}

export interface MandatoryTestItem {
  id: number;
  name: string;
  description: string;
  expectedResult: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  details?: string;
  timestamp?: string;
}

export interface PipelineExecutionLog {
  id: string;
  timestamp: string;
  stage: 'CONFIG' | 'COLETA' | 'VALIDACAO' | 'DEDUPLICACAO' | 'APROVACAO' | 'PUBLICACAO' | 'SISTEMA';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  metadata?: Record<string, any>;
}
