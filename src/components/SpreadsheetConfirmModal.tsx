import React from 'react';
import { AlertTriangle, Database, Check, X, ShieldAlert } from 'lucide-react';

interface SpreadsheetConfirmModalProps {
  isOpen: boolean;
  title: string;
  spreadsheetTitle: string;
  spreadsheetId: string;
  actionDescription: string;
  affectedTabs: string[];
  recordsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const SpreadsheetConfirmModal: React.FC<SpreadsheetConfirmModalProps> = ({
  isOpen,
  title,
  spreadsheetTitle,
  spreadsheetId,
  actionDescription,
  affectedTabs,
  recordsCount,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-amber-950/40 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {title}
            </h3>
            <p className="text-xs text-amber-300 font-medium mt-1">
              Confirmação de Operação de Escrita no Google Sheets
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Planilha de Destino:</span>
            <span className="font-semibold text-white truncate max-w-[220px]">
              {spreadsheetTitle}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>ID Google Sheets:</span>
            <span className="font-mono text-amber-400 text-[11px] truncate max-w-[220px]">
              {spreadsheetId}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Abas Afetadas:</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {affectedTabs.map((tab) => (
                <span
                  key={tab}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-slate-700"
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Total de Registros a Gravar:</span>
            <span className="font-bold text-emerald-400">{recordsCount} registros</span>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-300 bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 leading-relaxed">
          <p className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Atenção às alterações de dados:
          </p>
          {actionDescription}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Gravando no Google Sheets...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar e Gravar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
