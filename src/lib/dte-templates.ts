type BaseParams = {
  empresaNome: string
  cnpj: string
  dataEmissao?: Date | string
  autoridade?: string
  prazo?: string
  baseLegalExtra?: string
}

const formatDateBR = (value?: Date | string) => {
  const data = value ? new Date(value) : new Date()
  return data.toLocaleDateString('pt-BR')
}

const autoridadePadrao = 'Secretaria Municipal de Fazenda'

export const dteTemplates = {
  notificacao: {
    subject: (params: { assunto?: string }) => `Notificacao Fiscal - ${params.assunto || 'Regularizacao'}`,
    body: (params: BaseParams & { assunto?: string; descricao?: string }) => `
PREZADO(A) CONTRIBUINTE,

IDENTIFICACAO DO CONTRIBUINTE
Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}

IDENTIFICACAO DA AUTORIDADE
${params.autoridade || autoridadePadrao}
Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

TEXTO DA COBRANCA / NOTIFICACAO
Fica NOTIFICADO(A) para regularizar as pendencias referentes a ${params.assunto || 'obrigacoes fiscais do Simples Nacional'}.
Descricao: ${params.descricao || 'Pendencia identificada em cruzamentos fiscais municipais.'}

BASE LEGAL
- Lei Complementar 123/2006
- Codigo Tributario Municipal
${params.baseLegalExtra ? `- ${params.baseLegalExtra}` : ''}

PRAZO PARA MANIFESTACAO
${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}

DATA DE EMISSAO
${formatDateBR(params.dataEmissao)}

BLOCO FINAL PADRONIZADO
O NAO ATENDIMENTO IMPLICARA NA CONTINUIDADE DO PROCEDIMENTO FISCAL, PODENDO RESULTAR NA LAVRATURA DE AUTO DE INFRACAO E INSCRICAO EM DIVIDA ATIVA, CONFORME LEGISLACAO VIGENTE.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  intimacao: {
    subject: (params: { numero?: string }) => `Intimacao Fiscal ${params.numero ? `- ${params.numero}` : ''}`.trim(),
    body: (params: BaseParams & { numero?: string; motivo?: string; documentos?: string[]; local?: string }) => `
PREZADO(A) CONTRIBUINTE,

IDENTIFICACAO DO CONTRIBUINTE
Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}

IDENTIFICACAO DA AUTORIDADE
${params.autoridade || autoridadePadrao}
Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

TEXTO DA INTIMACAO
Fica INTIMADO(A) para apresentar os documentos abaixo, relativos a ${params.motivo || 'verificacao fiscal'}:
${(params.documentos || ['Documentos contabeis e fiscais do periodo sob analise']).map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

LOCAL DE ENTREGA / ENVIO
${params.local || 'Envio digital via sistema DTE-SN ou entrega presencial na Secretaria Municipal de Fazenda.'}

BASE LEGAL
- Lei Complementar 123/2006
- Codigo Tributario Municipal
${params.baseLegalExtra ? `- ${params.baseLegalExtra}` : ''}

PRAZO PARA CUMPRIMENTO
${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}

DATA DE EMISSAO
${formatDateBR(params.dataEmissao)}

BLOCO FINAL PADRONIZADO
O NAO ATENDIMENTO NO PRAZO IMPLICARA NA AUTUACAO FISCAL E EM OUTRAS MEDIDAS CABIVEIS, CONFORME LEGISLACAO MUNICIPAL APLICAVEL.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  autoInfracao: {
    subject: (params: { numero?: string }) => `Auto de Infracao ${params.numero ? `- ${params.numero}` : ''}`.trim(),
    body: (params: BaseParams & {
      numero?: string
      infracao?: string
      baseCalcular?: number
      multa?: number
      juros?: number
      total?: number
    }) => `
PREZADO(A) CONTRIBUINTE,

IDENTIFICACAO DO CONTRIBUINTE
Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}

IDENTIFICACAO DA AUTORIDADE
${params.autoridade || autoridadePadrao}
Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

TEXTO DO AUTO DE INFRACAO
Fica lavrado o AUTO DE INFRACAO ${params.numero || ''} pelos seguintes fatos:
${params.infracao || 'Descumprimento de obrigacao tributaria principal ou acessoria apurada em fiscalizacao municipal.'}

VALORES APURADOS
Base de Calculo: ${params.baseCalcular !== undefined ? `R$ ${params.baseCalcular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Multa: ${params.multa !== undefined ? `R$ ${params.multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Juros: ${params.juros !== undefined ? `R$ ${params.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Total: ${params.total !== undefined ? `R$ ${params.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}

BASE LEGAL
- Lei Complementar 123/2006
- Codigo Tributario Municipal
${params.baseLegalExtra ? `- ${params.baseLegalExtra}` : ''}

PRAZO PARA DEFESA
${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}

DATA DE EMISSAO
${formatDateBR(params.dataEmissao)}

BLOCO FINAL PADRONIZADO
O NAO PAGAMENTO OU NAO APRESENTACAO DE DEFESA IMPLICARA NA INSCRICAO EM DIVIDA ATIVA E NA COBRANCA JUDICIAL, SEM PREJUIZO DAS DEMAIS MEDIDAS CABIVEIS.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  aviso: {
    subject: (params: { assunto?: string }) => `Aviso Fiscal - ${params.assunto || 'Comunicado'}`,
    body: (params: BaseParams & { assunto?: string; mensagem?: string }) => `
PREZADO(A) CONTRIBUINTE,

IDENTIFICACAO DO CONTRIBUINTE
Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}

IDENTIFICACAO DA AUTORIDADE
${params.autoridade || autoridadePadrao}
Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

TEXTO DO AVISO
${params.mensagem || `Comunicamos sobre ${params.assunto || 'obrigações fiscais do Simples Nacional'}.`}

BASE LEGAL
- Lei Complementar 123/2006
- Codigo Tributario Municipal
${params.baseLegalExtra ? `- ${params.baseLegalExtra}` : ''}

PRAZO (SE APLICAVEL)
${params.prazo || 'Prazo informado na mensagem ou conforme obrigacao especifica.'}

DATA DE EMISSAO
${formatDateBR(params.dataEmissao)}

BLOCO FINAL PADRONIZADO
Esta comunicacao e realizada pelo DTE-SN e considera-se recebida na data de leitura pelo contribuinte ou apos decurso do prazo legal.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  lembrete: {
    subject: (params: { assunto?: string }) => `Lembrete Fiscal - ${params.assunto || 'Obrigacoes'}`,
    body: (params: BaseParams & { obrigacoes?: Array<{ nome: string; vencimento: string }> }) => `
PREZADO(A) CONTRIBUINTE,

IDENTIFICACAO DO CONTRIBUINTE
Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}

IDENTIFICACAO DA AUTORIDADE
${params.autoridade || autoridadePadrao}
Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

TEXTO DO LEMBRETE
Lembramos das seguintes obrigacoes e prazos:
${(params.obrigacoes || [{ nome: 'Entrega de declaracoes e comprovantes', vencimento: 'Verifique o calendario oficial' }]).map((obr, i) => `${i + 1}. ${obr.nome} - Vencimento: ${obr.vencimento}`).join('\n')}

BASE LEGAL
- Lei Complementar 123/2006
- Codigo Tributario Municipal
${params.baseLegalExtra ? `- ${params.baseLegalExtra}` : ''}

PRAZO
${params.prazo || 'Conforme datas listadas acima.'}

DATA DE EMISSAO
${formatDateBR(params.dataEmissao)}

BLOCO FINAL PADRONIZADO
Este lembrete e informativo e foi enviado pelo DTE-SN. O nao cumprimento dos prazos pode gerar penalidades previstas na legislacao municipal.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  }
}

export type DTETemplateType = keyof typeof dteTemplates
