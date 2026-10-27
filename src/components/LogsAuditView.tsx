import React, { useState } from 'react';
import { FileText, Filter, Trash2, Download, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { PipelineExecutionLog } from '../logic/types';

interface LogsAuditViewProps {
  logs: PipelineExecutionLog[];
  onClearLogs: () => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LogsAuditView: React.FC<LogsAuditViewProps> = ({
  logs,
  onClearLogs,
  onShowNotification,
}) => {
  const [filterStage, setFilterStage] = useState<string>('ALL');

  const filteredLogs =
    filterStage === 'ALL' ? logs : logs.filter((l) => l.stage === filterStage);

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.stage}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOX_DO_GARIMPO_AUDIT_LOGS_${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
    onShowNotification('Arquivo de logs baixado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Logs de Auditoria & Monitoramento do Agente
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro de execuções, créditos consumidos no Make, validações de preço e supressões de
            duplicatas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadLogs}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar .log</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Filter by Stage */}
      <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {['ALL', 'CONFIG', 'COLETA', 'VALIDACAO', 'DEDUPLICACAO', 'APROVACAO', 'PUBLICACAO', 'SISTEMA'].map(
          (stage) => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStage === stage
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {stage}
            </button>
          )
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Nenhum log registrado para esta etapa.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.level === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.level === 'WARN'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : log.level === 'ERROR'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.level}
                  </span>

                  <span className="font-mono text-[11px] text-sky-400 font-semibold">
                    [{log.stage}]
                  </span>

                  <span className="text-slate-200">{log.message}</span>
                </div>

                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  Créditos Make: 1
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
