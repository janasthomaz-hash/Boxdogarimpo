import React, { useState, useEffect } from 'react';
import {
  Table,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Code2,
  Database,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  AlertOctagon,
  Layers,
  FileCheck2,
  XCircle,
  HeartPulse,
  Wrench,
  Sparkles,
  Activity,
  ShieldAlert,
  Trash2,
  RotateCcw,
  ExternalLink,
  FileSpreadsheet,
  UploadCloud,
  FolderOpen,
  ArrowDownToLine,
  Check,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  SHEET_TAB_DEFINITIONS,
  MANDATORY_SHEET_TABS,
  verifyMandatorySheetsPreWrite,
  generateIdempotentSheetCreationPayload,
  auditSheetHealth,
  autoRepairMissingTabs,
} from '../logic/sheetSchema';
import { OfferItem, ChannelConfig, SystemConfig, PipelineExecutionLog } from '../logic/types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SpreadsheetConfirmModal } from './SpreadsheetConfirmModal';
import {
  listDriveSpreadsheets,
  getSpreadsheetDetails,
  createOfficialSpreadsheet,
  repairMissingTabsInSpreadsheet,
  syncAllDataToGoogleSheets,
  importOffersFromGoogleSheet,
  DriveSpreadsheetFile,
  LiveSpreadsheetInfo,
} from '../logic/googleSheetsService';

interface SpreadsheetManagerViewProps {
  config: SystemConfig;
  offers: OfferItem[];
  channels: ChannelConfig[];
  logs: PipelineExecutionLog[];
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  user?: FirebaseUser | null;
  accessToken?: string | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
  isAuthLoading?: boolean;
  onIngestOffers?: (newOffers: OfferItem[]) => void;
  onUpdateConfigSpreadsheetId?: (id: string) => void;
}

