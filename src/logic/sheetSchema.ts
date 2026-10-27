import { SheetTabDefinition, OfferItem, ChannelConfig, SystemConfig } from './types';

export const SHEET_TAB_DEFINITIONS: Record<string, SheetTabDefinition> = {
  CONFIG: {
    name: 'CONFIG',
    purpose: 'Parâmetros, categorias elegíveis, limites e interruptor geral de publicação',
    headers: [
      'CHAVE',
      'VALOR',
      'TIPO',
      'DESCRICAO',
      'ULTIMA_ATUALIZACAO',
    ],
    sampleRow: {
      CHAVE: 'INTERRUPTOR_GERAL_PUBLICACAO',
      VALOR: 'BLOQUEADO',
      TIPO: 'BOOLEAN',
      DESCRICAO: 'Trava de emergência. Apenas publica se estiver LIBERADO.',
      ULTIMA_ATUALIZACAO: new Date().toISOString(),
    },
  },
  OFERTAS: {
    name: 'OFERTAS',
    purpose: 'Cadastro consolidado das ofertas e seu estado de validação/publicação',
    headers: [
      'MLB_ID',
      'HASH_ESTAVEL',
      'TITULO',
      'CATEGORIA',
      'PRECO_ATUAL',
      'PRECO_ORIGINAL',
      'DESCONTO_PCT',
      'SCORE_OPORTUNIDADE',
      'LINK_AFILIADO_VALIDADO',
      'STATUS_ATUAL',
      'REPUTACAO_VENDEDOR',
      'FRETE_GRATIS',
      'DATA_COLETA',
      'DATA_PUBLICACAO',
    ],
    sampleRow: {
      MLB_ID: 'MLB384910291',
      HASH_ESTAVEL: 'a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
      TITULO: 'Smartphone Samsung Galaxy S23 128GB Preto',
      CATEGORIA: 'Telefonia',
      PRECO_ATUAL: 2699.0,
      PRECO_ORIGINAL: 4499.0,
      DESCONTO_PCT: 40,
      SCORE_OPORTUNIDADE: 92,
      LINK_AFILIADO_VALIDADO: 'https://mercadolivre.com.br/sec/boxdogarimpo_s23',
      STATUS_ATUAL: 'APROVADO_PUBLICACAO',
      REPUTACAO_VENDEDOR: 'MercadoLider Platinum',
      FRETE_GRATIS: 'SIM',
      DATA_COLETA: new Date().toISOString(),
      DATA_PUBLICACAO: '',
    },
  },
  HISTORICO: {
    name: 'HISTORICO',
    purpose: 'Evolução de preços, eventos de queda e histórico de coletas',
    headers: [
      'ID_EVENTO',
      'MLB_ID',
      'PRECO_REGISTRADO',
      'PRECO_ANTERIOR',
      'VARIACAO_PCT',
      'TIPO_EVENTO',
      'DATA_HORA',
      'OBSERVACOES',
    ],
    sampleRow: {
      ID_EVENTO: 'HIST_001',
      MLB_ID: 'MLB384910291',
      PRECO_REGISTRADO: 2699.0,
      PRECO_ANTERIOR: 2999.0,
      VARIACAO_PCT: -10.0,
      TIPO_EVENTO: 'QUEDA_DE_PRECO',
      DATA_HORA: new Date().toISOString(),
      OBSERVACOES: 'Preço caiu abaixo do mínimo histórico de 30 dias',
    },
  },
  CANAIS: {
    name: 'CANAIS',
    purpose: 'Canais de destino, estado das conexões e autorização explícita',
    headers: [
      'CANAL_ID',
      'NOME_CANAL',
      'DESTINO',
      'STATUS_CONEXAO',
      'AUTORIZADO_PUBLICAR',
      'ULTIMO_TESTE_DATA',
      'RESULTADO_TESTE',
    ],
    sampleRow: {
      CANAL_ID: 'TELEGRAM_01',
      NOME_CANAL: 'Canal Oficial Telegram',
      DESTINO: 'https://t.me/boost?c=4290067522',
      STATUS_CONEXAO: 'HOMOLOGADO_TESTE',
      AUTORIZADO_PUBLICAR: 'NAO',
      ULTIMO_TESTE_DATA: new Date().toISOString(),
      RESULTADO_TESTE: 'MENSAGEM_ENTREGUE',
    },
  },
  LOGS: {
    name: 'LOGS',
    purpose: 'Execuções, erros, resultados e créditos consumidos no Make',
    headers: [
      'EXECUCAO_ID',
      'TIMESTAMP',
      'MODULO',
      'NIVEL',
      'CREDITOS_MAKE',
      'MENSAGEM',
      'DETALHES_JSON',
    ],
    sampleRow: {
      EXECUCAO_ID: 'EXEC_MAKE_10492',
      TIMESTAMP: new Date().toISOString(),
      MODULO: 'Modulo 1 - HTTP ML',
      NIVEL: 'INFO',
      CREDITOS_MAKE: 1,
      MENSAGEM: 'Consulta executada para categoria Telefonia: 18 ofertas encontradas.',
      DETALHES_JSON: '{"status": 200, "items_count": 18}',
    },
  },
  Pagina1: {
    name: 'Página1',
    purpose: 'Aba original preexistente do Google Sheets (PRESERVADA intocada)',
    headers: ['Coluna A', 'Coluna B', 'Coluna C', 'Dados Anteriores', 'Data'],
    sampleRow: {
      'Coluna A': 'Registro legado 1',
      'Coluna B': 'Histórico importado',
      'Coluna C': 'Ativo',
      'Dados Anteriores': 'Preservado pelo agente sem alteração destrutiva',
      Data: '2026-03-01',
    },
    isProtected: true,
  },
};

