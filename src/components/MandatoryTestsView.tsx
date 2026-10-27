import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { MandatoryTestItem, SystemConfig, OfferItem, ChannelConfig } from '../logic/types';
import { runSingleMandatoryTest } from '../logic/testSuite';

interface MandatoryTestsViewProps {
  tests: MandatoryTestItem[];
  config: SystemConfig;
  offers: OfferItem[];
  channels: ChannelConfig[];
  onUpdateTests: (tests: MandatoryTestItem[]) => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MandatoryTestsView: React.FC<MandatoryTestsViewProps> = ({
  tests,
  config,
  offers,
  channels,
  onUpdateTests,
  onShowNotification,
}) => {
  const [isRunningAll, setIsRunningAll] = useState(false);

  const passedCount = tests.filter((t) => t.status === 'PASSED').length;
  const failedCount = tests.filter((t) => t.status === 'FAILED').length;
  const pendingCount = tests.filter((t) => t.status === 'PENDING').length;

  const handleRunSingleTest = async (testId: number) => {
    const updated = tests.map((t) => (t.id === testId ? { ...t, status: 'RUNNING' as const } : t));
    onUpdateTests(updated);

    const res = await runSingleMandatoryTest(testId, config, offers, channels);

    const final = tests.map((t) =>
      t.id === testId
        ? {
            ...t,
            status: res.status,
            details: res.details,
            timestamp: new Date().toLocaleTimeString('pt-BR'),
          }
        : t
    );
    onUpdateTests(final);
    onShowNotification(
      `Teste #${testId} (${tests.find((t) => t.id === testId)?.name}): ${res.status}`,
      res.status === 'PASSED' ? 'success' : res.status === 'PENDING' ? 'info' : 'error'
    );
  };

  const handleRunAllTests = async () => {
    setIsRunningAll(true);
    let currentTests = [...tests];

    for (const item of currentTests) {
      currentTests = currentTests.map((t) =>
        t.id === item.id ? { ...t, status: 'RUNNING' as const } : t
      );
      onUpdateTests(currentTests);

      // Brief delay for authentic runner experience
      await new Promise((r) => setTimeout(r, 200));

      const res = await runSingleMandatoryTest(item.id, config, offers, channels);
      currentTests = currentTests.map((t) =>
        t.id === item.id
          ? {
              ...t,
              status: res.status,
              details: res.details,
              timestamp: new Date().toLocaleTimeString('pt-BR'),
            }
          : t
      );
      onUpdateTests(currentTests);
    }

    setIsRunningAll(false);
    const finalPassedCount = currentTests.filter((test) => test.status === 'PASSED').length;
    const finalPendingCount = currentTests.filter((test) => test.status === 'PENDING').length;
    const finalFailedCount = currentTests.filter((test) => test.status === 'FAILED').length;
    onShowNotification(
      `Bateria concluída: ${finalPassedCount} aprovados, ${finalFailedCount} reprovados e ${finalPendingCount} pendentes. Não equivale a homologação automática.`,
      finalFailedCount > 0 ? 'error' : finalPendingCount > 0 ? 'info' : 'success'
    );
  };

  const handleDownloadReport = () => {
    const lines = [
      '========================================================================',
      'BOX DO GARIMPO — RELATÓRIO DE HOMOLOGAÇÃO DOS 10 TESTES OBRIGATÓRIOS',
      `Data/Hora: ${new Date().toISOString()}`,
      `Status Geral: ${passedCount === 10 ? 'HOMOLOGADO PARA OPERAÇÃO' : 'PENDENTE DE CORREÇÕES'}`,
      `Taxa de Sucesso: ${passedCount}/10 testes aprovados (${passedCount * 10}%)`,
      '========================================================================\n',
    ];

    tests.forEach((t) => {
      lines.push(`[${t.status}] Teste #${t.id}: ${t.name}`);
      lines.push(`Descrição: ${t.description}`);
      lines.push(`Critério Exigido: ${t.expectedResult}`);
      lines.push(`Evidência Técnica: ${t.details || 'Pendente de execução'}`);
      lines.push(`Executado em: ${t.timestamp || '-'}\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RELATORIO_TESTES_BOX_DO_GARIMPO_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onShowNotification('Relatório de homologação baixado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header and Compliance Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Seção 6 da Avaliação
              </span>
              <span className="text-xs text-slate-400">
                Critérios Técnicos Obrigatórios Antes da Ativação
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              Suíte dos 10 Testes Obrigatórios de Homologação
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Nenhuma operação recorrente ou publicação automática deve ser liberada antes que todos
              os 10 testes abaixo apresentem resultado de sucesso com evidências registradas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRunAllTests}
              disabled={isRunningAll}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all shrink-0"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
              <span>{isRunningAll ? 'Executando Bateria...' : 'Executar Todos os 10 Testes'}</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Relatório</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Badges */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">
              Conformidade dos Requisitos: {passedCount} de 10 concluídos ({passedCount * 10}%)
            </span>
            <div className="flex gap-3 text-[11px]">
              <span className="text-emerald-400 font-bold">{passedCount} Aprovados</span>
              <span className="text-rose-400 font-bold">{failedCount} Reprovados</span>
              <span className="text-slate-400 font-bold">{pendingCount} Pendentes</span>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${passedCount * 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tests List */}
      <div className="space-y-3">
        {tests.map((test) => {
          return (
            <div
              key={test.id}
              className={`bg-slate-900 border rounded-2xl p-4.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                test.status === 'PASSED'
                  ? 'border-emerald-700/60 bg-emerald-950/10'
                  : test.status === 'FAILED'
                  ? 'border-rose-700/60 bg-rose-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Teste #{test.id}
                  </span>
                  <h4 className="text-sm font-bold text-white">{test.name}</h4>

                  {/* Status Pill */}
                  {test.status === 'PASSED' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> APROVADO
                    </span>
                  )}
                  {test.status === 'FAILED' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-400" /> REPROVADO
                    </span>
                  )}
                  {test.status === 'RUNNING' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                      EXECUTANDO...
                    </span>
                  )}
                  {test.status === 'PENDING' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      PENDENTE
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{test.description}</p>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Critério de Sucesso:</strong>{' '}
                  {test.expectedResult}
                </div>

                {test.details && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                    <span className="text-emerald-400 font-bold block mb-0.5">
                      Evidência de Execução ({test.timestamp}):
                    </span>
                    {test.details}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => handleRunSingleTest(test.id)}
                  disabled={isRunningAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span>Testar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
