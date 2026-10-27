import { SHEET_TAB_DEFINITIONS, MANDATORY_SHEET_TABS } from './sheetSchema';
import { OfferItem, ChannelConfig, SystemConfig, PipelineExecutionLog } from './types';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface LiveSheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface LiveSpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  tabs: LiveSheetTabInfo[];
  tabNames: string[];
}

/**
 * List spreadsheets available in user's Google Drive.
 */
export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime%20desc&pageSize=50`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao consultar Google Drive: HTTP ${response.status}`
    );
  }

  const data = await response.json();
  return (data.files || []) as DriveSpreadsheetFile[];
}

/**
 * Fetch spreadsheet metadata and list of sheet tabs.
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<LiveSpreadsheetInfo> {
  const cleanId = spreadsheetId.trim();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?includeGridData=false`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao acessar planilha ${cleanId}: HTTP ${response.status}`
    );
  }

  const data = await response.json();
  const tabs: LiveSheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title || 'Sem Nome',
    index: s.properties?.index || 0,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    spreadsheetId: cleanId,
    title: data.properties?.title || 'Planilha Sem Título',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    tabs,
    tabNames: tabs.map((t) => t.title),
  };
}

/**
 * Creates a brand new Google Spreadsheet in the user's Drive, pre-configured with the 5 mandatory tabs
 * and header schemas.
 */
export async function createOfficialSpreadsheet(
  accessToken: string,
  title: string = 'BOX DO GARIMPO — Base Oficial de Ofertas'
): Promise<LiveSpreadsheetInfo> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const body = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Página1' } },
      ...MANDATORY_SHEET_TABS.map((tabName) => ({
        properties: {
          title: tabName,
          gridProperties: {
            rowCount: 1000,
            columnCount: SHEET_TAB_DEFINITIONS[tabName]?.headers.length || 15,
          },
        },
      })),
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao criar nova planilha: HTTP ${response.status}`
    );
  }

  const created = await response.json();
  const createdId = created.spreadsheetId;

  // Initialize headers for each created tab
  await initializeHeaders(accessToken, createdId);

  return getSpreadsheetDetails(accessToken, createdId);
}

/**
 * Initializes header rows for all mandatory tabs.
 */
export async function initializeHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const data = MANDATORY_SHEET_TABS.map((tabName) => {
    const headers = SHEET_TAB_DEFINITIONS[tabName]?.headers || [];
    return {
      range: `${tabName}!A1:${String.fromCharCode(64 + headers.length)}1`,
      values: [headers],
    };
  });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data,
    }),
  });

  if (!response.ok) {
    console.warn('Cabeçalhos não puderam ser inicializados totalmente:', await response.text());
  }
}

/**
 * Safely adds missing tabs to an existing Google Spreadsheet without duplicating any existing tab!
 * (Pure idempotent batchUpdate).
 */
export async function repairMissingTabsInSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  missingTabs: string[]
): Promise<LiveSpreadsheetInfo> {
  if (missingTabs.length === 0) {
    return getSpreadsheetDetails(accessToken, spreadsheetId);
  }

  const requests = missingTabs.map((tabName) => ({
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

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao reparar abas na planilha: HTTP ${response.status}`
    );
  }

  // Write headers for the newly added tabs
  const data = missingTabs.map((tabName) => {
    const headers = SHEET_TAB_DEFINITIONS[tabName]?.headers || [];
    return {
      range: `${tabName}!A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`,
      values: [headers],
    };
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data,
    }),
  }).catch(() => null);

  return getSpreadsheetDetails(accessToken, spreadsheetId);
}

/**
 * Reads range values from a Google Spreadsheet.
 */
