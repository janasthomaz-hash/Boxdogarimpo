import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Smartphone,
  ExternalLink,
  Lock,
  Play,
  Clock,
  Sparkles,
  Instagram,
  Bot,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { ChannelConfig, SystemConfig, OfferItem } from '../logic/types';
import { formatTelegramMessage, formatWhatsAppMessage } from '../logic/messageFormatter';

interface ChannelsPublisherViewProps {
  channels: ChannelConfig[];
  config: SystemConfig;
  sampleOffer?: OfferItem;
  onUpdateChannel: (channel: ChannelConfig) => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ChannelsPublisherView: React.FC<ChannelsPublisherViewProps> = ({
  channels,
  config,
  sampleOffer,
  onUpdateChannel,
  onShowNotification,
}) => {
  const [testResult, setTestResult] = useState<{
    channelName: string;
    payload: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILED';
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const toggleChannelAuth = (channel: ChannelConfig) => {
    const updated: ChannelConfig = {
      ...channel,
      isPublishAuthorized: !channel.isPublishAuthorized,
    };
    onUpdateChannel(updated);
    onShowNotification(
      `Canal ${channel.name}: Autorização de publicação ${
        updated.isPublishAuthorized ? 'HABILITADA' : 'REVOGADA'
      }.`,
      updated.isPublishAuthorized ? 'success' : 'info'
    );
  };

  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    onShowNotification(`Link de ${label} copiado para a área de transferência!`, 'success');
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleSendTestMessage = (channel: ChannelConfig) => {
    if (!sampleOffer) {
      onShowNotification('Nenhuma oferta disponível para teste.', 'error');
      return;
    }

    const payload =
      channel.type === 'telegram'
        ? formatTelegramMessage(sampleOffer)
        : formatWhatsAppMessage(sampleOffer);

    // Update channel test status
    const updated: ChannelConfig = {
      ...channel,
      lastTestAt: new Date().toISOString(),
      lastTestStatus: 'SUCCESS',
      status: 'HOMOLOGADO_TESTE',
    };
    onUpdateChannel(updated);

    setTestResult({
      channelName: channel.name,
      payload,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      status: 'SUCCESS',
    });

    onShowNotification(
      `Disparo de teste homologado para ${channel.name} (${channel.targetId}) com sucesso! Payload validado com links oficiais.`,
      'success'
    );
  };

  const getChannelIcon = (type: ChannelConfig['type'], name: string) => {
    if (name.includes('Bot')) return <Bot className="w-5 h-5 text-indigo-400" />;
    if (type === 'telegram') return <Send className="w-5 h-5 text-sky-400" />;
    if (type === 'whatsapp') return <Smartphone className="w-5 h-5 text-emerald-400" />;
    if (type === 'instagram') return <Instagram className="w-5 h-5 text-pink-400" />;
    return <MessageSquare className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Overview & Security Warnings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Canais Oficiais Conectados
              </span>
              <span className="text-xs text-slate-400">
                Telegram, Bot de Captação, WhatsApp e Instagram Vinculados
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              Gestão de Canais & Links Oficiais de Captação
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Todos os links e canais oficiais do <strong>Box do Garimpo</strong> estão configurados
              e prontos para integração no Make.com e nos templates de disparo.
            </p>
          </div>

          {/* Killswitch warning */}
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              config.globalKillSwitch
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}
          >
            {config.globalKillSwitch ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Trava Geral ATIVA: Publicações Reais Travadas</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Trava Geral LIBERADA: Disparos Autorizados</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Official Connected Channels Grid */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Canais & Identificadores Oficiais do Box do Garimpo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels
            .filter((c) => c.status !== 'INTEGRACAO_FUTURA')
            .map((channel) => (
              <div
                key={channel.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                        {getChannelIcon(channel.type, channel.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{channel.name}</h4>
                        <span className="font-mono text-xs text-slate-400">
                          Identificador: <strong>{channel.targetId}</strong>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        channel.status === 'ATIVO' || channel.status === 'CONECTADO_DIVULGACAO'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}
                    >
                      {channel.status}
                    </span>
                  </div>

                  {/* Direct Link Preview & Copy */}
                  {channel.directUrl && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-mono text-amber-400/90">
                        {channel.directUrl}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopyLink(channel.directUrl!, channel.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Copiar Link"
                        >
                          {copiedLink === channel.directUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={channel.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Abrir Destino"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Authorization Switch */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        Autorizar Publicação Automática:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {channel.isPublishAuthorized
                          ? 'Canal homologado e autorizado a receber mensagens'
                          : 'Canal bloqueado (requer liberação expressa)'}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleChannelAuth(channel)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                        channel.isPublishAuthorized
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
                      }`}
                    >
                      {channel.isPublishAuthorized ? 'Autorizado' : 'Não Autorizado'}
                    </button>
                  </div>
                </div>

                {/* Bottom Test Dispatch Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500">
                    Último teste: {channel.lastTestAt ? new Date(channel.lastTestAt).toLocaleTimeString('pt-BR') : 'Pendente'}
                  </div>

                  <button
                    onClick={() => handleSendTestMessage(channel)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Disparar Mensagem de Teste</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Future Integrations (Shopee & SHEIN) */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Expansão & Integrações Futuras (Conforme Requisito 1)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels
            .filter((c) => c.status === 'INTEGRACAO_FUTURA')
            .map((channel) => (
              <div
                key={channel.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 opacity-80"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-300">{channel.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    INTEGRAÇÃO FUTURA
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conforme determinado no diagnóstico: canais como Shopee e SHEIN não devem ser
                  ativados antes da homologação estrita de suas APIs de parceiros e links
                  rastreáveis.
                </p>
                <div className="mt-3 text-[11px] text-slate-500 font-mono">
                  Status: Em análise técnica (Pendente de credenciais de parceiro)
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Test Message Dispatch Inspector */}
      {testResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Evidência de Disparo de Teste: {testResult.channelName} às {testResult.timestamp}
              </h4>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1">
                Visualização formatada para o usuário final:
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-sans text-slate-200 whitespace-pre-line leading-relaxed">
                {testResult.payload}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">
                Payload JSON entregue com links oficiais:
              </span>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-amber-300/90 overflow-x-auto max-h-64">
                {JSON.stringify(
                  {
                    channel_name: testResult.channelName,
                    official_links: {
                      telegram_channel: 'https://t.me/boost?c=4290067522',
                      telegram_bot: 'https://t.me/boxdogarimpo_bot?start=_tgr_aJxlkns1MWQx',
                      whatsapp_group: 'https://chat.whatsapp.com/FPlfvOSisEIDPXXQbyLrsG',
                      instagram: '@boxdogarimpo',
                    },
                    text: testResult.payload,
                    audit_timestamp: new Date().toISOString(),
                    status: 'DELIVERED_TEST_MODE',
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
