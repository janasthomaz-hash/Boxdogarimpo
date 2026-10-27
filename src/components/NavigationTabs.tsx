import React from 'react';
import {
  Activity,
  Layers,
  Table,
  Search,
  Send,
  Sliders,
  CheckCircle2,
  FileText,
  AlertCircle,
  Award,
} from 'lucide-react';

export type TabType =
  | 'cockpit'
  | 'troubleshoot'
  | 'audit-evaluation'
  | 'approval'
  | 'spreadsheet'
  | 'categories'
  | 'channels'
  | 'make-audit'
  | 'tests'
  | 'logs';

interface NavigationTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingApprovalCount: number;
  testsPassedCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalCount,
  testsPassedCount,
}) => {
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: { text: string | number; color: string };
  }> = [
    {
      id: 'cockpit',
      label: 'Cockpit & Pipeline',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'audit-evaluation',
      label: 'Laudo & Avaliação',
      icon: <Award className="w-4 h-4 text-emerald-400" />,
      badge: { text: '100% OK', color: 'bg-emerald-500 text-slate-950 font-bold' },
    },
    {
      id: 'troubleshoot',
      label: 'Correção de Erros (P0-P2)',
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
      badge: { text: '9 Erros & Fixes', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
    },
    {
      id: 'approval',
      label: 'Fila de Ofertas (5 Estados)',
      icon: <Layers className="w-4 h-4" />,
      badge:
        pendingApprovalCount > 0
          ? { text: pendingApprovalCount, color: 'bg-amber-500 text-slate-950 font-bold' }
          : undefined,
    },
    {
      id: 'spreadsheet',
      label: 'Planilha (5 Abas + Página1)',
      icon: <Table className="w-4 h-4" />,
    },
    {
      id: 'categories',
      label: 'Categorias & Busca ML',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'channels',
      label: 'Canais (WhatsApp / Telegram)',
      icon: <Send className="w-4 h-4" />,
    },
    {
      id: 'make-audit',
      label: 'Auditoria Make.com (P0)',
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
      badge: { text: 'Módulo 32', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
    },
    {
      id: 'tests',
      label: '10 Testes Obrigatórios',
      icon: <CheckCircle2 className="w-4 h-4" />,
      badge: {
        text: `${testsPassedCount}/10`,
        color: testsPassedCount === 10 ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300',
      },
    },
    {
      id: 'logs',
      label: 'Logs & Auditoria',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar text-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.badge.color}`}>
                    {tab.badge.text}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
