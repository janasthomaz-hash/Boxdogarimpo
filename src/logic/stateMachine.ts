import { OfferItem, OfferStatus, ChannelConfig, SystemConfig } from './types';
import { validateAffiliateUrl } from './validation';

export interface StateTransitionResult {
  success: boolean;
  fromStatus: OfferStatus;
  toStatus: OfferStatus;
  message: string;
  item: OfferItem;
}

/**
 * Validates whether an offer can transition to the target state.
 */
export function transitionOfferStatus(
  item: OfferItem,
  toStatus: OfferStatus,
  context: {
    systemConfig: SystemConfig;
    channels?: ChannelConfig[];
    rejectionReason?: string;
  }
): StateTransitionResult {
  const fromStatus = item.status;

  // Rejection is possible from any pre-published state
  if (toStatus === 'REJEITADO') {
    return {
      success: true,
      fromStatus,
      toStatus,
      message: `Oferta rejeitada: ${context.rejectionReason || 'Sem motivo especificado'}`,
      item: {
        ...item,
        status: 'REJEITADO',
        rejectionReason: context.rejectionReason || 'Rejeição manual',
      },
    };
  }

  // 1. PRODUTO_ENCONTRADO -> PRODUTO_VALIDADO
  if (toStatus === 'PRODUTO_VALIDADO') {
    if (!item.stockAvailable) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: Produto sem estoque disponível.',
        item,
      };
    }
    if (item.currentPrice <= 0) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: Preço inválido ou zerado.',
        item,
      };
    }
    if (item.discountPercent < context.systemConfig.minDiscountPercent) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: `Falha: Desconto de ${item.discountPercent}% abaixo do mínimo configurado (${context.systemConfig.minDiscountPercent}%).`,
        item,
      };
    }

    return {
      success: true,
      fromStatus,
      toStatus,
      message: 'Produto validado com sucesso (preço, estoque e reputação aprovados).',
      item: {
        ...item,
        status: 'PRODUTO_VALIDADO',
        validatedAt: new Date().toISOString(),
      },
    };
  }

  // 2. PRODUTO_VALIDADO -> AFILIADO_CONFIRMADO
  if (toStatus === 'AFILIADO_CONFIRMADO') {
    if (fromStatus !== 'PRODUTO_VALIDADO') {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: O produto deve ser validado comercialmente antes de confirmar o afiliado.',
        item,
      };
    }
    if (
      !item.isAffiliateValid ||
      item.affiliateVerificationStatus !== 'VERIFIED' ||
      !item.affiliateOfficialUrl ||
      !validateAffiliateUrl(item.affiliateUrl, context.systemConfig.affiliateTag, item.affiliateOfficialUrl)
    ) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: Link de afiliado não possui método autorizado ou rastreamento confirmado.',
        item,
      };
    }

    return {
      success: true,
      fromStatus,
      toStatus,
      message: 'Link de afiliado confirmado e testado com método rastreável.',
      item: {
        ...item,
        status: 'AFILIADO_CONFIRMADO',
      },
    };
  }

  // 3. AFILIADO_CONFIRMADO -> APROVADO_PUBLICACAO
  if (toStatus === 'APROVADO_PUBLICACAO') {
    if (fromStatus !== 'AFILIADO_CONFIRMADO') {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: Link de afiliado precisa estar confirmado antes de aprovação final.',
        item,
      };
    }

    return {
      success: true,
      fromStatus,
      toStatus,
      message: 'Oferta aprovada para publicação. Disponível na fila de envio.',
      item: {
        ...item,
        status: 'APROVADO_PUBLICACAO',
        approvedAt: new Date().toISOString(),
      },
    };
  }

  // 4. APROVADO_PUBLICACAO -> PUBLICADO
  if (toStatus === 'PUBLICADO') {
    if (fromStatus !== 'APROVADO_PUBLICACAO') {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: A oferta precisa estar no estado APROVADO_PUBLICACAO antes de ser enviada.',
        item,
      };
    }

    // Safety checks
    if (context.systemConfig.globalKillSwitch) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message:
          'BLOQUEIO DE SEGURANÇA: O Interruptor Geral de Publicação está ATIVO (Publicações Travadas). Nenhuma oferta pode ser disparada.',
        item,
      };
    }

    // Final fail-closed gate: never publish a raw or unverified affiliate URL.
    if (
      !item.stockAvailable ||
      !Number.isFinite(item.currentPrice) ||
      item.currentPrice <= 0 ||
      !item.isAffiliateValid ||
      item.affiliateVerificationStatus !== 'VERIFIED' ||
      !item.affiliateOfficialUrl ||
      !validateAffiliateUrl(item.affiliateUrl, context.systemConfig.affiliateTag, item.affiliateOfficialUrl)
    ) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'BLOQUEIO DE SEGURANÇA: preço/estoque ou rastreamento oficial não comprovado. Publicação recusada.',
        item,
      };
    }

    const authorizedChannels = (context.channels || []).filter(
      (ch) =>
        ch.isPublishAuthorized &&
        ch.status === 'ATIVO' &&
        ch.lastTestStatus === 'SUCCESS' &&
        Boolean(ch.lastTestAt) &&
        Date.now() - new Date(ch.lastTestAt as string).getTime() >= 0 &&
        Date.now() - new Date(ch.lastTestAt as string).getTime() <= 24 * 60 * 60 * 1000
    );

    if (authorizedChannels.length === 0) {
      return {
        success: false,
        fromStatus,
        toStatus,
        message: 'Falha: Nenhum canal com autorização explícita e conexão homologada para publicação.',
        item,
      };
    }

    return {
      success: true,
      fromStatus,
      toStatus,
      message: `Oferta publicada com sucesso nos canais autorizados (${authorizedChannels.map((c) => c.name).join(', ')}).`,
      item: {
        ...item,
        status: 'PUBLICADO',
        publishedAt: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    fromStatus,
    toStatus,
    message: `Transição inválida de ${fromStatus} para ${toStatus}.`,
    item,
  };
}
