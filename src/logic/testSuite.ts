import { MandatoryTestItem, SystemConfig, OfferItem, ChannelConfig } from './types';
import { generateStableHash } from './hash';
import { calculateDiscount, generateAuthorizedAffiliateUrl, validateAffiliateUrl } from './validation';
import { evaluateDeduplication, recordPriceHistory } from './deduplication';
import { generateIdempotentSheetCreationPayload } from './sheetSchema';
import { transitionOfferStatus } from './stateMachine';

export const INITIAL_MANDATORY_TESTS: MandatoryTestItem[] = [
  {
    id: 1,
    name: 'Conexão com a Fonte',
    description: 'Faz uma requisição HTTP real ao endpoint de metadados MLB; não representa teste do endpoint de busca.',
    expectedResult: 'HTTP 200 e payload MLB válido; endpoints de busca precisam de teste separado.',
    status: 'PENDING',
  },
  {
    id: 2,
    name: 'Cobertura de Categorias',
    description: 'Confere configuração de categorias; consulta real por categoria permanece pendente até testar a integração.',
    expectedResult: 'Categorias ativas configuradas e consulta real comprovada para cada categoria.',
    status: 'PENDING',
  },
  {
    id: 3,
    name: 'Validação unitária de preço e desconto',
    description: 'Testa somente a função local de cálculo; preço, moeda, estoque e vendedor reais exigem dados da API.',
    expectedResult: 'Cálculos unitários corretos; validação comercial externa não é inferida por este teste.',
    status: 'PENDING',
  },
  {
    id: 4,
    name: 'Bloqueio seguro de link não verificado',
    description: 'Confirma que o sistema não inventa URL rastreável quando a integração oficial não existe.',
    expectedResult: 'Sem URL fabricada; publicação bloqueada até integração e confirmação oficiais.',
    status: 'PENDING',
  },
  {
    id: 5,
    name: 'Deduplicação por Hash Estável',
    description: 'Evita republicação indevida da mesma oferta usando hash canônico e regras de cooldown.',
    expectedResult: 'Mesma oferta rejeitada ou detectada como queda de preço expressiva.',
    status: 'PENDING',
  },
  {
    id: 6,
    name: 'Histórico de Preços Não-Destrutivo',
    description: 'Registra evolução cronológica sem sobrescrever coletas anteriores.',
    expectedResult: 'Array de histórico preservado cronologicamente a cada checagem.',
    status: 'PENDING',
  },
  {
    id: 7,
    name: 'Planilha: 5 Abas e Página1 Preservada',
    description: 'Valida idempotência da criação de CONFIG, OFERTAS, HISTORICO, CANAIS, LOGS mantendo Página1.',
    expectedResult: 'Sem erros 400 por abas duplicadas e dados originais 100% preservados.',
    status: 'PENDING',
  },
  {
    id: 8,
    name: 'Canal de Destino (WhatsApp & Telegram)',
    description: 'Verifica se há evidência de entrega externa; não envia mensagem automaticamente.',
    expectedResult: 'Entrega confirmada por resposta real do provedor; caso contrário, status PENDING.',
    status: 'PENDING',
  },
  {
    id: 9,
    name: 'Erros e Limites de Requisição',
    description: 'Testa rate limiting, consumo de créditos e política de retry com backoff.',
    expectedResult: 'Rate limit, retry/backoff e resposta HTTP 429 exercitados em integração real.',
    status: 'PENDING',
  },
  {
    id: 10,
    name: 'Execução Recorrente (15 Minutos)',
    description: 'Configura periodicidade definitiva de 15 minutos com trava anti-sobreposição.',
    expectedResult: 'Agendamento e lock conferidos no cenário real do Make; configuração local não é evidência.',
    status: 'PENDING',
  },
];

/**
 * Runs a specific mandatory test and returns the execution report.
 */
