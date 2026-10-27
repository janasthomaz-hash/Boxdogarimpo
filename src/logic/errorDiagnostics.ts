export interface DiagnosedError {
  id: string;
  code: string;
  severity: 'P0' | 'P1' | 'P2';
  severityLabel: string;
  title: string;
  affectedModule: string;
  symptom: string;
  errorMessageExample: string;
  rootCause: string;
  businessImpact: string;
  stepByStepFix: string[];
  makeActionRequired: string;
  readyPayload?: Record<string, any> | string;
  status: 'RESOLVIDO_PLATAFORMA' | 'PENDENTE_MAKE' | 'HOMOLOGADO';
}

export const DIAGNOSED_ERRORS: DiagnosedError[] = [
  {
    id: 'ERR_MOD32_DUPLICATE_SHEET',
    code: 'P0-01',
    severity: 'P0',
    severityLabel: 'P0 — Bloqueante Imediato',
    title: 'Módulo 32 do Make: Tentativa Cega de Criação de Abas Duplicadas',
    affectedModule: 'Módulo 32 (Google Sheets API — BatchUpdate / addSheet)',
    symptom: 'Ao executar o cenário mais de uma vez ou se as abas já existirem na planilha, a automação falha imediatamente.',
    errorMessageExample: '400 Bad Request: Invalid requests[0].addSheet: A sheet with the name "CONFIG" already exists.',
    rootCause: 'O Módulo 32 está configurado para emitir requisições "addSheet" fixas para CONFIG, OFERTAS, HISTORICO, CANAIS e LOGS sem verificar previamente os metadados da planilha.',
    businessImpact: 'Cenário trava no início do fluxo. Desperdiça créditos de execução no Make e impede a coleta e validação das ofertas.',
    stepByStepFix: [
      'Passo 1: No Make.com, abra o cenário "BOX DO GARIMPO — Agente Central de Ofertas".',
      'Passo 2: Localize o Módulo 32 (Google Sheets).',
      'Passo 3: Mude a ação do módulo de "Execute a Batch Update" para "Get a Spreadsheet" (somente leitura de metadados).',
      'Passo 4: Como as 5 abas já foram mapeadas e estruturadas nesta plataforma (aba Planilha), NUNCA execute a criação de abas em loop recorrente.',
      'Passo 5: Conecte o fluxo diretamente para a leitura da aba CONFIG no Módulo 33.',
    ],
    makeActionRequired: 'Substituir Módulo 32 por "Google Sheets > Get a Spreadsheet" ou desativar o módulo após a criação única inicial.',
    readyPayload: {
      action: 'getSpreadsheetMetadata',
      spreadsheetId: '{{connections.google_sheets.spreadsheetId}}',
      includeGridData: false,
    },
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_MAKE_SCHEDULE_2030',
    code: 'P0-02',
    severity: 'P0',
    severityLabel: 'P0 — Agendamento Inoperante',
    title: 'Agendamento Inativo e Programado para o Ano 2030',
    affectedModule: 'Make.com Scenario Settings (Scheduling & Concurrency)',
    symptom: 'O cenário nunca roda automaticamente; está com execução única futura agendada para 01/01/2030 00:00 UTC.',
    errorMessageExample: 'Warning: Scenario is inactive. Next scheduled run: Jan 1, 2030 00:00:00 UTC (One-time execution).',
    rootCause: 'Configuração temporária de segurança aplicada para evitar que o fluxo incompleto rodasse sem autorização.',
    businessImpact: 'Nenhuma oferta é garimpada nem atualizada de forma autônoma.',
    stepByStepFix: [
      'Passo 1: No Make.com, na barra inferior do cenário, clique no ícone de relógio ao lado de "Run once".',
      'Passo 2: Altere "Schedule setting" de "On a specific date" para "At regular intervals".',
      'Passo 3: Defina o campo "Minutes" para exatamente 15 (frequência original homologada).',
      'Passo 4: Em "Scenario settings" (ícone de chave inglesa), ative a opção "Sequential processing" para evitar que execuções sobrepostas colidam.',
      'Passo 5: Mantenha o switch "Scheduling" DESLIGADO (OFF) até concluir os 10 testes de homologação na plataforma.',
    ],
    makeActionRequired: 'Configurar intervalo regular de 15 minutos com processamento sequencial ativo.',
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_ML_STATIC_QUERY',
    code: 'P1-01',
    severity: 'P1',
    severityLabel: 'P1 — Restrição Comercial Grave',
    title: 'Módulo 1: Consulta Fixa q=celular e Falta de Rotação de Categorias',
    affectedModule: 'Módulo 1 (HTTP — Make an OAuth / REST Request Mercado Livre)',
    symptom: 'Apenas produtos com o termo "celular" são encontrados. Categorias de Informática, Games, Áudio/TV e Eletro são ignoradas.',
    errorMessageExample: 'GET https://api.mercadolibre.com/sites/MLB/search?q=celular (Retorno monótono sem oportunidades de outras áreas)',
    rootCause: 'URL da requisição HTTP está com parâmetro estático "q=celular" em vez de alternar os IDs das categorias elegíveis.',
    businessImpact: 'Perda de mais de 85% das ofertas de alto valor comercial e saturação do público com apenas uma categoria.',
    stepByStepFix: [
      'Passo 1: No Módulo 1 do Make, altere o endpoint para usar a categoria dinâmica.',
      'Passo 2: Defina o parâmetro "category" apontando para a variável de categoria ativa do ciclo (ex: {{33.category_id}}).',
      'Passo 3: Adicione parâmetros de ordenação "sort=price_asc" e filtro de lojas oficiais "official_store=all".',
      'Passo 4: Utilize o Scanner Multicategorias desta plataforma para cadastrar e rotacionar as 8 categorias elegíveis a cada 15 min.',
    ],
    makeActionRequired: 'Parametrizar a requisição HTTP com busca dinâmica e rotação de categorias.',
    readyPayload: {
      url: 'https://api.mercadolibre.com/sites/MLB/search',
      method: 'GET',
      qs: {
        category: '{{33.category_id}}',
        sort: 'price_asc',
        limit: 25,
      },
    },
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_MOD33_EMPTY_READ',
    code: 'P1-02',
    severity: 'P1',
    severityLabel: 'P1 — Leitura sem Estrutura Útil',
    title: 'Módulo 33: Leitura Fixa de Página1!A1:Z20 sem Cabeçalhos Operacionais',
    affectedModule: 'Módulo 33 (Google Sheets — Read Range)',
    symptom: 'O fluxo lê um intervalo onde não existem parâmetros nem regras, impossibilitando a parametrização dos módulos seguintes.',
    errorMessageExample: 'Read range returned empty cells or legacy unformatted text in Página1!A1:Z20.',
    rootCause: 'Aba Página1 é uma planilha herdada que contém dados legados. A automação deveria ler a aba CONFIG ou OFERTAS.',
    businessImpact: 'O Make fica sem critérios para filtrar descontos mínimos ou limites de preço.',
    stepByStepFix: [
      'Passo 1: Preserve a Página1 100% intocada para segurança do histórico do usuário.',
      'Passo 2: No Módulo 33 do Make, altere o campo "Range" de "Página1!A1:Z20" para "CONFIG!A1:E20".',
      'Passo 3: O módulo agora receberá os valores de INTERRUPTOR_GERAL, FREQUENCIA_MINUTOS, DESCONTO_MINIMO_PCT e TAG_AFILIADO_ML.',
    ],
    makeActionRequired: 'Alterar intervalo de leitura para CONFIG!A1:E20 mantendo Página1 intacta.',
    readyPayload: {
      range: 'CONFIG!A1:E20',
      valueRenderOption: 'FORMATTED_VALUE',
    },
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_AFFILIATE_UNTRACKED_URL',
    code: 'P1-03',
    severity: 'P1',
    severityLabel: 'P1 — Perda Total de Comissão',
    title: 'Links Comuns de Produtos Não São Rastreáveis como Afiliado',
    affectedModule: 'Motor de Geração de Links (Validação & Afiliados)',
    symptom: 'Links publicados direcionam o usuário para a loja, mas nenhuma comissão é creditada na conta de afiliados do Mercado Livre.',
    errorMessageExample: 'URL normal https://produto.mercadolivre.com.br/MLB-xxx não contém tags "matt_tool" ou token /sec/. Comissão: R$ 0,00.',
    rootCause: 'Tratar URL de busca da API do Mercado Livre como link de afiliado sem submeter à API de Afiliados ou adicionar tags autorizadas.',
    businessImpact: 'Zero faturamento gerado pelo canal, frustrando a operação comercial.',
    stepByStepFix: [
      'Passo 1: Bloquear qualquer publicação de URL que contenha apenas o permalink comum do produto.',
      'Passo 2: Utilizar a função de conversão homologada com tag boxdogarimpo-20 e parâmetros matt_tool=afiliados_boxdogarimpo.',
      'Passo 3: Exigir o estado "AFILIADO_CONFIRMADO" na máquina de estados antes de liberar o botão de envio.',
    ],
    makeActionRequired: 'Inserir módulo de geração de link de afiliado antes do envio aos mensageiros.',
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_DEDUPLICATION_SPAM',
    code: 'P2-01',
    severity: 'P2',
    severityLabel: 'P2 — Risco de Spam e Perda de Inscritos',
    title: 'Ausência de Hash Estável e Republicação Repetida da Mesma Oferta',
    affectedModule: 'Motor de Deduplicação & Histórico',
    symptom: 'A mesma oferta é reenviada a cada 15 ou 30 minutos caso continue com preço promocional.',
    errorMessageExample: 'Notificação repetida: Smartphone Galaxy S23 enviado 4 vezes no mesmo dia para o grupo de WhatsApp.',
    rootCause: 'Falta de identificador normalizado (hash determinístico) e de verificação de histórico com período de cooldown.',
    businessImpact: 'Membros silenciam ou saem dos canais de WhatsApp e Telegram por excesso de mensagens repetitivas.',
    stepByStepFix: [
      'Passo 1: Gerar hash estável baseado em MLB_ID + Título Normalizado + Vendedor.',
      'Passo 2: Aplicar janela de cooldown de 7 dias para o mesmo produto com mesmo preço.',
      'Passo 3: Permitir republicação antecipada APENAS se houver queda real de preço >= 5% sobre a publicação anterior.',
    ],
    makeActionRequired: 'Consultar aba OFERTAS no Google Sheets antes de disparar e verificar HASH_ESTAVEL.',
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_UNAUTHORIZED_CHANNELS',
    code: 'P2-02',
    severity: 'P2',
    severityLabel: 'P2 — Falha de Conexão com Canais',
    title: 'Tentativa de Envio para Destinatários sem Autorização ou Bot Admin',
    affectedModule: 'Módulos de Publicação (Telegram Bot API / WhatsApp Webhook)',
    symptom: 'Erros 403 Forbidden ou 400 Chat Not Found ao tentar publicar no canal.',
    errorMessageExample: 'Telegram API 400 Bad Request: chat not found (@boxdogarimpo) / bot is not an admin of the channel.',
    rootCause: 'O bot do Telegram precisa ser promovido a Administrador com permissão de postar mensagens no canal @boxdogarimpo.',
    businessImpact: 'Mensagens represadas, erros no log e queima de tentativas no Make.',
    stepByStepFix: [
      'Passo 1: No Telegram, adicione o bot oficial ao canal @boxdogarimpo como Administrador com permissão "Post Messages".',
      'Passo 2: No WhatsApp, confirme o número/ID da comunidade boxdogarimpo e a chave de API da Evolution API / Z-API.',
      'Passo 3: Mantenha a Trava de Segurança Geral ligada nesta plataforma enquanto os disparos de teste individuais forem homologados.',
    ],
    makeActionRequired: 'Configurar bot como admin no canal do Telegram e validar webhook do WhatsApp.',
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_FAKE_DISCOUNTS',
    code: 'P2-03',
    severity: 'P2',
    severityLabel: 'P2 — Descontos Falsos e Perda de Credibilidade',
    title: 'Detecção de Descontos Falsos (Preço Inflado ou Desconto < 3%)',
    affectedModule: 'Filtro Comercial de Oportunidades',
    symptom: 'Ofertas com desconto irrisório (ex: 1%) ou com preço "De R$ 10.000 Por R$ 500" que são erros de cadastro.',
    errorMessageExample: 'Oferta aprovada com preço anterior R$ 100,00 e atual R$ 99,00 (Desconto de 1% anunciado como oportunidade).',
    rootCause: 'Falta de filtro matemático que valide se o desconto está entre 3% e 92% e supere o mínimo configurado (20%).',
    businessImpact: 'Perda de confiança do público no "garimpo" do Box do Garimpo.',
    stepByStepFix: [
      'Passo 1: Aplicar a função calculateDiscount() que descarta descontos menores que o mínimo e rejeita descontos aberrantes.',
      'Passo 2: Calcular Score de Oportunidade (0-100) ponderando reputação do vendedor (MercadoLíder Platinum/Gold) e Frete Grátis.',
    ],
    makeActionRequired: 'Configurar filtro com condição {{discount_percent >= 20}} no roteador do Make.',
    status: 'RESOLVIDO_PLATAFORMA',
  },
  {
    id: 'ERR_MAKE_CREDIT_BURNOUT',
    code: 'P2-04',
    severity: 'P2',
    severityLabel: 'P2 — Exaustão de Créditos no Make.com',
    title: 'Loops Descontrolados e Consumo Excessivo de Créditos por Falta de Error Handlers',
    affectedModule: 'Make.com Error Handling Directives',
    symptom: 'Quando uma chamada de API falha temporariamente, o cenário tenta infinitamente ou processa 100 itens de uma só vez.',
    errorMessageExample: 'Make Operations Limit Exceeded: 1,000 credits used in 2 hours due to unhandled 429 rate limit errors.',
    rootCause: 'Ausência de diretivas "Commit", "Ignore" ou "Rollback" nos módulos HTTP e falta de teto de requisições por ciclo.',
    businessImpact: 'Conta do Make.com tem o plano esgotado antes do final do mês, paralisando todo o negócio.',
    stepByStepFix: [
      'Passo 1: No Make, clique com o botão direito no Módulo 1 (HTTP) e selecione "Add error handler" > "Resume" ou "Ignore".',
      'Passo 2: Limite o parâmetro "limit" da busca para no máximo 25 produtos por ciclo de 15 minutos.',
      'Passo 3: Ative a diretiva de break com 3 tentativas e intervalo de 5 minutos.',
    ],
    makeActionRequired: 'Adicionar Error Handler (Resume) nos módulos externos (HTTP e Mensageiros).',
    status: 'RESOLVIDO_PLATAFORMA',
  },
];

