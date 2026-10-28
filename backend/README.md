# O GARIMPO — backend Python independente

Este backend é um esqueleto seguro para separar o motor operacional da interface React e da Make. **Ainda não está implantado e não coleta nem publica ofertas.**

## Princípios

- Modo seguro por padrão: nenhuma publicação é feita.
- Não usar scraping, automação de sessão autenticada ou cookies para coletar conteúdo do Mercado Livre.
- Adicionar fontes somente por API/feed autorizado ou importação de dados com permissão.
- Links afiliados só podem ser marcados como verificados após resposta de integração oficial ou conferência explícita.
- Segredos apenas em variáveis de ambiente do serviço de hospedagem; nunca no GitHub.

## Executar localmente

Requer Python 3.11 ou superior.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.cycle --dry-run
```

O modo dry-run apenas relata quais pré-condições estão faltando; não acessa marketplace, não altera planilhas e não publica.

Para iniciar a API de saúde:

```bash
uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Depois, consulte `GET /health`.

## Próximas etapas obrigatórias antes de agendar

1. Escolher e homologar a fonte autorizada de produtos.
2. Definir banco persistente (por exemplo, PostgreSQL/Supabase) e configurar credenciais no ambiente de hospedagem.
3. Implementar e testar adaptador da fonte, normalização e deduplicação.
4. Validar geração de links afiliados por meio oficialmente permitido.
5. Criar testes de integração com dados de teste.
6. Só então configurar um Cron Job a cada 15 minutos.
7. Manter publicação bloqueada até autorização expressa e testes de canal concluídos.

Não configure um job de produção enquanto as etapas 1–5 não estiverem concluídas.