export const MANDATORY_SHEET_TABS = ['CONFIG', 'OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS'] as const;
export type MandatorySheetTab = typeof MANDATORY_SHEET_TABS[number];

export interface PreWriteSheetVerificationResult {
  canWrite: boolean;
  missingTabs: string[];
  existingMandatoryTabs: string[];
  hasOriginalPagina1: boolean;
  totalExistingCount: number;
  status: 'READY_FOR_WRITE' | 'BLOCKED_MISSING_TABS';
  message: string;
  safeGoogleSheetsRequests: Array<{
    addSheet?: {
      properties: { title: string; gridProperties?: { rowCount: number; columnCount: number } };
    };
  }>;
}

/**
 * Pre-write gate for Google Sheets operations.
 * Strictly verifies the existence of all 5 mandatory tabs (CONFIG, OFERTAS, HISTORICO, CANAIS, LOGS)
 * before permitting any write, append, or update operation.
 * Also verifies that Página1 is preserved.
 * Prevents Make Module 32 from throwing 400 Bad Request by never attempting to recreate existing sheets.
 */
export function verifyMandatorySheetsPreWrite(existingSheetNames: string[]): PreWriteSheetVerificationResult {
  const normalizedExisting = existingSheetNames.map((s) => s.trim().toLowerCase());
  const existingSet = new Set(normalizedExisting);

  const missingTabs: string[] = [];
  const existingMandatoryTabs: string[] = [];

  for (const tab of MANDATORY_SHEET_TABS) {
    if (existingSet.has(tab.toLowerCase())) {
      existingMandatoryTabs.push(tab);
    } else {
      missingTabs.push(tab);
    }
  }

  const hasOriginalPagina1 = normalizedExisting.some((s) => s === 'página1' || s === 'pagina1');
  const canWrite = missingTabs.length === 0;

  // Build safe idempotent creation requests ONLY for missing tabs
  const safeGoogleSheetsRequests = missingTabs.map((tabName) => ({
    addSheet: {
      properties: {
        title: tabName,
        gridProperties: {
          rowCount: 1000,
          columnCount: SHEET_TAB_DEFINITIONS[tabName]?.headers.length || 15,
        },
      },
    },
  }));

  let message = '';
  if (canWrite) {
    message = 'Verificação pré-escrita aprovada: todas as 5 abas obrigatórias (CONFIG, OFERTAS, HISTORICO, CANAIS, LOGS) existem. Operações de gravação liberadas.';
  } else {
    message = `Operações de escrita bloqueadas! As seguintes abas obrigatórias não foram encontradas na planilha: [${missingTabs.join(', ')}]. É obrigatório criá-las de forma idempotente antes de permitir gravações.`;
  }

  return {
    canWrite,
    missingTabs,
    existingMandatoryTabs,
    hasOriginalPagina1,
    totalExistingCount: existingSheetNames.length,
    status: canWrite ? 'READY_FOR_WRITE' : 'BLOCKED_MISSING_TABS',
    message,
    safeGoogleSheetsRequests,
  };
}

/**
 * Calculates idempotent Google Sheets batchUpdate request:
 * checks existing tab names and ONLY emits AddSheet requests for missing ones!
 * This specifically eliminates the critical crash risk in Make Module 32.
 */