export async function readSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao ler intervalo ${range}: HTTP ${response.status}`
    );
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Synchronize full application data into the live Google Sheet.
 */
export async function syncAllDataToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  payload: {
    config: SystemConfig;
    offers: OfferItem[];
    channels: ChannelConfig[];
    logs: PipelineExecutionLog[];
  }
): Promise<{ updatedTabs: string[]; totalRecords: number }> {
  const { config, offers, channels, logs } = payload;
  const updates: Array<{ range: string; values: any[][] }> = [];

  // 1. CONFIG Tab
  const configRows = [
    SHEET_TAB_DEFINITIONS.CONFIG.headers,
    [
      'INTERRUPTOR_GERAL_PUBLICACAO',
      config.globalKillSwitch ? 'BLOQUEADO' : 'LIBERADO',
      'BOOLEAN',
      'Trava de emergência. Apenas publica se estiver LIBERADO.',
      new Date().toISOString(),
    ],
    [
      'FREQUENCIA_MINUTOS',
      config.frequencyMinutes.toString(),
      'NUMBER',
      'Periodicidade oficial do ciclo de coleta',
      new Date().toISOString(),
    ],
    [
      'DESCONTO_MINIMO_PCT',
      `${config.minDiscountPercent}%`,
      'NUMBER',
      'Margem mínima de oportunidade',
      new Date().toISOString(),
    ],
    [
      'TAG_AFILIADO_ML',
      config.affiliateTag,
      'STRING',
      'Tag de rastreamento comissão Mercado Livre',
      new Date().toISOString(),
    ],
    [
      'RATE_LIMIT_POR_CICLO',
      config.requestRateLimitPerCycle.toString(),
      'NUMBER',
      'Limite de requisições anti-exaustão de créditos',
      new Date().toISOString(),
    ],
  ];
  updates.push({
    range: 'CONFIG!A1:E6',
    values: configRows,
  });

  // 2. OFERTAS Tab
  const offerHeader = SHEET_TAB_DEFINITIONS.OFERTAS.headers;
  const offerRows = offers.map((o) => [
    o.mlbId,
    o.stableHash,
    o.title,
    o.category,
    o.currentPrice,
    o.originalPrice,
    o.discountPercent,
    o.opportunityScore,
    o.affiliateUrl,
    o.status,
    o.sellerReputation,
    o.freeShipping ? 'SIM' : 'NAO',
    o.discoveredAt,
    o.publishedAt || '',
  ]);
  updates.push({
    range: `OFERTAS!A1:N${Math.max(offerRows.length + 1, 2)}`,
    values: [offerHeader, ...offerRows],
  });

  // 3. CANAIS Tab
  const channelHeader = SHEET_TAB_DEFINITIONS.CANAIS.headers;
  const channelRows = channels.map((c) => [
    c.id,
    c.name,
    c.targetId,
    c.status,
    c.isPublishAuthorized ? 'SIM' : 'NAO',
    c.lastTestAt || '',
    c.lastTestStatus || 'PENDENTE',
  ]);
  updates.push({
    range: `CANAIS!A1:G${Math.max(channelRows.length + 1, 2)}`,
    values: [channelHeader, ...channelRows],
  });

  // 4. LOGS Tab
  const logHeader = SHEET_TAB_DEFINITIONS.LOGS.headers;
  const logRows = logs.slice(0, 50).map((l) => [
    l.id,
    l.timestamp,
    l.stage,
    l.level,
    1,
    l.message,
    l.metadata ? JSON.stringify(l.metadata) : '',
  ]);
  updates.push({
    range: `LOGS!A1:G${Math.max(logRows.length + 1, 2)}`,
    values: [logHeader, ...logRows],
  });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro ao sincronizar dados na planilha: HTTP ${response.status}`
    );
  }

  return {
    updatedTabs: ['CONFIG', 'OFERTAS', 'CANAIS', 'LOGS'],
    totalRecords: offers.length + channels.length + logs.length + configRows.length - 4,
  };
}

/**
 * Import offers from the live Google Sheet into local application state.
 */
export async function importOffersFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<OfferItem[]> {
  const rows = await readSheetValues(accessToken, spreadsheetId, 'OFERTAS!A2:N500');
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows
    .filter((row) => row && row[0]) // MLB_ID present
    .map((row, idx) => {
      const mlbId = String(row[0] || `MLB${Date.now()}_${idx}`).trim();
      const stableHash = String(row[1] || `${mlbId}_hash`).trim();
      const title = String(row[2] || 'Produto sem título').trim();
      const category = String(row[3] || 'Geral').trim();
      const currentPrice = parseFloat(String(row[4]).replace(/[^\d.,]/g, '').replace(',', '.')) || 99.9;
      const originalPrice = parseFloat(String(row[5]).replace(/[^\d.,]/g, '').replace(',', '.')) || currentPrice * 1.25;
      const discountPercent = parseFloat(String(row[6]).replace(/[^\d.,]/g, '')) || Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      const opportunityScore = parseInt(String(row[7]), 10) || 75;
      const affiliateUrl = String(row[8] || '').trim();
      const statusRaw = String(row[9] || 'AFILIADO_CONFIRMADO').trim() as any;
      const sellerReputation = (String(row[10] || 'MercadoLider Platinum').trim()) as any;
      const freeShipping = String(row[11] || '').toUpperCase().includes('SIM');
      const discoveredAt = String(row[12] || new Date().toISOString()).trim();
      const publishedAt = row[13] ? String(row[13]).trim() : undefined;

      return {
        id: `SHEET_${mlbId}_${idx}`,
        mlbId,
        stableHash,
        title,
        category,
        categoryId: 'IMPORTED_SHEET',
        currentPrice,
        originalPrice,
        discountPercent: Math.max(0, discountPercent),
        permalink: `https://produto.mercadolivre.com.br/${mlbId}`,
        affiliateUrl,
        isAffiliateValid: affiliateUrl.length > 10,
        stockAvailable: true,
        sellerName: 'Vendedor Mercado Livre',
        sellerReputation,
        freeShipping,
        thumbnail:
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop&q=80',
        opportunityScore: Math.min(100, Math.max(0, opportunityScore)),
        status: statusRaw || 'AFILIADO_CONFIRMADO',
        discoveredAt,
        publishedAt,
        history: [
          {
            timestamp: discoveredAt,
            price: currentPrice,
            originalPrice,
            discountPercent,
            source: 'Google Sheets Sincronizado',
            notes: 'Importado da aba OFERTAS',
          },
        ],
      };
    });
}
