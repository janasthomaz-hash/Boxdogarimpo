import { OfferItem } from './types';

/**
 * Formats an offer for Telegram channels (MarkdownV2 or HTML formatted).
 */
export function formatTelegramMessage(item: OfferItem): string {
  const savings = item.originalPrice - item.currentPrice;
  const freeShippingText = item.freeShipping ? '🚚 *Frete Grátis*' : '📦 Frete a consultar';
  const installmentsText = item.installments ? `💳 ${item.installments}` : '';

  return `🔥 *GARIMPO CONFIRMADO!* 🔥

📦 *${item.title}*

❌ De: ~R$ ${item.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}~
💰 *Por: R$ ${item.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*
📉 *Desconto: ${item.discountPercent}% OFF* (Economia de R$ ${savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

${freeShippingText}
${installmentsText}
⭐ Vendedor: ${item.sellerReputation}

🛒 *LINK SEGURO & VERIFICADO:*
${item.affiliateUrl || item.permalink}

⚠️ _Preço sujeito a alteração ou término do estoque pelo vendedor._
📍 *Canal Telegram:* https://t.me/boost?c=4290067522
🤖 *Ativar Alertas no Bot:* https://t.me/boxdogarimpo_bot?start=_tgr_aJxlkns1MWQx
📸 *Instagram:* @boxdogarimpo`;
}

/**
 * Formats an offer for WhatsApp broadcast groups / channels.
 */
export function formatWhatsAppMessage(item: OfferItem): string {
  const savings = item.originalPrice - item.currentPrice;
  const freeShipping = item.freeShipping ? '✅ Frete Grátis disponível' : '';

  return `⚡ *BOX DO GARIMPO — OFERTA TESTADA* ⚡

*${item.title}*

De: ~R$ ${item.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}~
*Por: R$ ${item.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*
🔥 *${item.discountPercent}% DE DESCONTO REAL* (Economize R$ ${savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

${freeShipping}
${item.installments ? `💳 ${item.installments}` : ''}
🛡️ Compra Garantida via Mercado Livre (${item.sellerReputation})

👉 *Pegar Oferta aqui:*
${item.affiliateUrl || item.permalink}

👥 *Entre no Grupo VIP do WhatsApp:*
https://chat.whatsapp.com/FPlfvOSisEIDPXXQbyLrsG

📸 Siga no Instagram: @boxdogarimpo
_Aviso: As ofertas podem esgotar rapidamente._`;
}
