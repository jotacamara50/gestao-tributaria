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
Prezado(a) contribuinte,

Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}
Autoridade: ${params.autoridade || autoridadePadrao} - Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

Fica notificado(a) para regularizar as pendencias referentes a ${params.assunto || 'obrigacoes fiscais do Simples Nacional'}.
Descricao: ${params.descricao || 'Pendencia identificada em cruzamentos fiscais municipais.'}

Fundamento legal: Lei Complementar 123/2006, Codigo Tributario Municipal${params.baseLegalExtra ? `, ${params.baseLegalExtra}` : ''}.
Prazo para manifestacao: ${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}
Data de emissao: ${formatDateBR(params.dataEmissao)}

O nao atendimento implicara na continuidade do procedimento fiscal, podendo resultar em auto de infracao e inscricao em divida ativa.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  intimacao: {
    subject: (params: { numero?: string }) => `Intimacao Fiscal ${params.numero ? `- ${params.numero}` : ''}`.trim(),
    body: (params: BaseParams & { numero?: string; motivo?: string; documentos?: string[]; local?: string }) => `
Prezado(a) contribuinte,

Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}
Autoridade: ${params.autoridade || autoridadePadrao} - Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

Fica intimado(a) para apresentar os seguintes documentos relativos a ${params.motivo || 'verificacao fiscal'}:
${(params.documentos || ['Documentos contabeis e fiscais do periodo sob analise']).map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Local de entrega/envio: ${params.local || 'Envio digital via sistema DTE-SN ou entrega presencial na Secretaria Municipal de Fazenda.'}
Fundamento legal: Lei Complementar 123/2006, Codigo Tributario Municipal${params.baseLegalExtra ? `, ${params.baseLegalExtra}` : ''}.
Prazo para cumprimento: ${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}
Data de emissao: ${formatDateBR(params.dataEmissao)}

O nao atendimento no prazo implicara na autuacao fiscal e em outras medidas cabiveis conforme legislacao municipal.

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
Prezado(a) contribuinte,

Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}
Autoridade: ${params.autoridade || autoridadePadrao} - Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

Fica lavrado o Auto de Infracao ${params.numero || ''} pelos seguintes fatos:
${params.infracao || 'Descumprimento de obrigacao tributaria principal ou acessoria apurada em fiscalizacao municipal.'}

Valores apurados:
Base de Calculo: ${params.baseCalcular !== undefined ? `R$ ${params.baseCalcular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Multa: ${params.multa !== undefined ? `R$ ${params.multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Juros: ${params.juros !== undefined ? `R$ ${params.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}
Total: ${params.total !== undefined ? `R$ ${params.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A apurar'}

Fundamento legal: Lei Complementar 123/2006, Codigo Tributario Municipal${params.baseLegalExtra ? `, ${params.baseLegalExtra}` : ''}.
Prazo para defesa: ${params.prazo || '10 (dez) dias corridos a contar do recebimento neste DTE-SN.'}
Data de emissao: ${formatDateBR(params.dataEmissao)}

O nao pagamento ou nao apresentacao de defesa implicara na inscricao em divida ativa e na cobranca judicial, sem prejuizo das demais medidas cabiveis.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  aviso: {
    subject: (params: { assunto?: string }) => `Aviso Fiscal - ${params.assunto || 'Comunicado'}`,
    body: (params: BaseParams & { assunto?: string; mensagem?: string }) => `
Prezado(a) contribuinte,

Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}
Autoridade: ${params.autoridade || autoridadePadrao} - Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

${params.mensagem || `Comunicamos sobre ${params.assunto || 'obrigacoes fiscais do Simples Nacional'}.`}

Fundamento legal: Lei Complementar 123/2006, Codigo Tributario Municipal${params.baseLegalExtra ? `, ${params.baseLegalExtra}` : ''}.
Prazo (quando aplicavel): ${params.prazo || 'Prazo informado na mensagem ou conforme obrigacao especifica.'}
Data de emissao: ${formatDateBR(params.dataEmissao)}

Esta comunicacao e realizada pelo DTE-SN e considera-se recebida na data de leitura pelo contribuinte ou apos o decurso do prazo legal.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  },

  lembrete: {
    subject: (params: { assunto?: string }) => `Lembrete Fiscal - ${params.assunto || 'Obrigacoes'}`,
    body: (params: BaseParams & { obrigacoes?: Array<{ nome: string; vencimento: string }> }) => `
Prezado(a) contribuinte,

Razao Social: ${params.empresaNome}
CNPJ: ${params.cnpj}
Autoridade: ${params.autoridade || autoridadePadrao} - Domicilio Tributario Eletronico do Simples Nacional (DTE-SN)

Lembramos das seguintes obrigacoes e prazos:
${(params.obrigacoes || [{ nome: 'Entrega de declaracoes e comprovantes', vencimento: 'Verifique o calendario oficial' }]).map((obr, i) => `${i + 1}. ${obr.nome} - Vencimento: ${obr.vencimento}`).join('\n')}

Fundamento legal: Lei Complementar 123/2006, Codigo Tributario Municipal${params.baseLegalExtra ? `, ${params.baseLegalExtra}` : ''}.
Prazo: ${params.prazo || 'Conforme datas listadas acima.'}
Data de emissao: ${formatDateBR(params.dataEmissao)}

Este lembrete e informativo e foi enviado pelo DTE-SN. O nao cumprimento dos prazos pode gerar penalidades previstas na legislacao municipal.

Atenciosamente,
${params.autoridade || autoridadePadrao}
    `.trim()
  }
}

export type DTETemplateType = keyof typeof dteTemplates
