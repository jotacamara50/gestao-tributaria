# Plano de Implementação - Sistema de Gestão Tributária

## ✅ CONCLUÍDO
1. ✅ Login funcionando (NextAuth v5)
2. ✅ Cadastro de Contribuintes (CREATE)
3. ✅ API de criação de empresas
4. ✅ Validação de CNPJ duplicado
5. ✅ Log de auditoria no cadastro

## 🔴 PRÓXIMAS IMPLEMENTAÇÕES CRÍTICAS

### 1. Processamento Real de Arquivos (Alta Prioridade)
**Arquivos:** 
- `src/lib/parsers/xml-parser.ts` (melhorar parsers)
- `src/lib/parsers/csv-parser.ts` (melhorar DAF607)
- `src/app/api/upload/route.ts` (processar depois de salvar)

**Tarefas:**
- [ ] Melhorar parser PGDAS-D (estrutura completa da Receita)
- [ ] Melhorar parser DEFIS
- [ ] Parser NFSe (padrão nacional ABRASF)
- [ ] Parser DAF607 (layout Banco do Brasil)
- [ ] Processar arquivos em background (queue)
- [ ] Validar estrutura dos XMLs

### 2. Algoritmos de Cruzamento Completos (Alta Prioridade)
**Arquivo:** `src/lib/engine/crossing.ts`

**Implementar:**
- [ ] Cruzamento PGDAS x NFSe por período
- [ ] Monitoramento de sublimite (R$ 3.6M e R$ 4.8M)
- [ ] Detecção de retenções indevidas
- [ ] Identificação de omissos por período
- [ ] Identificação de inadimplentes (declarou mas não pagou - cruzar com DAF607)
- [ ] Alertas automáticos ao detectar divergências
- [ ] Cálculo automático de nível de risco

### 3. Tela de Configurações/Parametrização (Alta Prioridade)
**Criar:** `src/app/configuracoes/page.tsx`

**Funcionalidades:**
- [ ] Upload de brasão da prefeitura
- [ ] Configurar nome do município
- [ ] Nome do Secretário de Fazenda
- [ ] Cadastro de Leis Municipais
- [ ] Configurar sublimites municipais
- [ ] Configurar alíquotas de ISS por CNAE
- [ ] Textos padrão para notificações

**Schema Prisma:**
```prisma
model Settings {
  id                String   @id @default("default")
  cityName          String
  stateName         String?
  secretaryName     String
  lawsText          String?
  logoUrl           String?
  sublimitEstadual  Float    @default(3600000)
  sublimitMunicipal Float    @default(4800000)
  updatedAt         DateTime @updatedAt
}

model MunicipalLaw {
  id          String   @id @default(cuid())
  number      String
  year        Int
  description String
  fullText    String?
  createdAt   DateTime @default(now())
}

model ISSRate {
  id          String   @id @default(cuid())
  cnae        String   @unique
  description String
  rate        Float
  lawId       String?
  createdAt   DateTime @default(now())
}
```

### 4. Trilha de Auditoria Completa (Alta Prioridade)
**Arquivo:** `src/lib/audit.ts`

**Melhorias:**
- [ ] Registrar TODAS as ações sensíveis
- [ ] Incluir dados ANTES e DEPOIS de alterações
- [ ] Tela de consulta de logs (admin)
- [ ] Exportar logs para PDF
- [ ] Retenção de logs por 5 anos (conf TR)

### 5. Módulo DTE-SN (Média Prioridade)
**Criar:** `src/app/dte-sn/`

**Funcionalidades:**
- [ ] Gerador de notificações padrão
- [ ] Templates: Aviso de Exclusão, Cobrança, Intimação
- [ ] Exportar no layout DTE-SN
- [ ] Acompanhamento de leitura
- [ ] Histórico de comunicações por contribuinte

### 6. Relatórios em PDF (Média Prioridade)
**Criar:** `src/lib/reports/pdf-generator.ts`

**Usar:** jsPDF (já instalado)

**Relatórios:**
- [ ] Relatório de Fiscalização
- [ ] Auto de Infração
- [ ] Termo de Início de Fiscalização
- [ ] Notificação de Lançamento
- [ ] Incluir brasão configurado
- [ ] Incluir leis municipais citadas

### 7. Visão 360° do Contribuinte (Média Prioridade)
**Melhorar:** `src/app/contribuintes/[id]/page.tsx`

**Adicionar:**
- [ ] Histórico de enquadramento (últimos 5 anos)
- [ ] Gráfico de pagamentos efetivos
- [ ] Dados do QSA (sócios)
- [ ] Timeline de eventos fiscais
- [ ] Histórico de comunicações DTE-SN
- [ ] Processos administrativos fiscais

### 8. MFA - Autenticação Multifator (Média Prioridade)
**Arquivo:** `src/app/api/auth/[...nextauth]/route.ts`

**Implementar:**
- [ ] TOTP (Google Authenticator, Microsoft Authenticator)
- [ ] SMS (opcional - integração com serviço)
- [ ] Forçar MFA para role ADMIN
- [ ] Códigos de recuperação

### 9. Melhorias no Schema do Banco
**Arquivo:** `prisma/schema.prisma`

**Adicionar:**
```prisma
model Partner {
  id          String   @id @default(cuid())
  companyId   String
  cpf         String
  name        String
  role        String
  startDate   DateTime
  endDate     DateTime?
  createdAt   DateTime @default(now())
  company     Company  @relation(fields: [companyId], references: [id])
}

model EnquadramentoHistory {
  id          String   @id @default(cuid())
  companyId   String
  regime      String
  startDate   DateTime
  endDate     DateTime?
  reason      String?
  createdAt   DateTime @default(now())
  company     Company  @relation(fields: [companyId], references: [id])
}

model DTEMessage {
  id          String   @id @default(cuid())
  companyId   String
  type        String   // Aviso, Cobrança, Intimação
  subject     String
  content     String
  sentAt      DateTime @default(now())
  readAt      DateTime?
  createdBy   String
  company     Company  @relation(fields: [companyId], references: [id])
  user        User     @relation(fields: [createdBy], references: [id])
}
```

## 📊 DASHBOARD - Melhorias
**Arquivo:** `src/app/page.tsx`

**Dados Reais:**
- [ ] Substituir mock data por queries reais
- [ ] KPIs dinâmicos do período selecionado
- [ ] Gráficos com dados reais do banco
- [ ] Filtro por período

## 🔒 SEGURANÇA
- [ ] Validar inputs em todas APIs
- [ ] Sanitizar dados antes de salvar
- [ ] Rate limiting nas APIs
- [ ] CORS configurado corretamente
- [ ] Helmet.js para headers de segurança
- [ ] Criptografia de dados sensíveis

## 📝 DOCUMENTAÇÃO
- [ ] README com instruções de instalação
- [ ] Documentação de APIs
- [ ] Manual do usuário
- [ ] Guia de deployment

## 🧪 TESTES
- [ ] Testes unitários (Jest)
- [ ] Testes de integração
- [ ] Testes E2E (Playwright)

---

## ORDEM SUGERIDA DE IMPLEMENTAÇÃO

### Fase 1 (Esta semana)
1. ✅ Cadastro de contribuintes
2. Tela de Configurações
3. Melhorar parsers de arquivos
4. Algoritmos de cruzamento completos

### Fase 2 (Próxima semana)
5. Trilha de auditoria completa
6. Visão 360° do contribuinte
7. Relatórios em PDF

### Fase 3 (Semana seguinte)
8. Módulo DTE-SN
9. MFA
10. Testes e ajustes finais
