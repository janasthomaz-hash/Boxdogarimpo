# Análise de contatosouza.com — 2026-10-28

## O que a página declara

A página pública se apresenta como "Filtro Seller Pro" e convida a pessoa a responder cinco perguntas para receber uma aula gratuita. O texto afirma ensinar a criar uma loja no Mercado Livre, conectar fornecedor e vender "sem ter estoque", "sem ser afiliado" e "sem divulgação". A página informa que a aula não está disponível diretamente e orienta a contatar a equipe pelo WhatsApp para receber a aula, uma comunidade e um "sistema do fornecedor".

Fonte consultada: https://contatosouza.com/

## O que não foi possível confirmar

- Não foi possível confirmar, apenas pela página pública consultada, a identidade jurídica do operador, CNPJ, endereço comercial ou termos contratuais.
- Não foi possível verificar a qualidade, disponibilidade, custo ou legitimidade do alegado sistema/fornecedor.
- A demonstração de vendas exibida na página é uma alegação promocional e não constitui prova independente de faturamento, lucro líquido ou resultados típicos.
- Não foi possível confirmar o conteúdo da aula, os critérios do questionário ou o funcionamento do sistema prometido via WhatsApp.

Esta análise não conclui que o site seja fraude; conclui que as evidências públicas obtidas são insuficientes para validar a oferta comercial.

## Implicação para O GARIMPO

A proposta parece corresponder a uma operação de vendedor com fornecedor (modelo de revenda/fulfillment ou envio pelo fornecedor), não a um programa de afiliados. Os dois modelos devem permanecer separados:

1. **Afiliados:** recomendar produtos de terceiros e receber comissão por vendas elegíveis; não assumir a venda nem o envio.
2. **Vendedor com fornecedor:** publicar e vender em nome da própria loja, definir preço e assumir responsabilidades perante o comprador, inclusive estoque, expedição, cancelamentos, devoluções e atendimento.

Não presumir que "sem estoque" significa "sem responsabilidade" ou que qualquer fornecedor pode enviar diretamente ao cliente. Antes de incorporar o modelo ao sistema, exigir contrato/identidade do fornecedor, feed de estoque e preço, SLA de despacho, rastreio, política de devolução, emissão fiscal e teste controlado.

## Política de coleta

A documentação de desenvolvedores do Mercado Livre proíbe scraping/crawling para obter conteúdo e orienta o uso da API oficial:
- https://developers.mercadolivre.com.br/pt_br/termos-e-condicoes
- https://developers.mercadolivre.com.br/boas-praticas-para-usar-a-plataforma

O backend independente deve usar APIs, feeds autorizados ou arquivos fornecidos com permissão; não deve automatizar login, reutilizar cookies de sessão, contornar proteções ou coletar conteúdo por scraping.

## Checklist de due diligence antes de contratar

- Solicitar razão social, CNPJ, endereço e contrato/termos.
- Confirmar quem recebe pagamentos e quem emite nota fiscal.
- Solicitar identidade dos fornecedores, autorização de distribuição e amostra de feed/planilha.
- Confirmar custos, mensalidades, taxas, mínimos de compra e política de reembolso.
- Validar estoque, atualização de preço, prazo de despacho, rastreio e devoluções.
- Pedir demonstração ao vivo do software e testar com produtos de baixo risco antes de pagar.
- Não fornecer senhas, cookies, códigos de autenticação ou tokens do Mercado Livre.
- Não publicar anúncios nem fazer pedidos reais sem compreender a responsabilidade comercial.

## Decisão

**Status: não homologado como fornecedor nem como integração.** Pode servir como referência de modelo comercial a investigar, mas não será tratado como fonte de produtos, API ou parceiro validado até passar pela due diligence.