export function generateIdempotentSheetCreationPayload(existingSheetNames: string[]): {
  missingTabs: string[];
  existingTabs: string[];
  safeGoogleSheetsRequests: Array<{
    addSheet?: {
      properties: { title: string; gridProperties?: { rowCount: number; columnCount: number } };
    };
  }>;
  isSafeToExecute: boolean;
  explanation: string;
} {
  const targetTabs = ['CONFIG', 'OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS'];
  const existingSet = new Set(existingSheetNames.map((s) => s.trim().toLowerCase()));

  const missingTabs: string[] = [];
  const existingTabs: string[] = [];

  for (const tab of targetTabs) {
    if (existingSet.has(tab.toLowerCase())) {
      existingTabs.push(tab);
    } else {
      missingTabs.push(tab);
    }
  }

  const safeRequests = missingTabs.map((tabName) => ({
    addSheet: {
      properties: {
        title: tabName,
        gridProperties: {
          rowCount: 1000,
          columnCount: SHEET_TAB_DEFINITIONS[tabName]?.headers.length || 15,
        },
      },
    },
  }));

  let explanation = '';
  if (missingTabs.length === 0) {
    explanation = 'Todas as 5 abas estruturadas já existem na planilha. Nenhuma criação necessária. O Módulo 32 do Make não deve emitir addSheet.';
  } else if (existingTabs.length > 0) {
    explanation = `Atenção: Abas [${existingTabs.join(', ')}] já existem! Se o Make tentar criá-las de novo, a API do Google Sheets gerará erro 400 (DuplicateSheetName). Apenas [${missingTabs.join(', ')}] serão criadas.`;
  } else {
    explanation = `Planilha limpa: Criando as abas [${missingTabs.join(', ')}] de forma segura mantendo a Página1 intocada.`;
  }

  return {
    missingTabs,
    existingTabs,
    safeGoogleSheetsRequests: safeRequests,
    isSafeToExecute: true,
    explanation,
  };
}

export interface SheetHealthAuditResult {
  healthScorePct: number; // 0 to 100
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  missingTabs: string[];
  healthyTabs: string[];
  totalMandatory: number;
  existingMandatoryCount: number;
  hasLegacyPagina1: boolean;
  recommendations: string[];
}

/**
 * Pure audit function for sheet health:
 * Evaluates mandatory tabs (CONFIG, OFERTAS, HISTORICO, CANAIS, LOGS) and Página1.
 */
export function auditSheetHealth(existingSheetNames: string[]): SheetHealthAuditResult {
  const normalizedExisting = existingSheetNames.map((s) => s.trim().toLowerCase());
  const existingSet = new Set(normalizedExisting);

  const missingTabs: string[] = [];
  const healthyTabs: string[] = [];

  for (const tab of MANDATORY_SHEET_TABS) {
    if (existingSet.has(tab.toLowerCase())) {
      healthyTabs.push(tab);
    } else {
      missingTabs.push(tab);
    }
  }

  const hasLegacyPagina1 = normalizedExisting.some((s) => s === 'página1' || s === 'pagina1');
  const existingMandatoryCount = healthyTabs.length;
  const totalMandatory = MANDATORY_SHEET_TABS.length;
  const healthScorePct = Math.round((existingMandatoryCount / totalMandatory) * 100);

  let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
  if (missingTabs.length === totalMandatory) {
    status = 'CRITICAL';
  } else if (missingTabs.length > 0) {
    status = missingTabs.length >= 3 ? 'CRITICAL' : 'DEGRADED';
  }

  const recommendations: string[] = [];
  if (missingTabs.length > 0) {
    recommendations.push(
      `Executar Auto-Repair imediatamente para recriar as abas ausentes: [${missingTabs.join(', ')}].`
    );
  }
  if (!hasLegacyPagina1) {
    recommendations.push('Aba legada Página1 não foi detectada. Verifique se foi renomeada ou removida externamente.');
  } else {
    recommendations.push('Aba legada Página1 preservada com segurança.');
  }

  return {
    healthScorePct,
    status,
    missingTabs,
    healthyTabs,
    totalMandatory,
    existingMandatoryCount,
    hasLegacyPagina1,
    recommendations,
  };
}

/**
 * Pure Auto-Repair function:
 * Recreates missing mandatory tabs idempotently without duplicating existing ones.
 */
export function autoRepairMissingTabs(existingSheetNames: string[]): {
  repairedTabs: string[];
  updatedSheetNames: string[];
  success: boolean;
} {
  const audit = auditSheetHealth(existingSheetNames);
  if (audit.missingTabs.length === 0) {
    return {
      repairedTabs: [],
      updatedSheetNames: [...existingSheetNames],
      success: true,
    };
  }

  const updatedSheetNames = [...existingSheetNames, ...audit.missingTabs];
  return {
    repairedTabs: audit.missingTabs,
    updatedSheetNames,
    success: true,
  };
}

