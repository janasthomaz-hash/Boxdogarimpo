import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { SystemConfig } from '../logic/types';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  config: SystemConfig;
  onToggleKillSwitch: () => void;
  onRunCycle: () => void;
  isRunningCycle: boolean;
  onOpenTests: () => void;
  onOpenMakeAudit: () => void;
  onOpenTroubleshoot: () => void;
  user: FirebaseUser | null;
  isAuthLoading?: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onOpenSheetsTab: () => void;
  connectedSheetTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onToggleKillSwitch,
  onRunCycle,
  isRunningCycle,
  onOpenTests,
  onOpenMakeAudit,
  onOpenTroubleshoot,
  user,
  isAuthLoading = false,
  onSignInGoogle,
  onSignOutGoogle,
  onOpenSheetsTab,
  connectedSheetTitle,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-bold text-lg">
              <Flame className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  BOX DO GARIMPO
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                    Agente Central v2.4
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Pipeline de Ofertas • Validação & Afiliados • Sincronização Google Sheets
              </p>
            </div>
          </div>

          {/* Critical Security Lock / Emergency Kill Switch */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                config.globalKillSwitch
                  ? 'bg-rose-950/60 border-rose-600/60 text-rose-300 shadow-sm shadow-rose-900/30'
                  : 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300 shadow-sm shadow-emerald-900/30'
              }`}
            >
              {config.globalKillSwitch ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <div>
                    <span className="block text-[10px] uppercase text-rose-400 tracking-wider">
                      Trava de Segurança (P0)
                    </span>
                    <span>PUBLICAÇÃO BLOQUEADA</span>
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="block text-[10px] uppercase text-emerald-400 tracking-wider">
                      Operação Autorizada
                    </span>
                    <span>PUBLICADOR LIBERADO</span>
                  </div>
                </>
              )}
              <button
                onClick={onToggleKillSwitch}
                className={`ml-2 px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
                  config.globalKillSwitch
                    ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
                }`}
                title={
                  config.globalKillSwitch
                    ? 'Clique para liberar disparos (Requer testes prévios)'
                    : 'Clique para ativar a trava de segurança'
                }
              >
                {config.globalKillSwitch ? 'Liberar' : 'Travar'}
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Freq: <strong>{config.frequencyMinutes} min</strong>
              </span>
              <span className="text-slate-600">|</span>
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Fonte: <strong>MLB API</strong>
              </span>
            </div>

            {/* Google Workspace & Sheets Auth Action */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-2">
              <GoogleSignInButton
                user={user}
                isLoading={isAuthLoading}
                onSignIn={onSignInGoogle}
                onSignOut={onSignOutGoogle}
                compact
              />

              {user && (
                <button
                  onClick={onOpenSheetsTab}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 text-xs font-semibold rounded-xl transition-all shadow-sm"
                  title="Acessar Gestor de Planilha Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[120px]">
                    {connectedSheetTitle || 'Planilha Conectada'}
                  </span>
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onRunCycle}
                disabled={isRunningCycle}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
                <span>{isRunningCycle ? 'Executando...' : 'Simular Ciclo'}</span>
              </button>

              <button
                onClick={onOpenTroubleshoot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-lg border border-rose-700/60 transition-colors shadow-sm"
                title="Diagnosticar e corrigir os 9 erros identificados"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Corrigir Erros</span>
              </button>

              <button
                onClick={onOpenTests}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">10 Testes</span>
              </button>

              <button
                onClick={onOpenMakeAudit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Diagnóstico Make</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