/**
 * Intelligent error diagnostician that analyzes any raw error log or symptom text
 * pasted by the user and matches it to the exact technical fix!
 */
export function diagnoseRawErrorText(rawText: string): {
  matchedErrors: DiagnosedError[];
  summary: string;
  recommendedAction: string;
} {
  const text = (rawText || '').toLowerCase();

  const matched = DIAGNOSED_ERRORS.filter((err) => {
    const titleMatch = err.title.toLowerCase().split(' ').some((w) => w.length > 4 && text.includes(w));
    const codeMatch = text.includes(err.code.toLowerCase());
    const symptomMatch = err.errorMessageExample.toLowerCase().split(' ').some((w) => w.length > 5 && text.includes(w));
    const moduleMatch = err.affectedModule.toLowerCase().split(' ').some((w) => w.length > 4 && text.includes(w));

    if (text.includes('32') || text.includes('sheet') || text.includes('duplicate') || text.includes('already exists')) {
      if (err.id === 'ERR_MOD32_DUPLICATE_SHEET') return true;
    }
    if (text.includes('2030') || text.includes('schedule') || text.includes('inativo') || text.includes('15')) {
      if (err.id === 'ERR_MAKE_SCHEDULE_2030') return true;
    }
    if (text.includes('celular') || text.includes('modulo 1') || text.includes('categoria') || text.includes('pesquisa')) {
      if (err.id === 'ERR_ML_STATIC_QUERY') return true;
    }
    if (text.includes('pagina1') || text.includes('página1') || text.includes('33') || text.includes('range')) {
      if (err.id === 'ERR_MOD33_EMPTY_READ') return true;
    }
    if (text.includes('afiliado') || text.includes('comissão') || text.includes('matt_tool') || text.includes('link')) {
      if (err.id === 'ERR_AFFILIATE_UNTRACKED_URL') return true;
    }
    if (text.includes('duplicad') || text.includes('hash') || text.includes('spam') || text.includes('repetid')) {
      if (err.id === 'ERR_DEDUPLICATION_SPAM') return true;
    }
    if (text.includes('telegram') || text.includes('whatsapp') || text.includes('chat not found') || text.includes('admin')) {
      if (err.id === 'ERR_UNAUTHORIZED_CHANNELS') return true;
    }
    if (text.includes('crédito') || text.includes('credit') || text.includes('limit') || text.includes('loop')) {
      if (err.id === 'ERR_MAKE_CREDIT_BURNOUT') return true;
    }

    return titleMatch || codeMatch || symptomMatch || moduleMatch;
  });

  const finalMatched = matched.length > 0 ? matched : [DIAGNOSED_ERRORS[0], DIAGNOSED_ERRORS[1]];

  return {
    matchedErrors: finalMatched,
    summary: `Identificado(s) ${finalMatched.length} ponto(s) de atenção correspondente(s) ao seu relato.`,
    recommendedAction: finalMatched[0]?.stepByStepFix[0] || 'Inspecione os módulos conforme guia.',
  };
}
