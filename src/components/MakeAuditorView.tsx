import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Check,
  FileSpreadsheet,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { MAKE_SCENARIO_ANALYSIS } from '../logic/sampleData';
import { SystemConfig } from '../logic/types';

interface MakeAuditorViewProps {
  config: SystemConfig;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MakeAuditorView: React.FC<MakeAuditorViewProps> = ({ config, onShowNotification }) => {
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);
  const [selectedModule, setSelectedModule] = useState<number>(32);

  const safeMakeBlueprintJson = JSON.stringify(
    {
      name: 'BOX DO GARIMPO — Agente Central de Ofertas (Homologado V2.4)',
      schedule: {
        type: 'cron',
        frequency: 'every_15_minutes', // Restored from temporary 2030 date
        interval: 15,
        isActive: false, // Inactive by default until user approval
      },
      modules: [
        {
          id: 1,
          module: 'http:makeRequest',
          version: 1,
          parameters: {
            url: 'https://api.mercadolibre.com/sites/MLB/search',
            method: 'GET',
            qs: {
              category: '{{33.active_category_id}}', // Rotates across eligible categories
              sort: 'price_asc',
              official_store: 'all',
              limit: config.requestRateLimitPerCycle,
            },
            headers: [{ name: 'Authorization', value: 'Bearer {{connections.mercado_livre_oauth}}' }],
          },
          notes: 'Substitui a busca fixa q=celular por consulta dinâmica multi-categorias.',
        },
        {
          id: 32,
          module: 'google-sheets:getSpreadsheet',
          version: 1,
          parameters: {
            spreadsheetId: config.spreadsheetId,
            includeGridData: false,
          },
          notes: 'CORREÇÃO P0: Restaurado para Modo Leitura/Inspeção. NÃO tenta recriar as abas às cegas.',
        },
        {
          id: 33,
          module: 'google-sheets:getRange',
          version: 1,
          parameters: {
            spreadsheetId: config.spreadsheetId,
            range: 'CONFIG!A1:E20', // Read config parameters instead of empty Pagina1
          },
          notes: 'Lê parâmetros da aba CONFIG preservando a Página1 intocada.',
        },
        {
          id: 34,
          module: 'router:action',
          version: 1,
          parameters: {
            branches: [
              {
                name: 'Validar e Deduplicar',
                filter: '{{1.body.results.length}} > 0',
              },
            ],
          },
        },
      ],
    },
    null,
    2
  );

  const handleCopyBlueprint = () => {
    navigator.clipboard.writeText(safeMakeBlueprintJson);
    setCopiedBlueprint(true);
    onShowNotification('Blueprint JSON seguro do Make.com copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedBlueprint(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Critical P0 Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Auditoria Técnica P0
              </span>
              <span className="text-xs text-slate-400">
                Diagnóstico do Cenário Central Make.com
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Estado Técnico Real & Plano de Correção do Make
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Diagnóstico detalhado dos 3 módulos ativos, risco de colisão no Google Sheets (Módulo
              32) e cronograma para restabelecer a periodicidade oficial de 15 minutos.
            </p>
          </div>

          <button
            onClick={handleCopyBlueprint}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
          >
            {copiedBlueprint ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
            <span>{copiedBlueprint ? 'Copiado!' : 'Copiar Blueprint Corrigido'}</span>
          </button>
        </div>

        {/* Current State vs Recommended Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Estado do Cenário no Make:</span>
            <span className="text-amber-400 font-bold text-sm mt-0.5 block">
              {MAKE_SCENARIO_ANALYSIS.currentStatus} (Seguro)
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Preservar inativo até homologar testes
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Agendamento no Make:</span>
            <span className="text-rose-400 font-bold text-sm mt-0.5 block truncate">
              01/01/2030 (Temporário)
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Restaurar para 15 min após testes
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Risco Crítico no Módulo 32:</span>
            <span className="text-rose-400 font-bold text-sm mt-0.5 block">
              Erro 400 por Abas Duplicadas
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Restaurar validação somente-leitura
            </span>
          </div>
        </div>
      </div>

      {/* Modules Deep Dive */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          Análise Módulo a Módulo do Cenário Atual
        </h3>

        <div className="space-y-3">
          {MAKE_SCENARIO_ANALYSIS.modules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => setSelectedModule(mod.id)}
              className={`bg-slate-900 border rounded-2xl p-4.5 cursor-pointer transition-all ${
                selectedModule === mod.id
                  ? 'border-amber-500/60 bg-slate-900/90 shadow-md'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-xs px-2.5 py-1 rounded-md font-bold ${
                      mod.id === 32
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-amber-400 border border-slate-700'
                    }`}
                  >
                    Módulo {mod.id}
                  </span>
                  <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    mod.id === 32
                      ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800'
                  }`}
                >
                  {mod.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-rose-400 font-semibold block mb-1">
                    ⚠️ Problema Identificado:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{mod.issueIdentified}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-emerald-400 font-semibold block mb-1">
                    ✅ Correção Homologada:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{mod.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended 7-Step Action Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-base font-bold text-white mb-2">
          Ordem de Correção Recomendada (Seção 7 do Relatório)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Siga rigorosamente esta ordem para não gerar erros de execução nem queimar créditos do Make:
        </p>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              1
            </span>
            <div>
              <strong className="text-white">Inspecionar o estado atual da planilha:</strong>
              <p className="text-slate-300 mt-0.5">
                Confirmar se as abas CONFIG, OFERTAS, HISTORICO, CANAIS e LOGS já foram criadas sem
                executar novamente a criação às cegas. (Concluído na aba Planilha desta plataforma).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              2
            </span>
            <div>
              <strong className="text-white">Restaurar o Módulo 32 no Make:</strong>
              <p className="text-slate-300 mt-0.5">
                Substituir o batchUpdate de criação de abas por leitura/inspeção simples (Get
                Spreadsheet Metadata). Manter o cenário inativo até a conclusão dos 10 testes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              3
            </span>
            <div>
              <strong className="text-white">Expandir o Módulo 1 (Mercado Livre API):</strong>
              <p className="text-slate-300 mt-0.5">
                Eliminar a consulta fixa <code>q=celular</code> e implementar busca por parâmetros
                dinâmicos de categoria elegível.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              4
            </span>
            <div>
              <strong className="text-white">Geração de Links de Afiliado com Rastreamento:</strong>
              <p className="text-slate-300 mt-0.5">
                Nunca publicar links comuns brutos. Gerar links rastreáveis com a tag{' '}
                <code>{config.affiliateTag}</code> e parâmetros autorizados.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
              5
            </span>
            <div>
              <strong className="text-white">Validar os Canais e Executar os 10 Testes:</strong>
              <p className="text-slate-300 mt-0.5">
                Confirmar credenciais do Telegram @boxdogarimpo e WhatsApp boxdogarimpo e passar
                por todos os 10 testes obrigatórios.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
              6
            </span>
            <div>
              <strong className="text-white">Reativação com Frequência de 15 Minutos:</strong>
              <p className="text-slate-300 mt-0.5">
                Restaurar o agendamento de 15 minutos e ativar o cenário apenas com o interruptor
                geral autorizado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Corrected Blueprint JSON Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Blueprint Make.com Seguro & Homologado
            </h3>
          </div>

          <button
            onClick={handleCopyBlueprint}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar Blueprint</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-72">
          {safeMakeBlueprintJson}
        </pre>
      </div>
    </div>
  );
};
