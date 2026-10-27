/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Header } from './components/Header';
import { NavigationTabs, TabType } from './components/NavigationTabs';
import { PipelineCockpit } from './components/PipelineCockpit';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { SpreadsheetManagerView } from './components/SpreadsheetManagerView';
import { CategoryScannerView } from './components/CategoryScannerView';
import { ChannelsPublisherView } from './components/ChannelsPublisherView';
import { MakeAuditorView } from './components/MakeAuditorView';
import { MandatoryTestsView } from './components/MandatoryTestsView';
import { LogsAuditView } from './components/LogsAuditView';
import { MessagePreviewModal } from './components/MessagePreviewModal';
import { ErrorTroubleshooter } from './components/ErrorTroubleshooter';
import { CorrectionsAuditView } from './components/CorrectionsAuditView';

import {
  INITIAL_SYSTEM_CONFIG,
  INITIAL_CHANNELS,
  INITIAL_OFFERS,
  INITIAL_LOGS,
} from './logic/sampleData';
import { INITIAL_MANDATORY_TESTS } from './logic/testSuite';
import {
  SystemConfig,
  OfferItem,
  ChannelConfig,
  PipelineExecutionLog,
  MandatoryTestItem,
} from './logic/types';
import { generateStableHash } from './logic/hash';
import { calculateDiscount, calculateOpportunityScore, generateAuthorizedAffiliateUrl } from './logic/validation';
import { evaluateDeduplication } from './logic/deduplication';
import { initAuth, googleSignIn, logout } from './logic/googleAuth';

