# Plano de Demonstração (POC)

Objetivo: demonstrar ingestão, cruzamento e workflow de fiscalização com dados fictícios, mas com estrutura idêntica aos arquivos oficiais (PGDAS-D, NFSe, DAF607, DEFIS).

## Arquivos de exemplo (usar nesta ordem)
Pasta: `src/lib/parsers/examples/poc/`
- `pgdas_alfa_2024-10.xml`
- `pgdas_beta_2024-10.xml`
- `nfse_alfa_2024-10_1.xml`, `_2.xml`, `_3.xml` (total 150.000)
- `nfse_beta_2024-10_1.xml`, `_2.xml` (total 59.000)
- `daf607_outubro.csv` (repasses: Alfa 2.200; Beta 1.200)
- `defis_alfa_2023.xml` (opcional para mostrar parser DEFIS)

Seed já configurado (`prisma/seed.js`):
- Admin: `admin@prefeitura.gov.br` / `admin123`
- Município: Aurora/SP
- Empresas: Alfa Tecnologia LTDA (12.345.678/0001-90), Beta Serviços Municipais (98.765.432/0001-10)

## Roteiro (5–7 minutos)
1) Login e Configurações: mostrar município/brasão e dados já preenchidos.
2) Importar arquivos POC (PGDAS Alfa/Beta, NFSe Alfa/Beta, DAF607 outubro; opcional DEFIS).
3) Relatórios:
   - Divergentes: Alfa deve aparecer com omissão (NFSe 150k vs PGDAS 120k) e inadimplência (DAS 3.600 vs repasse 2.200). Beta quase ok.
   - Repasses BB: listar repasses conciliados por CNPJ (Alfa 2.200, Beta 1.200).
   - Histórico por contribuinte: filtrar Alfa e mostrar série (PGDAS, NFSe, repasses).
4) Fiscalização: criar ação para Alfa (PGDAS x NFSe 10/2024), anexar arquivos usados e gerar “Relatorio Fiscal Individual” (PDF).
5) Mostrar riskLevel/histórico/anexos na ação e encerrar.

## Esperado (para a POC)
- Alfa: NFSe (150.000) > PGDAS (120.000); repasse DAF607 (2.200) < DAS declarado (3.600) → divergente/inadimplente.
- Beta: NFSe (59.000) ~ PGDAS (60.000); repasse (1.200) ~ DAS (1.200) → cenário de conformidade.
