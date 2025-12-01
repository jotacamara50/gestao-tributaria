# Gestão Tributária - Simples Nacional

Painel web para fiscalização e gestão do Simples Nacional no município. Inclui ingestão de PGDAS/DAS-D, NFSe, DAF607 (Banco do Brasil), guias, parcelamentos e DEFIS, com cruzamentos, relatórios oficiais e ações de fiscalização.

## Stack
- Next.js 16 (app router) + React 19 + TypeScript
- Prisma + SQLite (dev)
- Tailwind/Radix UI

## Configuração
1. Requisitos: Node 18+.
2. Instale dependências:
   ```bash
   npm install
   ```
3. Banco (dev):
   ```bash
   npx prisma db push
   ```
   Para resetar: `Remove-Item .\prisma\dev.db -Force && npx prisma db push`.
4. Rodar:
   ```bash
   npm run dev
   ```

## Importação de arquivos
Use a página **Importação** e selecione o tipo:
- PGDAS (XML), NFSe (XML), DEFIS (XML)
- DAF607 (CSV; aceita , ou ;, com colunas `competencia`, `valor`, opcional `cnpj`)
- Parcelamentos (CSV), Guias/DAS (CSV)
- DAS-D (CSV; colunas: `cnpj,periodo,municipio,regime_especial,atividade_contabil,receita_declarada,receita_caixa,entregueem`)

Importes são idempotentes: PGDAS/NFSe/Guias substituem registros do mesmo CNPJ+chave; DAF607 deduplica por data+valor+CNPJ/origem; Parcelamentos/parcelas fazem upsert por parcela.

## Dados sintéticos
- Pasta `synthetic_sn/` contém amostras (PGDAS, NFSe, guias, parcelamentos, DAF607, DAS-D) com competências recentes para testes. Reimporte após reset do banco.

## Principais telas
- **Dashboard**: KPIs e séries 12m/5a (PGDAS, NFSe, ISS, DAF607, parcelamentos, MEI) com alertas de sublimite/limite.
   - Recarrega com `?anos=1` ou `?anos=5`.
- **Cruzamentos**: omissos, divergência PGDAS x NFSe, retenção/ISS fora, inadimplência (guias+DAF607), parcelamentos em atraso, MEI, retificações a menor, DAS-D omissos/entregues, regimes especiais, atividades contábeis, receitas para/de outros municípios, NFSe por item/CNAE/tomador, repasses por faixa/origem.
- **Relatórios**: exportação CSV/PDF com toggle 12m/5a (omissos, inadimplentes, retenções, sublimites, divergências, repasses, histórico por CNPJ).
- **Fiscalização**: registro de ações fiscais, anexos e relatório individual.

## Observações
- Produção: gere/aplique migrations Prisma conforme o banco alvo (ex.: `npx prisma migrate dev --name add-dasd-fields` e `npx prisma migrate deploy`).
- Autenticação/ambiente: configure `.env` conforme necessidades locais (NextAuth, URLs, etc.).
