import React from 'react';
import {
  Settings,
  DownloadCloud,
  CheckCircle,
  Fingerprint,
  Inbox,
  Send,
  FileSpreadsheet,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Zap,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { SystemConfig, OfferItem, PipelineExecutionLog, ChannelConfig } from '../logic/types';

interface PipelineCockpitProps {
  config: SystemConfig;
  offers: OfferItem[];
  channels: ChannelConfig[];
  logs: PipelineExecutionLog[];
  onSimulateFullCycle: () => void;
  isRunning: boolean;
  onNavigateToTab: (tab: any) => void;
}

export const PipelineCockpit: React.FC<PipelineCockpitProps> = ({
  config,
  offers,
  channels,
  logs,
  onSimulateFullCycle,
  isRunning,
  onNavigateToTab,
}) => {
  // Counts by status
  const countFound = offers.filter((o) => o.status === 'PRODUTO_ENCONTRADO').length;
  const countValidated = offers.filter((o) => o.status === 'PRODUTO_VALIDADO').length;
  const countAffiliate = offers.filter((o) => o.status === 'AFILIADO_CONFIRMADO').length;
  const countApproved = offers.filter((o) => o.status === 'APROVADO_PUBLICACAO').length;
  const countPublished = offers.filter((o) => o.status === 'PUBLICADO').length;

  const totalDeduplicated = offers.reduce((acc, o) => acc + (o.history?.length > 1 ? 1 : 0), 0);
  const avgDiscount =
    offers.length > 0
      ? Math.round(offers.reduce((sum, o) => sum + o.discountPercent, 0) / offers.length)
      : 0;

  const stages = [
    {
      num: 1,
      id: 'CONFIG',
      title: '1. CONFIG',
      icon: <Settings className="w-5 h-5 text-blue-400" />,
      desc: 'Parâmetros, 15 min, 8 categorias, Trava Geral',
      statusText: config.globalKillSwitch ? 'Trava Ativa' : 'Publicação Liberada',
      statusColor: config.globalKillSwitch ? 'text-rose-400' : 'text-emerald-400',
      action: () => onNavigateToTab('categories'),
    },
    {
      num: 2,
      id: 'COLETA',
      title: '2. COLETA',
      icon: <DownloadCloud className="w-5 h-5 text-indigo-400" />,
      desc: 'API Mercado Livre por categorias elegíveis',
      statusText: `${offers.length} ofertas capturadas`,
      statusColor: 'text-indigo-400',
      action: () => onNavigateToTab('categories'),
    },
    {
      num: 3,
      id: 'VALIDACAO',
      title: '3. VALIDAÇÃO',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      desc: 'Preço real, estoque, oportunidade e link de afiliado',
      statusText: `${countValidated + countAffiliate + countApproved} validadas`,
      statusColor: 'text-emerald-400',
      action: () => onNavigateToTab('approval'),
    },
    {
      num: 4,
      id: 'DEDUPLICACAO',
      title: '4. DEDUPLICAÇÃO',
      icon: <Fingerprint className="w-5 h-5 text-purple-400" />,
      desc: 'Hash estável SHA-256 e cooldown 7d / queda de preço',
      statusText: `${totalDeduplicated} deduplicadas com histórico`,
      statusColor: 'text-purple-400',
      action: () => onNavigateToTab('spreadsheet'),
    },
    {
      num: 5,
      id: 'APROVACAO',
      title: '5. FILA DE APROVAÇÃO',
      icon: <Inbox className="w-5 h-5 text-amber-400" />,
      desc: 'Retenção segura: 0 publicações sem aprovação explícita',
      statusText: `${countApproved} prontas para envio`,
      statusColor: 'text-amber-400',
      action: () => onNavigateToTab('approval'),
    },
    {
      num: 6,
      id: 'PUBLICACAO',
      title: '6. PUBLICAÇÃO',
      icon: <Send className="w-5 h-5 text-sky-400" />,
      desc: 'WhatsApp boxdogarimpo & Telegram @boxdogarimpo',
      statusText: `${countPublished} enviadas com sucesso`,
      statusColor: 'text-sky-400',
      action: () => onNavigateToTab('channels'),
    },
    {
      num: 7,
      id: 'LOGS',
      title: '7. PLANILHA & LOGS',
      icon: <FileSpreadsheet className="w-5 h-5 text-slate-400" />,
      desc: '5 abas estruturadas + Página1 preservada intacta',
      statusText: `${logs.length} logs registrados`,
      statusColor: 'text-slate-400',
      action: () => onNavigateToTab('spreadsheet'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Banner / Executive Briefing Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Diretriz Estrutural
              </span>
              <span className="text-xs text-slate-400">
                Resolução da Avaliação Geral: Make & Operação Comercial
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Central Operacional BOX DO GARIMPO
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Sistema ponta a ponta configurado com separação estrita de responsabilidades:
              descoberta multi-categoria, validação de desconto genuíno, confirmação do link de
              afiliado, deduplicação estável e retenção na fila. Publicações automáticas travadas por
              padrão até conclusão dos testes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSimulateFullCycle}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isRunning ? 'animate-bounce' : ''}`} />
              <span>{isRunning ? 'Processando Ciclo...' : 'Simular Ciclo Completo (15m)'}</span>
            </button>
            <button
              onClick={() => onNavigateToTab('audit-evaluation')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/70 font-semibold text-sm transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Laudo de Correções (100%)</span>
            </button>
            <button
              onClick={() => onNavigateToTab('troubleshoot')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-700/70 font-semibold text-sm transition-colors shadow-sm"
            >
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Corrigir Erros (P0-P2)</span>
            </button>
            <button
              onClick={() => onNavigateToTab('make-audit')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <span>Resolver Módulo 32 (P0)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Desconto Médio Real</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-baseline gap-1">
              {avgDiscount}% <span className="text-xs text-slate-400">OFF</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Mínimo configurado: 20%</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Aguardando Aprovação</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{countApproved}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Prontas para envio seguro</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Itens Deduplicados</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{totalDeduplicated}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Histórico sem republicação</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Trava de Segurança</div>
            <div
              className={`text-sm font-bold mt-2 flex items-center gap-1.5 ${
                config.globalKillSwitch ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {config.globalKillSwitch ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>TRAVADA (Seguro)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>LIBERADA</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {config.globalKillSwitch ? 'Zero disparos desautorizados' : 'Disparo manual/automático'}
            </div>
          </div>
        </div>
      </div>

      {/* The 7-Stage Pipeline Visual Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Arquitetura em 7 Etapas com Responsabilidades Claras
            </h3>
            <p className="text-xs text-slate-400">
              Isola pesquisa, validação comercial e publicação para evitar falhas silenciosas no
              Make.com
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Frequência: 15 min • Make Limit: {config.requestRateLimitPerCycle} reqs/ciclo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {stages.slice(0, 4).map((st) => (
            <div
              key={st.id}
              onClick={st.action}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 rounded-xl p-4.5 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 group-hover:border-amber-500/40">
                    {st.icon}
                  </div>
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    Etapa {st.num}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{st.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className={`text-xs font-medium ${st.statusColor}`}>{st.statusText}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {stages.slice(4).map((st) => (
            <div
              key={st.id}
              onClick={st.action}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 rounded-xl p-4.5 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 group-hover:border-amber-500/40">
                    {st.icon}
                  </div>
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    Etapa {st.num}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{st.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className={`text-xs font-medium ${st.statusColor}`}>{st.statusText}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* States Distribution of Offers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-base font-bold text-white mb-2">
          Distribuição dos 5 Estados Operacionais das Ofertas
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Nenhuma oferta pode pular etapas. Cada item deve percorrer a validação formal antes de
          qualquer publicação.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400 font-medium block">1. Encontrado</span>
            <span className="text-2xl font-bold text-slate-200 mt-1 block">{countFound}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Busca bruta ML</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400 font-medium block">2. Validado</span>
            <span className="text-2xl font-bold text-indigo-300 mt-1 block">{countValidated}</span>
            <span className="text-[10px] text-indigo-400 block mt-1">Preço e estoque OK</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400 font-medium block">3. Afiliado Confirmado</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{countAffiliate}</span>
            <span className="text-[10px] text-emerald-500 block mt-1">Link rastreável OK</span>
          </div>

          <div className="bg-slate-800/80 border border-amber-500/40 bg-amber-500/5 rounded-xl p-3.5 text-center">
            <span className="text-xs text-amber-300 font-medium block">4. Aprovado Envio</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{countApproved}</span>
            <span className="text-[10px] text-amber-500 block mt-1">Pronto na fila</span>
          </div>

          <div className="bg-slate-800/80 border border-sky-500/40 bg-sky-500/5 rounded-xl p-3.5 text-center">
            <span className="text-xs text-sky-300 font-medium block">5. Publicado</span>
            <span className="text-2xl font-bold text-sky-400 mt-1 block">{countPublished}</span>
            <span className="text-[10px] text-sky-500 block mt-1">Canais autorizados</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => onNavigateToTab('approval')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
          >
            <span>Gerenciar Fila e Aprovar Ofertas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