export default function App() {
  const [config, setConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [offers, setOffers] = useState<OfferItem[]>(INITIAL_OFFERS);
  const [channels, setChannels] = useState<ChannelConfig[]>(INITIAL_CHANNELS);
  const [logs, setLogs] = useState<PipelineExecutionLog[]>(INITIAL_LOGS);
  const [tests, setTests] = useState<MandatoryTestItem[]>(INITIAL_MANDATORY_TESTS);

  // Google Workspace Authentication State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [connectedSheetTitle, setConnectedSheetTitle] = useState<string>('Planilha Google');

  const [activeTab, setActiveTab] = useState<TabType>('cockpit');
  const [previewOffer, setPreviewOffer] = useState<OfferItem | null>(null);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
      showNotification(
        `Conectado ao Google Workspace com sucesso! Olá, ${result.user.displayName || result.user.email}`,
        'success'
      );
    } catch (err: any) {
      showNotification(`Falha na autenticação Google: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showNotification('Desconectado do Google Workspace com sucesso.', 'info');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  const handleToggleKillSwitch = () => {
    const nextState = !config.globalKillSwitch;
    setConfig((prev) => ({ ...prev, globalKillSwitch: nextState }));

    const logEntry: PipelineExecutionLog = {
      id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      stage: 'CONFIG',
      level: nextState ? 'WARN' : 'SUCCESS',
      message: nextState
        ? 'Trava de Segurança ATIVADA: Todas as publicações automáticas foram bloqueadas.'
        : 'Trava de Segurança DESATIVADA: Publicações manuais e automáticas autorizadas.',
    };

    setLogs((prev) => [logEntry, ...prev]);
    showNotification(
      nextState
        ? 'Trava de Segurança Ativada! Publicações bloqueadas.'
        : 'Trava Desativada! Publicações liberadas.',
      nextState ? 'info' : 'success'
    );
  };

  const handleSimulateFullCycle = async () => {
    setIsRunningCycle(true);
    showNotification('Iniciando simulação de ciclo completo de 15 minutos...', 'info');

    // 1. Log Config Check
    const log1: PipelineExecutionLog = {
      id: `LOG_${Date.now()}_1`,
      timestamp: new Date().toISOString(),
      stage: 'CONFIG',
      level: 'INFO',
      message: `SIMULAÇÃO LOCAL (sem API externa): configuração ${config.frequencyMinutes} min; limite configurado ${config.requestRateLimitPerCycle} reqs.`,
    };

    // 2. Coleta: Discover new deal in active category
    const activeCats = config.authorizedCategories.filter((c) => c.enabled);
    const chosenCat = activeCats[Math.floor(Math.random() * activeCats.length)] || activeCats[0];
    const mlbId = `MLB${Math.floor(200000000 + Math.random() * 800000000)}`;

    const originalPrice = 1899.0;
    const currentPrice = 1299.0;
    const disc = calculateDiscount(currentPrice, originalPrice);
    const oppScore = calculateOpportunityScore({
      currentPrice,
      originalPrice,
      discountPercent: disc.discountPercent,
      sellerReputation: 'MercadoLider Platinum',
      freeShipping: true,
      stockAvailable: true,
    });

    const affiliateGen = generateAuthorizedAffiliateUrl(
      `https://www.mercadolivre.com.br/produto-${mlbId}/p/${mlbId}`,
      mlbId,
      config.affiliateTag
    );

    const newCandidate: OfferItem = {
      id: `OFF_${Date.now()}`,
      mlbId,
      title: `${chosenCat.name}: Smart Garimpo Pro Edição Especial`,
      category: chosenCat.name,
      categoryId: chosenCat.id,
      currentPrice,
      originalPrice,
      discountPercent: disc.discountPercent,
      permalink: `https://www.mercadolivre.com.br/produto-${mlbId}/p/${mlbId}`,
      affiliateUrl: affiliateGen.affiliateUrl,
      isAffiliateValid: affiliateGen.isValid,
      stockAvailable: true,
      sellerName: 'Mercado Livre Oficial',
      sellerReputation: 'MercadoLider Platinum',
      freeShipping: true,
      installments: '10x de R$ 129,90 sem juros',
      thumbnail:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop&q=80',
      opportunityScore: oppScore,
      stableHash: generateStableHash(mlbId, `${chosenCat.name} Smart Garimpo Pro`, 'Mercado Livre Oficial'),
      status: 'PRODUTO_ENCONTRADO',
      discoveredAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          price: currentPrice,
          originalPrice,
          discountPercent: disc.discountPercent,
          source: 'SIMULAÇÃO LOCAL — nenhuma API foi consultada',
          notes: 'Dados fictícios de demonstração; não usar como oferta real',
        },
      ],
    };

    // 3. Deduplication check
    const dedupDecision = evaluateDeduplication(newCandidate, offers, {
      cooldownDays: config.cooldownDaysBetweenPosts,
      priceDropThresholdPercent: config.priceDropThresholdPercent,
    });

    const log2: PipelineExecutionLog = {
      id: `LOG_${Date.now()}_2`,
      timestamp: new Date().toISOString(),
      stage: 'COLETA',
      level: 'INFO',
      message: `SIMULAÇÃO: categoria ${chosenCat.name} (${chosenCat.id}); nenhuma consulta real foi feita.`,
    };

    const log3: PipelineExecutionLog = {
      id: `LOG_${Date.now()}_3`,
      timestamp: new Date().toISOString(),
      stage: 'DEDUPLICACAO',
      level: 'INFO',
      message: `Deduplicação: ${dedupDecision.reason}`,
    };

    const log4: PipelineExecutionLog = {
      id: `LOG_${Date.now()}_4`,
      timestamp: new Date().toISOString(),
      stage: 'APROVACAO',
      level: 'WARN',
      message: `Demonstração fictícia ${mlbId} mantida como PRODUTO_ENCONTRADO; afiliado e preço real não foram verificados.`,
    };

    setOffers((prev) => [newCandidate, ...prev]);
    setLogs((prev) => [log4, log3, log2, log1, ...prev]);
    setIsRunningCycle(false);

    showNotification(
      `Simulação local concluída. Nenhuma API foi consultada e nenhuma oferta real foi validada.`,
      'info'
    );
  };

  const handleUpdateOffer = (updated: OfferItem) => {
    setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleIngestOffers = (newOffers: OfferItem[]) => {
    setOffers((prev) => [...newOffers, ...prev]);
  };

  const handleUpdateChannel = (updated: ChannelConfig) => {
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const pendingApprovalCount = offers.filter(
    (o) => o.status === 'AFILIADO_CONFIRMADO' || o.status === 'APROVADO_PUBLICACAO'
  ).length;
  const testsPassedCount = tests.filter((t) => t.status === 'PASSED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-600 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-600 text-rose-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        config={config}
        onToggleKillSwitch={handleToggleKillSwitch}
        onRunCycle={handleSimulateFullCycle}
        isRunningCycle={isRunningCycle}
        onOpenTests={() => setActiveTab('tests')}
        onOpenMakeAudit={() => setActiveTab('make-audit')}
        onOpenTroubleshoot={() => setActiveTab('troubleshoot')}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
        onOpenSheetsTab={() => setActiveTab('spreadsheet')}
        connectedSheetTitle={connectedSheetTitle}
      />

      {/* Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalCount={pendingApprovalCount}
        testsPassedCount={testsPassedCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'cockpit' && (
          <PipelineCockpit
            config={config}
            offers={offers}
            channels={channels}
            logs={logs}
            onSimulateFullCycle={handleSimulateFullCycle}
            isRunning={isRunningCycle}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'troubleshoot' && (
          <ErrorTroubleshooter
            config={config}
            onShowNotification={showNotification}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'audit-evaluation' && (
          <CorrectionsAuditView
            config={config}
            onShowNotification={showNotification}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'approval' && (
          <ApprovalQueueView
            offers={offers}
            config={config}
            channels={channels}
            onUpdateOffer={handleUpdateOffer}
            onPreviewMessage={(offer) => setPreviewOffer(offer)}
            onShowNotification={showNotification}
          />
        )}

        {activeTab === 'spreadsheet' && (
          <SpreadsheetManagerView
            config={config}
            offers={offers}
            channels={channels}
            logs={logs}
            onShowNotification={showNotification}
            user={user}
            accessToken={accessToken}
            onSignInGoogle={handleGoogleSignIn}
            onSignOutGoogle={handleGoogleSignOut}
            isAuthLoading={isAuthLoading}
            onIngestOffers={handleIngestOffers}
            onUpdateConfigSpreadsheetId={(newId) => {
              setConfig((prev) => ({ ...prev, spreadsheetId: newId }));
              setConnectedSheetTitle(`Planilha ${newId.slice(0, 8)}...`);
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryScannerView
            config={config}
            onUpdateCategories={(cats) => setConfig((p) => ({ ...p, authorizedCategories: cats }))}
            onIngestOffers={handleIngestOffers}
            onShowNotification={showNotification}
          />
        )}

        {activeTab === 'channels' && (
          <ChannelsPublisherView
            channels={channels}
            config={config}
            sampleOffer={offers[0]}
            onUpdateChannel={handleUpdateChannel}
            onShowNotification={showNotification}
          />
        )}

        {activeTab === 'make-audit' && (
          <MakeAuditorView config={config} onShowNotification={showNotification} />
        )}

        {activeTab === 'tests' && (
          <MandatoryTestsView
            tests={tests}
            config={config}
            offers={offers}
            channels={channels}
            onUpdateTests={setTests}
            onShowNotification={showNotification}
          />
        )}

        {activeTab === 'logs' && (
          <LogsAuditView
            logs={logs}
            onClearLogs={() => setLogs([])}
            onShowNotification={showNotification}
          />
        )}
      </main>

      {/* Message Preview Modal */}
      <MessagePreviewModal
        offer={previewOffer}
        onClose={() => setPreviewOffer(null)}
        onShowNotification={showNotification}
      />

      {/* Minimal Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            BOX DO GARIMPO — Agente Central de Ofertas • Operação com Frequência de 15 Minutos
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Make.com Module 32 Idempotent • Channels: WhatsApp & Telegram
          </span>
        </div>
      </footer>
    </div>
  );
}
