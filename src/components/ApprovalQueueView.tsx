import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Eye,
  XCircle,
  Clock,
  Sparkles,
  Link as LinkIcon,
  ShoppingBag,
  Truck,
  ShieldCheck,
  History,
  TrendingDown,
  ChevronDown,
} from 'lucide-react';
import { OfferItem, OfferStatus, SystemConfig, ChannelConfig } from '../logic/types';
import { generateAuthorizedAffiliateUrl } from '../logic/validation';
import { transitionOfferStatus } from '../logic/stateMachine';

interface ApprovalQueueViewProps {
  offers: OfferItem[];
  config: SystemConfig;
  channels: ChannelConfig[];
  onUpdateOffer: (updated: OfferItem) => void;
  onPreviewMessage: (offer: OfferItem) => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  offers,
  config,
  channels,
  onUpdateOffer,
  onPreviewMessage,
  onShowNotification,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const filterTabs: Array<{ id: string; label: string; count: number }> = [
    { id: 'ALL', label: 'Todas as Ofertas', count: offers.length },
    {
      id: 'PRODUTO_ENCONTRADO',
      label: '1. Encontrado',
      count: offers.filter((o) => o.status === 'PRODUTO_ENCONTRADO').length,
    },
    {
      id: 'PRODUTO_VALIDADO',
      label: '2. Validado',
      count: offers.filter((o) => o.status === 'PRODUTO_VALIDADO').length,
    },
    {
      id: 'AFILIADO_CONFIRMADO',
      label: '3. Afiliado Confirmado',
      count: offers.filter((o) => o.status === 'AFILIADO_CONFIRMADO').length,
    },
    {
      id: 'APROVADO_PUBLICACAO',
      label: '4. Aprovado p/ Envio',
      count: offers.filter((o) => o.status === 'APROVADO_PUBLICACAO').length,
    },
    {
      id: 'PUBLICADO',
      label: '5. Publicado',
      count: offers.filter((o) => o.status === 'PUBLICADO').length,
    },
    {
      id: 'REJEITADO',
      label: 'Rejeitadas',
      count: offers.filter((o) => o.status === 'REJEITADO').length,
    },
  ];

  const filteredOffers =
    selectedFilter === 'ALL'
      ? offers
      : offers.filter((o) => o.status === (selectedFilter as OfferStatus));

  const handleValidateCommercial = (item: OfferItem) => {
    const res = transitionOfferStatus(item, 'PRODUTO_VALIDADO', { systemConfig: config });
    if (res.success) {
      onUpdateOffer(res.item);
      onShowNotification(`Oferta ${item.mlbId} validada comercialmente com sucesso!`, 'success');
    } else {
      onShowNotification(res.message, 'error');
    }
  };

  const handleGenerateAffiliate = (item: OfferItem) => {
    const gen = generateAuthorizedAffiliateUrl(item.permalink, item.mlbId, config.affiliateTag);
    // The official affiliate-platform adapter is not implemented. Never store or approve a fabricated URL.
    onUpdateOffer({
      ...item,
      affiliateUrl: '',
      isAffiliateValid: false,
      affiliateVerificationStatus: 'UNVERIFIED',
      affiliateOfficialUrl: undefined,
      status: 'PRODUTO_VALIDADO',
    });
    onShowNotification(
      gen.isValid && gen.affiliateUrl
        ? 'URL retornada; ainda é necessária validação independente da resposta oficial antes de aprovar.'
        : 'Link não gerado: a integração oficial de afiliados não está implementada. A oferta continua bloqueada.',
      'info'
    );
  };

  const handleApproveForPublication = (item: OfferItem) => {
    const res = transitionOfferStatus(item, 'APROVADO_PUBLICACAO', { systemConfig: config });
    if (res.success) {
      onUpdateOffer(res.item);
      onShowNotification(
        `Oferta ${item.mlbId} aprovada para publicação e enfileirada!`,
        'success'
      );
    } else {
      onShowNotification(res.message, 'error');
    }
  };

  const handlePublishNow = (_item: OfferItem) => {
    // This UI has no real delivery adapter. A state transition is not proof of external delivery.
    onShowNotification(
      'Publicação externa bloqueada: o adaptador de envio e a confirmação de entrega ainda não estão implementados.',
      'info'
    );
  };

  const handleRejectOffer = (item: OfferItem) => {
    const reason = prompt('Informe o motivo da rejeição da oferta:') || 'Descartado pelo operador';
    const res = transitionOfferStatus(item, 'REJEITADO', {
      systemConfig: config,
      rejectionReason: reason,
    });
    if (res.success) {
      onUpdateOffer(res.item);
      onShowNotification(`Oferta rejeitada: ${reason}`, 'info');
    }
  };