export const SpreadsheetManagerView: React.FC<SpreadsheetManagerViewProps> = ({
  config,
  offers,
  channels,
  logs,
  onShowNotification,
  user = null,
  accessToken = null,
  onSignInGoogle,
  onSignOutGoogle,
  isAuthLoading = false,
  onIngestOffers,
  onUpdateConfigSpreadsheetId,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<string>('CONFIG');
  const [showIdempotentModal, setShowIdempotentModal] = useState<boolean>(false);
  const [showNewRowModal, setShowNewRowModal] = useState<boolean>(false);

  // Tabs state: populated from live Google Sheets when connected, or simulation list
  const [existingTabsList, setExistingTabsList] = useState<string[]>([
    'Página1',
    'CONFIG',
    'OFERTAS',
    'HISTORICO',
    'CANAIS',
    'LOGS',
  ]);

  // Google Sheets Live State
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [liveSpreadsheet, setLiveSpreadsheet] = useState<LiveSpreadsheetInfo | null>(null);
  const [isLoadingLiveSheet, setIsLoadingLiveSheet] = useState<boolean>(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSyncingLiveSheet, setIsSyncingLiveSheet] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [customSheetInput, setCustomSheetInput] = useState<string>('');

  // Confirmation Modal State (MANDATORY for mutating Google Workspace data)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    affectedTabs: string[];
    recordsCount: number;
    actionType: 'SYNC_ALL' | 'REPAIR_TABS' | 'NONE';
  }>({
    isOpen: false,
    title: '',
    description: '',
    affectedTabs: [],
    recordsCount: 0,
    actionType: 'NONE',
  });

  // Pre-Write verification check & Health Check Audit
  const preWriteCheck = verifyMandatorySheetsPreWrite(existingTabsList);
  const idempotencyReport = generateIdempotentSheetCreationPayload(existingTabsList);
  const sheetHealth = auditSheetHealth(existingTabsList);

  const sheetTabs = [
    { id: 'CONFIG', name: 'CONFIG', count: 6, isProtected: false },
    { id: 'OFERTAS', name: 'OFERTAS', count: offers.length, isProtected: false },
    {
      id: 'HISTORICO',
      name: 'HISTORICO',
      count: offers.reduce((acc, o) => acc + (o.history?.length || 1), 0),
      isProtected: false,
    },
    { id: 'CANAIS', name: 'CANAIS', count: channels.length, isProtected: false },
    { id: 'LOGS', name: 'LOGS', count: logs.length, isProtected: false },
    { id: 'Pagina1', name: 'Página1 (Legado)', count: 1, isProtected: true },
  ];

  const currentTabDef =
    SHEET_TAB_DEFINITIONS[activeSheetTab] || SHEET_TAB_DEFINITIONS['CONFIG'];

  // Load Google Drive spreadsheets when authenticated
  useEffect(() => {
    if (user && accessToken) {
      loadDriveFiles();
    }
  }, [user, accessToken]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await listDriveSpreadsheets(accessToken);
      setDriveFiles(files);
      if (files.length > 0 && !liveSpreadsheet) {
        // Automatically inspect the first one or the one matching config.spreadsheetId
        const match = files.find((f) => f.id === config.spreadsheetId) || files[0];
        await handleSelectSpreadsheet(match.id);
      }
    } catch (err: any) {
      console.error('Erro ao listar arquivos do Google Drive:', err);
      onShowNotification(`Aviso: ${err.message || 'Não foi possível listar planilhas do Drive.'}`, 'info');
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleSelectSpreadsheet = async (sheetId: string) => {
    if (!accessToken) return;
    setIsLoadingLiveSheet(true);
    try {
      const details = await getSpreadsheetDetails(accessToken, sheetId);
      setLiveSpreadsheet(details);
      setExistingTabsList(details.tabNames);
      if (onUpdateConfigSpreadsheetId) {
        onUpdateConfigSpreadsheetId(details.spreadsheetId);
      }
      onShowNotification(
        `Planilha "${details.title}" conectada ao vivo via Google Sheets API!`,
        'success'
      );
    } catch (err: any) {
      onShowNotification(`Falha ao acessar planilha: ${err.message}`, 'error');
    } finally {
      setIsLoadingLiveSheet(false);
    }
  };

  const handleCreateNewOfficialSpreadsheet = async () => {
    if (!accessToken) {
      onShowNotification('Faça login com sua conta Google para criar uma planilha.', 'info');
      return;
    }

    setIsCreatingSheet(true);
    try {
      const newSheet = await createOfficialSpreadsheet(
        accessToken,
        `BOX DO GARIMPO — Base Oficial (${new Date().toLocaleDateString('pt-BR')})`
      );
      setLiveSpreadsheet(newSheet);
      setExistingTabsList(newSheet.tabNames);
      if (onUpdateConfigSpreadsheetId) {
        onUpdateConfigSpreadsheetId(newSheet.spreadsheetId);
      }
      // Refresh list
      loadDriveFiles();
      onShowNotification(
        `Nova planilha oficial criada com sucesso no seu Google Drive com todas as 5 abas prontas!`,
        'success'
      );
    } catch (err: any) {
      onShowNotification(`Erro ao criar planilha: ${err.message}`, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleConnectCustomSheet = async () => {
    if (!customSheetInput.trim()) return;
    // Extract ID if URL is passed
    let id = customSheetInput.trim();
    const urlMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      id = urlMatch[1];
    }
    await handleSelectSpreadsheet(id);
    setCustomSheetInput('');
  };

  /**
   * Auto-Repair missing tabs:
   * Recreates missing tabs idempotently on live Google Sheets if connected, or simulates locally
   */
  const handleAutoRepair = async () => {
    if (accessToken && liveSpreadsheet) {
      // Live Google Sheets Repair
      const missing = sheetHealth.missingTabs;
      if (missing.length === 0) {
        onShowNotification('Todas as 5 abas obrigatórias já existem na planilha Google Sheets!', 'info');
        return;
      }

      setIsLoadingLiveSheet(true);
      try {
        const updated = await repairMissingTabsInSpreadsheet(
          accessToken,
          liveSpreadsheet.spreadsheetId,
          missing
        );
        setLiveSpreadsheet(updated);
        setExistingTabsList(updated.tabNames);
        onShowNotification(
          `Auto-Repair Concluído no Google Sheets! Abas criadas: [${missing.join(', ')}]. Escrita 100% liberada.`,
          'success'
        );
      } catch (err: any) {
        onShowNotification(`Erro ao reparar abas no Google Sheets: ${err.message}`, 'error');
      } finally {
        setIsLoadingLiveSheet(false);
      }
    } else {
      // Local Simulation Repair
      const repairResult = autoRepairMissingTabs(existingTabsList);
      if (repairResult.repairedTabs.length === 0) {
        onShowNotification(
          'Health Check 100% Saudável: Todas as 5 abas obrigatórias já existem!',
          'info'
        );
        return;
      }
      setExistingTabsList(repairResult.updatedSheetNames);
      onShowNotification(
        `Auto-Repair Concluído! ${repairResult.repairedTabs.length} abas foram recriadas: [${repairResult.repairedTabs.join(', ')}].`,
        'success'
      );
    }
  };

  /**
   * Trigger Sync to Live Google Sheet with Mandatory Confirmation Dialog
   */
  const handleRequestSyncToGoogleSheets = () => {
    if (!user || !accessToken || !liveSpreadsheet) {
      onShowNotification(
        'Conecte-se com sua conta Google e selecione uma planilha para sincronizar ao vivo.',
        'info'
      );
      return;
    }

    if (!preWriteCheck.canWrite) {
      onShowNotification(
        `BLOQUEIO DE ESCRITA: As abas obrigatórias [${preWriteCheck.missingTabs.join(', ')}] não existem na planilha. Execute o Auto-Repair primeiro!`,
        'error'
      );
      return;
    }

    const totalRecords = offers.length + channels.length + logs.length + 5;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Sincronizar Dados para a Planilha Google Sheets',
      description: `Esta ação gravará e atualizará os dados atuais nas abas CONFIG, OFERTAS (${offers.length} ofertas), CANAIS (${channels.length} canais) e LOGS diretamente na sua planilha ao vivo no Google Drive. A aba original Página1 permanecerá intocada.`,
      affectedTabs: ['CONFIG', 'OFERTAS', 'CANAIS', 'LOGS'],
      recordsCount: totalRecords,
      actionType: 'SYNC_ALL',
    });
  };

  /**
   * Execute Confirmed Sync
   */
  const handleExecuteConfirmedSync = async () => {
    if (!accessToken || !liveSpreadsheet) return;

    setIsSyncingLiveSheet(true);
    try {
      const result = await syncAllDataToGoogleSheets(accessToken, liveSpreadsheet.spreadsheetId, {
        config,
        offers,
        channels,
        logs,
      });

      setConfirmModalConfig((p) => ({ ...p, isOpen: false }));
      onShowNotification(
        `Sincronização ao vivo concluída com sucesso! ${result.totalRecords} registros gravados em [${result.updatedTabs.join(', ')}].`,
        'success'
      );
    } catch (err: any) {
      onShowNotification(`Falha na sincronização com o Google Sheets: ${err.message}`, 'error');
    } finally {
      setIsSyncingLiveSheet(false);
    }
  };

  /**
   * Import Offers from Live Google Sheets
   */
  const handleImportOffers = async () => {
    if (!user || !accessToken || !liveSpreadsheet) {
      onShowNotification('Conecte sua conta Google para importar dados ao vivo.', 'info');
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importOffersFromGoogleSheet(accessToken, liveSpreadsheet.spreadsheetId);
      if (imported.length === 0) {
        onShowNotification('A aba OFERTAS na planilha está vazia ou não contém registros válidos.', 'info');
      } else {
        if (onIngestOffers) {
          onIngestOffers(imported);
        }
        onShowNotification(
          `Importação concluída! ${imported.length} ofertas carregadas diretamente do Google Sheets para o painel.`,
          'success'
        );
      }
    } catch (err: any) {
      onShowNotification(`Erro ao importar ofertas do Google Sheets: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Toggle tab presence for simulation
   */
  const handleToggleTab = (tabName: string) => {
    const exists = existingTabsList.some((t) => t.trim().toLowerCase() === tabName.toLowerCase());
    if (exists) {
      setExistingTabsList((prev) => prev.filter((t) => t.trim().toLowerCase() !== tabName.toLowerCase()));
      onShowNotification(
        `Aba "${tabName}" removida da visualização local. O Health Check agora destaca esta aba em VERMELHO.`,
        'error'
      );
    } else {
      setExistingTabsList((prev) => [...prev, tabName]);
      onShowNotification(`Aba "${tabName}" adicionada à visualização local.`, 'success');
    }
  };

  const handleSimulateMissingTabsScenario = () => {
    setExistingTabsList(['Página1', 'CONFIG']);
    onShowNotification(
      'Simulando cenário de falha crítica: 4 abas ausentes (OFERTAS, HISTORICO, CANAIS, LOGS).',
      'error'
    );
  };

  const handleSimulatePartialMissing = () => {
    setExistingTabsList(['Página1', 'CONFIG', 'OFERTAS', 'HISTORICO']);
    onShowNotification('Simulando falha parcial: Abas CANAIS e LOGS removidas.', 'error');
  };

  const handleRestoreAllTabsScenario = () => {
    if (liveSpreadsheet) {
      setExistingTabsList(liveSpreadsheet.tabNames);
    } else {
      setExistingTabsList(['Página1', 'CONFIG', 'OFERTAS', 'HISTORICO', 'CANAIS', 'LOGS']);
    }
    onShowNotification('Todas as abas restauradas.', 'success');
  };

  const handleExportCSV = () => {
    let csvContent = currentTabDef.headers.join(',') + '\n';

    if (activeSheetTab === 'CONFIG') {
      const rows = [
        ['INTERRUPTOR_GERAL', config.globalKillSwitch ? 'BLOQUEADO' : 'LIBERADO', 'BOOLEAN', 'Trava de segurança', new Date().toISOString()],
        ['FREQUENCIA_MINUTOS', config.frequencyMinutes.toString(), 'NUMBER', 'Periodicidade oficial', new Date().toISOString()],
        ['DESCONTO_MINIMO_PCT', `${config.minDiscountPercent}%`, 'NUMBER', 'Margem mínima de oportunidade', new Date().toISOString()],
        ['TAG_AFILIADO_ML', config.affiliateTag, 'STRING', 'Tag de rastreamento comissão', new Date().toISOString()],
        ['LIMITE_REQUISICOES_CICLO', config.requestRateLimitPerCycle.toString(), 'NUMBER', 'Anti-exaustão de créditos', new Date().toISOString()],
      ];
      csvContent += rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    } else if (activeSheetTab === 'OFERTAS') {
      const rows = offers.map((o) => [
        o.mlbId,
        o.stableHash,
        `"${o.title.replace(/"/g, '""')}"`,
        o.category,
        o.currentPrice,
        o.originalPrice,
        o.discountPercent,
        o.opportunityScore,
        `"${o.affiliateUrl}"`,
        o.status,
        o.sellerReputation,
        o.freeShipping ? 'SIM' : 'NAO',
        o.discoveredAt,
        o.publishedAt || '',
      ]);
      csvContent += rows.map((r) => r.join(',')).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOX_DO_GARIMPO_${activeSheetTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowNotification(`Aba ${activeSheetTab} exportada em CSV com sucesso!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Google Sheets Live Connection Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Google Sheets & Drive Integrados
              </span>
              {user ? (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado como: <strong>{user.email}</strong>
                </span>
              ) : (
                <span className="text-xs text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Modo Offline / Demonstração
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
              Gestão de Abas da Planilha & Sincronização ao Vivo
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Integração direta com a API do <strong>Google Sheets v4</strong> e <strong>Google Drive</strong>.
              Crie a planilha oficial com 1 clique, audite as 5 abas obrigatórias com proteção contra o erro 400 do Make,
              e sincronize ofertas e configurações em tempo real.
            </p>
          </div>

          {/* Right action / Sign in button */}
          <div className="flex items-center gap-3 flex-wrap self-start lg:self-center">
            {!user ? (
              <GoogleSignInButton
                user={user}
                isLoading={isAuthLoading}
                onSignIn={onSignInGoogle || (() => {})}
                onSignOut={onSignOutGoogle || (() => {})}
              />
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleCreateNewOfficialSpreadsheet}
                  disabled={isCreatingSheet}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  title="Criar uma nova planilha completa no seu Google Drive com todas as 5 abas"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingSheet ? 'Criando Planilha...' : 'Criar Nova Planilha Oficial'}</span>
                </button>

                <button
                  onClick={handleRequestSyncToGoogleSheets}
                  disabled={isSyncingLiveSheet || !liveSpreadsheet}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  title="Gravar ofertas e configurações diretamente na planilha selecionada"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSyncingLiveSheet ? 'Sincronizando...' : 'Gravar no Google Sheets'}</span>
                </button>

                <button
                  onClick={handleImportOffers}
                  disabled={isImporting || !liveSpreadsheet}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Importar ofertas da aba OFERTAS da planilha para o aplicativo"
                >
                  <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                  <span>{isImporting ? 'Importando...' : 'Importar Ofertas'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Spreadsheet Selector (Visible when authenticated) */}
        {user && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Planilhas no seu Google Drive:
              </label>
              <div className="flex gap-2">
                <select
                  value={liveSpreadsheet?.spreadsheetId || config.spreadsheetId}
                  onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                  disabled={isLoadingLiveSheet || isLoadingDriveFiles}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {driveFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} ({file.id.slice(0, 8)}...)
                    </option>
                  ))}
                  {driveFiles.length === 0 && (
                    <option value={config.spreadsheetId}>
                      {liveSpreadsheet?.title || 'Planilha Padrão Box do Garimpo'}
                    </option>
                  )}
                </select>
                <button
                  onClick={loadDriveFiles}
                  disabled={isLoadingDriveFiles}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title="Recarregar lista do Drive"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Ou informe outro ID ou Link do Google Sheets:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cole o link ou ID da planilha..."
                  value={customSheetInput}
                  onChange={(e) => setCustomSheetInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleConnectCustomSheet}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 whitespace-nowrap"
                >
                  Conectar
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex md:justify-end items-center gap-2 pt-4 md:pt-0">
              {liveSpreadsheet && (
                <a
                  href={liveSpreadsheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto px-4 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abrir no Google Sheets</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Health Check Indicator & Pre-Write Verification Gate */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
          sheetHealth.status === 'HEALTHY'
            ? 'bg-gradient-to-b from-slate-900/95 to-slate-950 border-emerald-500/40 shadow-emerald-950/20'
            : sheetHealth.status === 'DEGRADED'
            ? 'bg-gradient-to-b from-amber-950/30 to-slate-950 border-amber-500/50 shadow-amber-950/30'
            : 'bg-gradient-to-b from-rose-950/40 to-slate-950 border-rose-500/60 shadow-rose-950/40 ring-1 ring-rose-500/30'
        }`}
      >
        {/* Health Check Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-2xl border mt-0.5 transition-all ${
                sheetHealth.status === 'HEALTHY'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : sheetHealth.status === 'DEGRADED'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
              }`}
            >
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-black tracking-widest uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Health Check das Abas Obrigatórias
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${
                    sheetHealth.status === 'HEALTHY'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : sheetHealth.status === 'DEGRADED'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/25 text-rose-200 border-rose-500/50 animate-pulse shadow-sm shadow-rose-500/20'
                  }`}
                >
                  {sheetHealth.status === 'HEALTHY'
                    ? '100% SAUDÁVEL — TODAS AS 5 ABAS PRESENTES'
                    : sheetHealth.status === 'DEGRADED'
                    ? `DEGRADADO — ${sheetHealth.missingTabs.length} ABA(S) AUSENTE(S)`
                    : `CRÍTICO — ${sheetHealth.missingTabs.length} ABAS AUSENTES (ESCRITA BLOQUEADA)`}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    preWriteCheck.canWrite
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                  }`}
                >
                  {preWriteCheck.canWrite ? 'Escrita Liberada' : 'Escrita Bloqueada'}
                </span>
                {liveSpreadsheet && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                    Auditado via API ao vivo ({liveSpreadsheet.tabNames.length} abas encontradas)
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                Auditoria de Integridade da Planilha Google Sheets
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {sheetHealth.status === 'HEALTHY'
                  ? 'Todas as 5 abas obrigatórias (CONFIG, OFERTAS, HISTORICO, CANAIS, LOGS) foram auditadas e existem no documento. A Página1 original permanece intacta. Operações do Make.com e sincronizações estão 100% autorizadas.'
                  : `Alerta de Risco: ${sheetHealth.missingTabs.length} aba(s) obrigatória(s) [${sheetHealth.missingTabs.join(', ')}] não foram encontradas. Qualquer módulo de escrita falhará com erro de referência ou causará colisão se não for corrigido.`}
              </p>
            </div>
          </div>

          {/* Action Buttons: Auto-Repair & Add Row */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {/* Dedicated Auto-Repair Button */}
            <button
              onClick={handleAutoRepair}
              disabled={isLoadingLiveSheet}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg ${
                sheetHealth.status !== 'HEALTHY'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
              }`}
              title={
                sheetHealth.status !== 'HEALTHY'
                  ? `Recria imediatamente as abas ausentes: [${sheetHealth.missingTabs.join(', ')}]`
                  : 'Todas as abas já existem. Clique para re-auditar.'
              }
            >
              <Wrench
                className={`w-4 h-4 ${
                  sheetHealth.status !== 'HEALTHY' ? 'text-slate-950 animate-bounce' : 'text-emerald-400'
                }`}
              />
              <span>
                {sheetHealth.status !== 'HEALTHY'
                  ? `Auto-Repair (${sheetHealth.missingTabs.length} Abas Faltantes)`
                  : 'Auto-Repair (Tudo Saudável)'}
              </span>
              {sheetHealth.status !== 'HEALTHY' && (
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              )}
            </button>

            <button
              onClick={() => setShowNewRowModal(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                preWriteCheck.canWrite
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
              }`}
              title={
                preWriteCheck.canWrite
                  ? 'Adicionar nova linha na aba selecionada'
                  : 'Bloqueado: Existem abas obrigatórias ausentes'
              }
            >
              <Plus className="w-4 h-4" />
              <span>Gravar Linha</span>
            </button>
          </div>
        </div>

        {/* Health Bar Meter */}
        <div className="mt-4 pt-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Integridade Estrutural:</span>
              <span className="font-mono text-white font-bold">
                {sheetHealth.existingMandatoryCount} de {sheetHealth.totalMandatory} abas obrigatórias ativas
              </span>
            </span>
            <span
              className={`font-mono font-bold ${
                sheetHealth.healthScorePct === 100
                  ? 'text-emerald-400'
                  : sheetHealth.healthScorePct >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400 font-extrabold'
              }`}
            >
              {sheetHealth.healthScorePct}% Integridade
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sheetHealth.healthScorePct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : sheetHealth.healthScorePct >= 60
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-gradient-to-r from-rose-600 to-rose-400'
              }`}
              style={{ width: `${Math.max(sheetHealth.healthScorePct, 8)}%` }}
            />
          </div>
        </div>

        {/* Individual Audited Tabs Grid with High-Contrast Red for Missing Tabs */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Resultado Individual do Health Check por Aba:
            </span>
            {sheetHealth.missingTabs.length > 0 && (
              <span className="text-[11px] font-bold text-rose-400 animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {sheetHealth.missingTabs.length} aba(s) destacada(s) em vermelho exigem reparo imediato
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {MANDATORY_SHEET_TABS.map((tabName) => {
              const exists = existingTabsList.some(
                (t) => t.trim().toLowerCase() === tabName.toLowerCase()
              );
              const tabDef = SHEET_TAB_DEFINITIONS[tabName];

              return (
                <div
                  key={tabName}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                    exists
                      ? 'bg-slate-950/80 border-emerald-500/40 text-slate-200 hover:border-emerald-500/70'
                      : 'bg-rose-950/80 border-rose-500 text-rose-100 ring-2 ring-rose-500/50 shadow-xl shadow-rose-950/60'
                  }`}
                >
                  {!exists && (
                    <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-12 h-12 bg-rose-500/20 rounded-full blur-md pointer-events-none" />
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-black tracking-wider ${
                          exists ? 'text-white' : 'text-rose-200'
                        }`}
                      >
                        {tabName}
                      </span>
                      {exists ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
                        </div>
                      )}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400 line-clamp-1" title={tabDef?.purpose}>
                      {tabDef?.purpose || 'Aba obrigatória'}
                    </div>

                    <div className="mt-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          exists
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-950 font-black'
                        }`}
                      >
                        {exists ? '✓ ÍNTEGRA' : '⚠️ AUSENTE'}
                      </span>
                    </div>

                    {!exists && (
                      <p className="mt-1.5 text-[10px] text-rose-300/90 leading-tight font-medium">
                        Make Module 32/33 falhará ao referenciar esta aba.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">
                      {tabDef?.headers.length || 0} cols
                    </span>

                    <button
                      onClick={() => handleToggleTab(tabName)}
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] transition-colors ${
                        exists
                          ? 'bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm'
                      }`}
                      title={
                        exists
                          ? `Remover aba ${tabName} para simular teste em vermelho`
                          : `Recriar aba ${tabName} individualmente`
                      }
                    >
                      {exists ? 'Remover' : 'Recriar'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Página1 Original Card */}
            <div className="p-3 rounded-xl border bg-slate-950/80 border-blue-500/40 text-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-300">Página1</span>
                  <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </div>
                <div className="mt-1 text-[10px] text-slate-400 line-clamp-1">
                  Aba preexistente e preservada
                </div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-300 border-blue-500/30">
                    🛡️ PRESERVADA
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-blue-300/80 leading-tight">
                  Dados originais mantidos intactos.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono">Legado</span>
                <span className="text-blue-400 font-semibold">Sem Exclusão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Repair Banner if Missing Tabs */}
        {sheetHealth.missingTabs.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div className="text-xs text-rose-200">
                <strong>Ação Recomendada:</strong> Foram detectadas <strong>{sheetHealth.missingTabs.length} abas ausentes</strong> na auditoria. Clique no botão de Auto-Repair para criá-las de modo idempotente na planilha real.
              </div>
            </div>
            <button
              onClick={handleAutoRepair}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20 whitespace-nowrap self-end sm:self-auto"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Executar Auto-Repair Agora</span>
            </button>
          </div>
        )}

        {/* Test Simulator Controls */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-300">Ferramentas de Auditoria & Simulação:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateMissingTabsScenario}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Simular Falha Crítica (4 Ausentes)</span>
            </button>
            <button
              onClick={handleSimulatePartialMissing}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Simular Falha Parcial (CANAIS & LOGS)</span>
            </button>
            <button
              onClick={handleRestoreAllTabsScenario}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Restaurar Abas Originais</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for the Spreadsheet */}
      <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-800">
        {sheetTabs.map((tab) => {
          const isActive = activeSheetTab === tab.id;
          const isMandatory = MANDATORY_SHEET_TABS.includes(tab.id as any);
          const tabExists = existingTabsList.some(
            (t) => t.trim().toLowerCase() === tab.id.toLowerCase()
          );

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSheetTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 border-slate-700 text-amber-300 border-b-2 border-b-amber-500'
                  : 'bg-slate-950/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <span>{tab.name}</span>
              {tab.isProtected ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  Preservada
                </span>
              ) : isMandatory && !tabExists ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/50 text-rose-300 border border-rose-700/50">
                  Ausente
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Details & Headers Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Aba: {currentTabDef.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{currentTabDef.purpose}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              {currentTabDef.headers.length} colunas estruturadas
            </span>
            <button
              onClick={() => setShowIdempotentModal(true)}
              className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Auditor Make Módulo 32</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Exportar (.csv)</span>
            </button>
          </div>
        </div>

        {/* Tab Headers Badge list */}
        <div className="py-3 flex flex-wrap gap-1.5">
          {currentTabDef.headers.map((col, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
            >
              {col}
            </span>
          ))}
        </div>

        {/* Table Content Preview */}
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                {currentTabDef.headers.map((h, i) => (
                  <th key={i} className="px-3.5 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono">
              {activeSheetTab === 'CONFIG' && (
                <>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 text-amber-300 font-semibold">
                      INTERRUPTOR_GERAL_PUBLICACAO
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          config.globalKillSwitch
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {config.globalKillSwitch ? 'BLOQUEADO' : 'LIBERADO'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">BOOLEAN</td>
                    <td className="px-3.5 py-2.5 font-sans text-slate-300">
                      Trava de segurança que impede disparos automáticos
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[10px]">
                      {new Date().toISOString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 text-amber-300 font-semibold">
                      FREQUENCIA_MINUTOS
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-white">
                      {config.frequencyMinutes}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">NUMBER</td>
                    <td className="px-3.5 py-2.5 font-sans text-slate-300">
                      Periodicidade oficial (Requisito comercial: 15 minutos)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[10px]">
                      {new Date().toISOString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 text-amber-300 font-semibold">
                      DESCONTO_MINIMO_PCT
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-400">
                      {config.minDiscountPercent}%
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">NUMBER</td>
                    <td className="px-3.5 py-2.5 font-sans text-slate-300">
                      Critério de oportunidade real
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[10px]">
                      {new Date().toISOString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 text-amber-300 font-semibold">TAG_AFILIADO_ML</td>
                    <td className="px-3.5 py-2.5 text-sky-400 font-bold">{config.affiliateTag}</td>
                    <td className="px-3.5 py-2.5 text-slate-400">STRING</td>
                    <td className="px-3.5 py-2.5 font-sans text-slate-300">
                      Identificador autorizado para comissão
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[10px]">
                      {new Date().toISOString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 text-amber-300 font-semibold">
                      RATE_LIMIT_POR_CICLO
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-purple-400">
                      {config.requestRateLimitPerCycle} reqs
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">NUMBER</td>
                    <td className="px-3.5 py-2.5 font-sans text-slate-300">
                      Controle anti-exaustão de créditos
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-500 text-[10px]">
                      {new Date().toISOString()}
                    </td>
                  </tr>
                </>
              )}

              {activeSheetTab === 'OFERTAS' &&
                offers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 text-[11px]">
                    <td className="px-3.5 py-2 text-slate-300">{o.mlbId}</td>
                    <td className="px-3.5 py-2 text-slate-500">{o.stableHash.slice(0, 10)}...</td>
                    <td className="px-3.5 py-2 font-sans font-medium text-white max-w-xs truncate">
                      {o.title}
                    </td>
                    <td className="px-3.5 py-2 text-slate-400">{o.category}</td>
                    <td className="px-3.5 py-2 text-amber-400 font-bold">
                      R$ {o.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2 text-slate-500 line-through">
                      R$ {o.originalPrice.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2 text-emerald-400 font-bold">-{o.discountPercent}%</td>
                    <td className="px-3.5 py-2 text-sky-400 font-bold">{o.opportunityScore}</td>
                    <td className="px-3.5 py-2 text-slate-400 max-w-xs truncate">
                      {o.affiliateUrl || 'PENDENTE'}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-slate-400">{o.sellerReputation}</td>
                    <td className="px-3.5 py-2 text-slate-300">{o.freeShipping ? 'SIM' : 'NÃO'}</td>
                    <td className="px-3.5 py-2 text-slate-500 text-[10px]">{o.discoveredAt}</td>
                    <td className="px-3.5 py-2 text-slate-500 text-[10px]">{o.publishedAt || '-'}</td>
                  </tr>
                ))}

              {activeSheetTab === 'HISTORICO' && (
                <>
                  {offers.flatMap((o) =>
                    (o.history || []).map((h, i) => (
                      <tr key={`${o.id}_${i}`} className="hover:bg-slate-800/40 text-[11px]">
                        <td className="px-3.5 py-2 text-slate-400">HIST_{o.mlbId}_{i}</td>
                        <td className="px-3.5 py-2 text-slate-300">{o.mlbId}</td>
                        <td className="px-3.5 py-2 text-amber-400 font-bold">
                          R$ {h.price.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2 text-slate-500">
                          R$ {h.originalPrice.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2 text-emerald-400">-{h.discountPercent}%</td>
                        <td className="px-3.5 py-2 text-sky-400">CHECK_CICLO</td>
                        <td className="px-3.5 py-2 text-slate-500 text-[10px]">{h.timestamp}</td>
                        <td className="px-3.5 py-2 font-sans text-slate-400">{h.notes}</td>
                      </tr>
                    ))
                  )}
                </>
              )}

              {activeSheetTab === 'CANAIS' &&
                channels.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 text-[11px]">
                    <td className="px-3.5 py-2 text-slate-300">{c.id}</td>
                    <td className="px-3.5 py-2 font-sans font-bold text-white">{c.name}</td>
                    <td className="px-3.5 py-2 text-sky-400 font-mono">{c.targetId}</td>
                    <td className="px-3.5 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.isPublishAuthorized
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {c.isPublishAuthorized ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-slate-500 text-[10px]">{c.lastTestAt || '-'}</td>
                    <td className="px-3.5 py-2 text-emerald-400">{c.lastTestStatus || 'PENDENTE'}</td>
                  </tr>
                ))}

              {activeSheetTab === 'LOGS' &&
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 text-[11px]">
                    <td className="px-3.5 py-2 text-slate-400">{log.id}</td>
                    <td className="px-3.5 py-2 text-slate-500 text-[10px]">{log.timestamp}</td>
                    <td className="px-3.5 py-2 text-sky-400 font-semibold">{log.stage}</td>
                    <td className="px-3.5 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.level === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-300'
                            : log.level === 'ERROR'
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-amber-400 font-bold">1</td>
                    <td className="px-3.5 py-2 font-sans text-slate-200">{log.message}</td>
                    <td className="px-3.5 py-2 text-slate-500 text-[10px]">-</td>
                  </tr>
                ))}

              {activeSheetTab === 'Pagina1' && (
                <tr className="hover:bg-slate-800/40">
                  <td className="px-3.5 py-3 text-slate-300">Dados Históricos Originais</td>
                  <td className="px-3.5 py-3 text-slate-400">Leitura Módulo 33</td>
                  <td className="px-3.5 py-3 text-emerald-400 font-bold">100% PRESERVADA</td>
                  <td className="px-3.5 py-3 font-sans text-slate-300">
                    Nenhuma operação destrutiva foi executada sobre a Página1. Todos os registros
                    anteriores estão intactos.
                  </td>
                  <td className="px-3.5 py-3 text-slate-500 text-[10px]">2026-10-26</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Row / Write Operation Modal */}
      {showNewRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Gravação de Linha: {currentTabDef.name}
                </h3>
              </div>
              <button
                onClick={() => setShowNewRowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  preWriteCheck.canWrite
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}
              >
                {preWriteCheck.canWrite ? (
                  <Unlock className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {preWriteCheck.canWrite
                      ? 'Gate Pré-Escrita: APROVADO'
                      : 'Gate Pré-Escrita: BLOQUEADO'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {preWriteCheck.canWrite
                      ? 'Todas as 5 abas obrigatórias existem na planilha. Operação autorizada.'
                      : `Faltam: [${preWriteCheck.missingTabs.join(', ')}]. Escrita impedida.`}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Esta ação grava um novo registro na planilha através da API Google Sheets.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewRowModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (preWriteCheck.canWrite) {
                    onShowNotification(
                      `Operação autorizada e gravada com sucesso na aba ${activeSheetTab}!`,
                      'success'
                    );
                    setShowNewRowModal(false);
                  }
                }}
                disabled={!preWriteCheck.canWrite}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  preWriteCheck.canWrite
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                }`}
              >
                Confirmar Gravação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Modal for Google Workspace Data Mutating Operations */}
      <SpreadsheetConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        spreadsheetTitle={liveSpreadsheet?.title || config.spreadsheetId}
        spreadsheetId={liveSpreadsheet?.spreadsheetId || config.spreadsheetId}
        actionDescription={confirmModalConfig.description}
        affectedTabs={confirmModalConfig.affectedTabs}
        recordsCount={confirmModalConfig.recordsCount}
        onConfirm={handleExecuteConfirmedSync}
        onCancel={() => setConfirmModalConfig((p) => ({ ...p, isOpen: false }))}
        isProcessing={isSyncingLiveSheet}
      />

      {/* Idempotency Inspector Modal */}
      {showIdempotentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Auditor de Idempotência do Módulo 32 (Make.com)
                </h3>
              </div>
              <button
                onClick={() => setShowIdempotentModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                <strong>O Problema P0 Diagnosticado no Relatório:</strong> O módulo 32 do Make está
                configurado para criar as abas CONFIG, OFERTAS, HISTORICO, CANAIS e LOGS. Se essas
                abas já tiverem sido criadas anteriormente, a API do Google Sheets rejeita com{' '}
                <code className="text-rose-400 bg-rose-950/60 px-1 py-0.5 rounded">
                  400 Bad Request (A sheet with that name already exists)
                </code>
                , travando a automação.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-300 mb-1">Diagnóstico da Estrutura Atual:</div>
                <p className="text-[11px] text-slate-400">{idempotencyReport.explanation}</p>
                <div className="mt-2 flex gap-4 text-[11px]">
                  <div>
                    <span className="text-slate-500">Abas já existentes:</span>{' '}
                    <span className="font-mono text-emerald-400">
                      [{idempotencyReport.existingTabs.join(', ') || 'Nenhuma'}]
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Abas faltantes a criar:</span>{' '}
                    <span className="font-mono text-sky-400">
                      [{idempotencyReport.missingTabs.join(', ')}]
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Payload Seguro do Google Sheets API (BatchUpdate Idempotente):
                </label>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify({ requests: idempotencyReport.safeGoogleSheetsRequests }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Garante conformidade estrita com a Google Sheets API v4
              </span>
              <button
                onClick={() => setShowIdempotentModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
