import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Search,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  FileText,
  Terminal,
} from 'lucide-react';
import { DIAGNOSED_ERRORS, DiagnosedError, diagnoseRawErrorText } from '../logic/errorDiagnostics';
import { generateAuthorizedAffiliateUrl, validateAffiliateUrl } from '../logic/validation';
import { SystemConfig } from '../logic/types';

interface ErrorTroubleshooterProps {
  config: SystemConfig;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToTab: (tab: any) => void;
}

export const ErrorTroubleshooter: React.FC<ErrorTroubleshooterProps> = ({
  config,
  onShowNotification,
  onNavigateToTab,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>('ERR_MOD32_DUPLICATE_SHEET');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live log analysis state
  const [rawErrorInput, setRawErrorInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof diagnoseRawErrorText> | null>(null);

  // Affiliate Link Converter state
  const [inputUrl, setInputUrl] = useState<string>('');
  const [conversionResult, setConversionResult] = useState<{
    affiliateUrl: string;
    isRaw: boolean;
    isValid: boolean;
  } | null>(null);

  const filterErrors =
    selectedSeverity === 'ALL'
      ? DIAGNOSED_ERRORS
      : DIAGNOSED_ERRORS.filter((e) => e.severity === selectedSeverity);

  const handleCopyPayload = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowNotification('Conteúdo/Payload copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAnalyzeInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawErrorInput.trim()) return;
    const res = diagnoseRawErrorText(rawErrorInput);
    setAnalysisResult(res);
    onShowNotification(res.summary, 'info');
  };

  const handleConvertUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const isAlreadyAffiliate = validateAffiliateUrl(inputUrl, config.affiliateTag);
    const converted = generateAuthorizedAffiliateUrl(
      inputUrl,
      'MLB_TEST_ID',
      config.affiliateTag
    );

    setConversionResult({
      affiliateUrl: converted.affiliateUrl,
      isRaw: !isAlreadyAffiliate,
      isValid: converted.isValid,
    });

    onShowNotification(
      isAlreadyAffiliate
        ? 'URL já possui parâmetros de afiliado válidos!'
        : 'URL comum convertida com sucesso para link rastreável de comissão!',
      'success'
    );
  };

  const p0Count = DIAGNOSED_ERRORS.filter((e) => e.severity === 'P0').length;
  const p1Count = DIAGNOSED_ERRORS.filter((e) => e.severity === 'P1').length;
  const p2Count = DIAGNOSED_ERRORS.filter((e) => e.severity === 'P2').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-800/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Central de Correção de Erros
              </span>
              <span className="text-xs text-slate-400">
                Auditoria e Resolução Passo a Passo do Make.com & Google Sheets
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-400" />
              Diagnóstico & Correção de Erros (P0, P1 e P2)
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Avaliação de cada ponto de falha identificado no projeto <strong>BOX DO GARIMPO</strong>.
              Consulte a causa-raiz técnica, o impacto no negócio e siga o passo a passo com payloads
              prontos para corrigir diretamente no Make.com ou nas integrações.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={() => onNavigateToTab('make-audit')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
              <Code2 className="w-4 h-4" />
              <span>Ver Blueprint Make Corrigido</span>
            </button>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-rose-800/40">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-800/40">
            <span className="text-[11px] text-slate-400 font-medium">Erros P0 (Bloqueantes)</span>
            <div className="text-xl font-bold text-rose-400 mt-0.5 flex items-baseline gap-1">
              {p0Count} <span className="text-xs text-slate-400 font-normal">críticos</span>
            </div>
            <span className="text-[10px] text-rose-400/80">Módulo 32 & Agendamento 2030</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-800/40">
            <span className="text-[11px] text-slate-400 font-medium">Erros P1 (Comerciais)</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5 flex items-baseline gap-1">
              {p1Count} <span className="text-xs text-slate-400 font-normal">graves</span>
            </div>
            <span className="text-[10px] text-amber-400/80">Afiliados, Busca ML & Página1</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-800/40">
            <span className="text-[11px] text-slate-400 font-medium">Erros P2 (Qualidade)</span>
            <div className="text-xl font-bold text-sky-400 mt-0.5 flex items-baseline gap-1">
              {p2Count} <span className="text-xs text-slate-400 font-normal">moderados</span>
            </div>
            <span className="text-[10px] text-sky-400/80">Deduplicação, Canais & Créditos</span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-800/40">
            <span className="text-[11px] text-slate-400 font-medium">Correções Homologadas</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">100%</div>
            <span className="text-[10px] text-emerald-400/80">Soluções implementadas na plataforma</span>
          </div>
        </div>
      </div>

      {/* Interactive Tool 1: Live Error Log Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Analisador Inteligente de Logs e Mensagens de Erro
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Cole qualquer mensagem de erro do Make.com, da API do Google Sheets ou dos mensageiros
          para receber um diagnóstico imediato e a instrução exata de correção.
        </p>

        <form onSubmit={handleAnalyzeInput} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={rawErrorInput}
              onChange={(e) => setRawErrorInput(e.target.value)}
              placeholder="Ex: 400 Bad Request: A sheet with the name CONFIG already exists (ou erro de permissão no Telegram, etc.)"
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Analisar Erro</span>
            </button>
          </div>
        </form>

        {analysisResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300">
                Resultado do Diagnóstico ({analysisResult.matchedErrors.length} correspondência):
              </span>
              <button
                onClick={() => setAnalysisResult(null)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                Limpar
              </button>
            </div>

            <div className="space-y-2">
              {analysisResult.matchedErrors.map((err) => (
                <div
                  key={err.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                        {err.code}
                      </span>
                      {err.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {err.affectedModule}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px]">
                    <strong>Causa Raiz:</strong> {err.rootCause}
                  </p>

                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono">
                    <strong>Correção imediata:</strong> {err.stepByStepFix[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Tool 2: Live Affiliate Link Converter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Validador & Conversor de Links de Afiliado ao Vivo
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Tag Ativa: <strong>{config.affiliateTag}</strong>
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Cole qualquer URL de produto do Mercado Livre para verificar se ela gera comissão ou
          convertê-la instantaneamente para o formato homologado rastreável.
        </p>

        <form onSubmit={handleConvertUrl} className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Ex: https://www.mercadolivre.com.br/samsung-galaxy-s23/p/MLB12345678"
            className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Converter Link</span>
          </button>
        </form>

        {conversionResult && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-emerald-800/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Link de Afiliado Rastreável Gerado com Sucesso:
              </span>
              <span className="text-[10px] text-slate-400">
                {conversionResult.isRaw ? 'Original era URL comum sem comissão' : 'Já possuía tag'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={conversionResult.affiliateUrl}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300"
              />
              <button
                onClick={() => handleCopyPayload('CONV_LINK', conversionResult.affiliateUrl)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold text-xs flex items-center gap-1"
              >
                {copiedId === 'CONV_LINK' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Errors Catalog Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex space-x-2">
          {[
            { id: 'ALL', label: `Todos os 9 Erros (${DIAGNOSED_ERRORS.length})` },
            { id: 'P0', label: `P0 — Bloqueantes (${p0Count})` },
            { id: 'P1', label: `P1 — Graves (${p1Count})` },
            { id: 'P2', label: `P2 — Moderados (${p2Count})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSeverity(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSeverity === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Errors Accordion List */}
      <div className="space-y-4">
        {filterErrors.map((err) => {
          const isExpanded = expandedErrorId === err.id;

          return (
            <div
              key={err.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md ${
                err.severity === 'P0'
                  ? 'border-rose-900/60 hover:border-rose-700'
                  : err.severity === 'P1'
                  ? 'border-amber-900/60 hover:border-amber-700'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs px-2.5 py-1 rounded-md font-extrabold ${
                      err.severity === 'P0'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : err.severity === 'P1'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}
                  >
                    {err.code}
                  </span>

                  <div>
                    <h4 className="text-sm font-bold text-white hover:text-amber-300 transition-colors">
                      {err.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Alvo: <strong>{err.affectedModule}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    RESOLVIDO NA PLATAFORMA
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 text-xs">
                  {/* Symptoms and Technical Cause */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-rose-400 font-semibold block text-[11px]">
                        ⚠️ Sintoma & Erro Típico:
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">{err.symptom}</p>
                      <pre className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-rose-300/90 overflow-x-auto whitespace-pre-wrap">
                        {err.errorMessageExample}
                      </pre>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-amber-400 font-semibold block text-[11px]">
                        🔍 Causa Raiz Técnica:
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">{err.rootCause}</p>

                      <span className="text-slate-400 font-semibold block text-[11px] pt-1">
                        💼 Impacto no Negócio:
                      </span>
                      <p className="text-slate-400 text-xs leading-relaxed">{err.businessImpact}</p>
                    </div>
                  </div>

                  {/* Step-by-Step Fix Guide */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-900/50 space-y-2">
                    <span className="text-emerald-400 font-bold block text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Passo a Passo para Correção Definitiva no Make.com:
                    </span>
                    <ol className="list-none space-y-1.5 text-xs text-slate-300 pl-1">
                      {err.stepByStepFix.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-mono text-amber-400 font-bold">{idx + 1}.</span>
                          <span>{step.replace(/^Passo \d+: /, '')}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Ready Payload / Code */}
                  {err.readyPayload && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-semibold">
                          Payload / Parâmetro Pronto para Copiar e Colar no Módulo do Make:
                        </span>
                        <button
                          onClick={() =>
                            handleCopyPayload(
                              err.id,
                              typeof err.readyPayload === 'string'
                                ? err.readyPayload
                                : JSON.stringify(err.readyPayload, null, 2)
                            )
                          }
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                        >
                          {copiedId === err.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === err.id ? 'Copiado!' : 'Copiar Payload'}</span>
                        </button>
                      </div>

                      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                        {typeof err.readyPayload === 'string'
                          ? err.readyPayload
                          : JSON.stringify(err.readyPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