  const getStatusBadge = (status: OfferStatus) => {
    switch (status) {
      case 'PRODUTO_ENCONTRADO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            1. Encontrado
          </span>
        );
      case 'PRODUTO_VALIDADO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/60">
            2. Validado
          </span>
        );
      case 'AFILIADO_CONFIRMADO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <LinkIcon className="w-3 h-3" /> 3. Afiliado Confirmado
          </span>
        );
      case 'APROVADO_PUBLICACAO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-900/50 text-amber-300 border border-amber-500/60 font-semibold animate-pulse">
            4. Aprovado p/ Envio
          </span>
        );
      case 'PUBLICADO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-sky-900/50 text-sky-300 border border-sky-600/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-400" /> 5. Publicado
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-rose-900/50 text-rose-300 border border-rose-700/60">
            Rejeitado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Strategy Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Fila de Aprovação & Máquina de Estados
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Regra rígida de segurança: nenhuma oferta é publicada sem link de afiliado confirmado e
            aprovação expressa.
          </p>
        </div>

        {/* Global Lock Warning Indicator */}
        {config.globalKillSwitch && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Trava de Segurança Ativa:</strong> O envio para WhatsApp/Telegram está
              bloqueado globalmente no cabeçalho.
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedFilter === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedFilter === tab.id
                  ? 'bg-slate-950/20 text-slate-950 font-bold'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Offers Cards Grid */}
      {filteredOffers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            Nenhuma oferta nesta categoria de estado
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Simule um ciclo na tela inicial ou execute uma busca no Scanner de Categorias.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOffers.map((offer) => {
            const savings = offer.originalPrice - offer.currentPrice;
            const isHistoryOpen = expandedHistoryId === offer.id;

            return (
              <div
                key={offer.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md">
                      {offer.category}
                    </span>
                    {getStatusBadge(offer.status)}
                  </div>

                  {/* Main Product Info */}
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={offer.thumbnail}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-slate-900/90 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                        -{offer.discountPercent}%
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h4
                        className="text-sm font-bold text-white line-clamp-2 leading-snug hover:text-amber-300 cursor-pointer"
                        title={offer.title}
                      >
                        {offer.title}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-500">
                          ID: {offer.mlbId}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">
                          {offer.sellerReputation}
                        </span>
                      </div>

                      {/* Pricing block */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-xs text-slate-500 line-through">
                          R$ {offer.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-lg font-extrabold text-amber-400">
                          R$ {offer.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-2">
                        <span>
                          Economia real de R${' '}
                          {savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {offer.freeShipping && (
                          <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" /> Frete Grátis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quality & Affiliate Badges */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-slate-300 font-medium text-[11px]"
                        title="Score de Oportunidade (0-100)"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Score: {offer.opportunityScore}/100</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border ${
                          offer.isAffiliateValid
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-800 text-amber-300'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>
                          {offer.isAffiliateValid ? 'Afiliado Validado' : 'Link Sem Rastreamento'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedHistoryId(isHistoryOpen ? null : offer.id)}
                      className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{offer.history?.length || 1} registros</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Price History Dropdown */}
                  {isHistoryOpen && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="font-semibold text-slate-300 flex items-center justify-between">
                        <span>Histórico de Preços e Coletas:</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Hash: {offer.stableHash.slice(0, 10)}...
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {(offer.history || []).map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800/60 text-[11px]"
                          >
                            <div>
                              <span className="text-amber-400 font-bold">
                                R$ {h.price.toFixed(2)}
                              </span>{' '}
                              <span className="text-slate-500">(-{h.discountPercent}%)</span>
                              <div className="text-[10px] text-slate-500">{h.notes}</div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(h.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="mt-5 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPreviewMessage(offer)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                      title="Ver preview formatado para Telegram e WhatsApp"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Mensagem</span>
                    </button>

                    <a
                      href={offer.affiliateUrl || offer.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                      title="Abrir página no Mercado Livre"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ver no ML</span>
                    </a>
                  </div>

                  {/* State Transition Actions */}
                  <div className="flex items-center gap-2">
                    {offer.status === 'PRODUTO_ENCONTRADO' && (
                      <button
                        onClick={() => handleValidateCommercial(offer)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        Validar Comercial
                      </button>
                    )}

                    {offer.status === 'PRODUTO_VALIDADO' && (
                      <button
                        onClick={() => handleGenerateAffiliate(offer)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Gerar Afiliado</span>
                      </button>
                    )}

                    {offer.status === 'AFILIADO_CONFIRMADO' && (
                      <button
                        onClick={() => handleApproveForPublication(offer)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
                      >
                        Aprovar Envio
                      </button>
                    )}

                    {offer.status === 'APROVADO_PUBLICACAO' && (
                      <button
                        type="button"
                        disabled
                        title="Envio externo ainda não integrado"
                        className="px-3.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 opacity-60 cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envio não integrado</span>
                      </button>
                    )}

                    {offer.status !== 'REJEITADO' && offer.status !== 'PUBLICADO' && (
                      <button
                        onClick={() => handleRejectOffer(offer)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-500 transition-colors"
                        title="Rejeitar Oferta"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