export async function runSingleMandatoryTest(
  testId: number,
  config: SystemConfig,
  sampleOffers: OfferItem[],
  sampleChannels: ChannelConfig[]
): Promise<{ status: 'PASSED' | 'FAILED' | 'PENDING'; details: string }> {
  try {
    switch (testId) {
      case 1: {
        // Teste HTTP real com timeout; não simula status nem disponibilidade.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch('https://api.mercadolibre.com/sites/MLB', {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
          });
          if (!response.ok) {
            return { status: 'FAILED', details: `API Mercado Livre respondeu HTTP ${response.status}; conectividade não homologada.` };
          }
          const payload: unknown = await response.json();
          if (!payload || typeof payload !== 'object' || !('id' in payload) || (payload as { id?: unknown }).id !== 'MLB') {
            return { status: 'FAILED', details: 'Resposta HTTP recebida, mas o corpo não corresponde ao site MLB esperado.' };
          }
          return { status: 'PASSED', details: 'Requisição HTTP real concluída: HTTP 200 e payload MLB validado. Este teste não comprova acesso aos endpoints de busca de produtos.' };
        } finally {
          clearTimeout(timeout);
        }
      }

      case 2: {
        // Cobertura de categorias
        const enabledCategories = config.authorizedCategories.filter((c) => c.enabled);
        if (enabledCategories.length < 3) {
          return {
            status: 'FAILED',
            details: `Apenas ${enabledCategories.length} categorias ativas. Requisito exige cobertura além da busca fixa 'celular'.`,
          };
        }
        return {
          status: 'PENDING',
          details: `${enabledCategories.length} categorias habilitadas na configuração (${enabledCategories.map((c) => c.name).join(', ')}). Isso não comprova que as consultas reais por categoria estão implementadas ou acessíveis; validar integração de coleta.`,
        };
      }

      case 3: {
        // Preço e disponibilidade
        const testCalc = calculateDiscount(1999, 2999);
        const fakeCalc = calculateDiscount(2999, 3010); // < 1% discount
        if (testCalc.discountPercent === 33 && fakeCalc.isFakeDiscount) {
          return {
            status: 'PASSED',
            details: `Cálculo de desconto homologado: 33% real detectado. Heurística de desconto falso (<3% ou >92%) funcionando com sucesso.`,
          };
        }
        return { status: 'FAILED', details: 'Falha no cálculo de desconto ou validação de preço.' };
      }

      case 4: {
        // Testa que o sistema NÃO inventa links rastreáveis quando a integração oficial falta.
        const generated = generateAuthorizedAffiliateUrl(
          'https://www.mercadolivre.com.br/apple-iphone-15-128-gb-preto/p/MLB28501234',
          'MLB28501234',
          config.affiliateTag
        );
        const rawUrlAccepted = validateAffiliateUrl('https://www.mercadolivre.com.br/apple-iphone-15-128-gb-preto/p/MLB28501234', config.affiliateTag);
        const fabricatedUrlAccepted = validateAffiliateUrl(
          'https://www.mercadolivre.com.br/sec/teste?matt_word=boxdogarimpo',
          config.affiliateTag
        );
        const sample = sampleOffers[0];
        const transition = sample
          ? transitionOfferStatus(
              { ...sample, status: 'PRODUTO_VALIDADO', affiliateUrl: '', isAffiliateValid: false, affiliateVerificationStatus: 'UNVERIFIED' },
              'AFILIADO_CONFIRMADO',
              { systemConfig: config }
            )
          : null;
        if (!generated.isValid && !generated.affiliateUrl && !rawUrlAccepted && !fabricatedUrlAccepted && transition && !transition.success) {
          return { status: 'PASSED', details: 'Fail-closed aprovado: não fabrica nem aceita URL sem prova oficial e a máquina de estados bloqueia a transição para AFILIADO_CONFIRMADO. Integração oficial ainda pendente.' };
        }
        return { status: 'FAILED', details: 'Falha crítica: URL não comprovada aceita ou transição para afiliado confirmada liberada.' };
      }

      case 5: {
        // Deduplicação por hash estável
        const hash1 = generateStableHash('MLB100', 'Smartphone Galaxy S23', 'Samsung Oficial');
        const hash2 = generateStableHash('MLB100', 'smartphone galaxy s23', 'samsung oficial');
        if (hash1 !== hash2) {
          return { status: 'FAILED', details: 'Hash não normalizado: produziu hashes diferentes para mesmo item.' };
        }

        if (!sampleOffers[0]) return { status: 'FAILED', details: 'Não há oferta de amostra para executar o teste de deduplicação.' };
        const dummyItem: OfferItem = {
          ...sampleOffers[0],
          stableHash: hash1,
          mlbId: 'MLB100',
          currentPrice: 2000,
          status: 'PUBLICADO',
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const duplicateCheck = evaluateDeduplication(dummyItem, [dummyItem], {
          cooldownDays: 7,
          priceDropThresholdPercent: 5,
        });

        if (duplicateCheck.isDuplicate && duplicateCheck.action === 'SUPPRESS_IDENTICAL') {
          return {
            status: 'PASSED',
            details: `Hash estável ${hash1.slice(0, 8)}... validado. Deduplicação bloqueou republicação dentro do cooldown de 7 dias com preço idêntico.`,
          };
        }
        return { status: 'FAILED', details: 'Deduplicação falhou em suprimir item repetido.' };
      }

      case 6: {
        // Histórico
        const baseItem = sampleOffers[0];
        if (!baseItem) return { status: 'FAILED', details: 'Não há oferta de amostra para testar o histórico de preços.' };
        const updated = recordPriceHistory(baseItem, 1899, 2999, 'Teste unitário local');
        if (updated.history.length > (baseItem.history?.length || 0)) {
          return {
            status: 'PASSED',
            details: `Histórico validado: novo ponto de preço registrado (R$ 1.899,00) sem apagar observações anteriores (${updated.history.length} eventos no histórico).`,
          };
        }
        return { status: 'FAILED', details: 'Histórico sobrescreveu coletas anteriores.' };
      }

      case 7: {
        // A geração local do payload não prova que a planilha real foi lida ou alterada.
        const idempotentPayload = generateIdempotentSheetCreationPayload(['Página1', 'CONFIG']);
        if (
          idempotentPayload.missingTabs.includes('OFERTAS') &&
          idempotentPayload.existingTabs.includes('CONFIG') &&
          !idempotentPayload.missingTabs.includes('CONFIG')
        ) {
          return {
            status: 'PENDING',
            details: 'Validação local do payload idempotente concluída, mas a integração real com Google Sheets não foi exercitada. Confirmar leitura dos metadados, criação apenas das abas ausentes e preservação de Página1 em uma planilha de teste antes de aprovar.',
          };
        }
        return { status: 'FAILED', details: 'A validação local gerou um payload inconsistente; a integração real também permanece não homologada.' };
      }

      case 8: {
        // A configuração local não prova que uma mensagem foi entregue.
        const authorized = sampleChannels.filter((channel) =>
          channel.isPublishAuthorized &&
          (channel.status === 'ATIVO' || channel.status === 'HOMOLOGADO_TESTE') &&
          channel.lastTestStatus === 'SUCCESS' &&
          Boolean(channel.lastTestAt)
        );
        if (authorized.length === 0) {
          return { status: 'PENDING', details: 'Nenhum canal tem evidência recente de teste de entrega. Não foi enviada mensagem de teste; não marcar canal como homologado.' };
        }
        return { status: 'PENDING', details: `${authorized.length} canal(is) têm metadados de teste, mas a entrega precisa ser confirmada por resposta real da API do provedor antes da homologação.` };
      }

      case 9: {
        // Validar um número de configuração não testa rate-limit nem retry em execução.
        if (!Number.isInteger(config.requestRateLimitPerCycle) || config.requestRateLimitPerCycle < 1 || config.requestRateLimitPerCycle > 50) {
          return { status: 'FAILED', details: 'Limite configurado inválido; esperado inteiro entre 1 e 50 por ciclo.' };
        }
        return { status: 'PENDING', details: `Configuração dentro do intervalo (${config.requestRateLimitPerCycle}), mas rate-limit, backoff e tratamento HTTP 429 não foram exercitados por teste de integração.` };
      }

      case 10: {
        // A configuração local não consulta o cenário nem os triggers reais do Make.
        if (!Number.isInteger(config.frequencyMinutes) || config.frequencyMinutes < 1) {
          return { status: 'FAILED', details: 'Frequência local inválida; esperado inteiro positivo.' };
        }
        return { status: 'PENDING', details: `Frequência configurada localmente: ${config.frequencyMinutes} min. Agendamento real e trava anti-sobreposição só podem ser homologados consultando e executando o cenário Make.` };
      }

      default:
        return { status: 'FAILED', details: 'ID de teste desconhecido.' };
    }
  } catch (err: any) {
    return { status: 'FAILED', details: `Erro de execução: ${err.message}` };
  }
}
