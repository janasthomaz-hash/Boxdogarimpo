import React, { useState } from 'react';
import { Send, Smartphone, Copy, Check, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { OfferItem } from '../logic/types';
import { formatTelegramMessage, formatWhatsAppMessage } from '../logic/messageFormatter';

interface MessagePreviewModalProps {
  offer: OfferItem | null;
  onClose: () => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MessagePreviewModal: React.FC<MessagePreviewModalProps> = ({
  offer,
  onClose,
  onShowNotification,
}) => {
  if (!offer) return null;

  const [activeTab, setActiveTab] = useState<'telegram' | 'whatsapp'>('telegram');
  const [copied, setCopied] = useState(false);

  const telegramText = formatTelegramMessage(offer);
  const whatsAppText = formatWhatsAppMessage(offer);
  const currentText = activeTab === 'telegram' ? telegramText : whatsAppText;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    onShowNotification(
      `Mensagem formatada para ${activeTab === 'telegram' ? 'Telegram' : 'WhatsApp'} copiada!`,
      'success'
    );
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              {activeTab === 'telegram' ? (
                <Send className="w-5 h-5 text-sky-400" />
              ) : (
                <Smartphone className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Preview de Mensagem de Oferta</h3>
              <span className="text-[11px] text-slate-400">
                Canal: {activeTab === 'telegram' ? '@boxdogarimpo' : 'boxdogarimpo'}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'telegram'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram (@boxdogarimpo)</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>WhatsApp (boxdogarimpo)</span>
          </button>
        </div>

        {/* Message Rendering Bubble */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Visualização da mensagem enviada:</span>
            {offer.isAffiliateValid && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Link de Afiliado Confirmado
              </span>
            )}
          </div>

          <div
            className={`p-4 rounded-xl border text-xs font-sans whitespace-pre-line leading-relaxed max-h-72 overflow-y-auto ${
              activeTab === 'telegram'
                ? 'bg-slate-950 border-sky-900/50 text-slate-200'
                : 'bg-emerald-950/20 border-emerald-900/40 text-slate-200'
            }`}
          >
            {currentText}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-500">
            MLB: {offer.mlbId} • -{offer.discountPercent}%
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
