// Templates de mensagens DTE-SN
export const dteTemplates = {
  notificacao: {
    subject: (params: { tipo: string }) => `Notificação Fiscal - ${params.tipo}`,
    body: (params: { 
      empresaNome: string
      cnpj: string
      tipo: string
      descricao: string
      valor?: number
      prazo?: string
    }) => `
Prezado(a) ${params.empresaNome},
CNPJ: ${params.cnpj}

NOTIFICAÇÃO FISCAL

A Secretaria Municipal de Fazenda, por meio deste Domicílio Tributário Eletrônico (DTE-SN), 
vem NOTIFICAR Vossa Senhoria sobre:

TIPO: ${params.tipo}

DESCRIÇÃO:
${params.descricao}

${params.valor ? `VALOR APURADO: R$ ${params.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}

${params.prazo ? `PRAZO PARA MANIFESTAÇÃO: ${params.prazo}` : ''}

FUNDAMENTO LEGAL:
- Lei Complementar nº 123/2006 (Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte)
- Lei Municipal de Fiscalização Tributária

Esta notificação substitui a notificação postal, conforme previsto na legislação municipal.
O contribuinte poderá apresentar defesa ou impugnação através do sistema eletrônico.

Atenciosamente,
Secretaria Municipal de Fazenda
    `.trim()
  },

  intimacao: {
    subject: (params: { numero: string }) => `Intimação Fiscal nº ${params.numero}`,
    body: (params: {
      empresaNome: string
      cnpj: string
      numero: string
      motivo: string
      documentos: string[]
      prazo: string
      local: string
    }) => `
Prezado(a) ${params.empresaNome},
CNPJ: ${params.cnpj}

INTIMAÇÃO FISCAL Nº ${params.numero}

A Secretaria Municipal de Fazenda, no uso de suas atribuições legais, 
vem INTIMAR Vossa Senhoria para:

MOTIVO: ${params.motivo}

DOCUMENTOS A APRESENTAR:
${params.documentos.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

PRAZO: ${params.prazo}

LOCAL DE APRESENTAÇÃO: ${params.local}

OBSERVAÇÕES:
- A não apresentação dos documentos no prazo estabelecido poderá acarretar em autuação fiscal.
- Os documentos podem ser enviados digitalmente através do sistema.
- O prazo começa a contar a partir da data de leitura desta intimação.

FUNDAMENTO LEGAL:
- Código Tributário Municipal
- Lei Complementar nº 123/2006

Atenciosamente,
Secretaria Municipal de Fazenda
    `.trim()
  },

  aviso: {
    subject: (params: { assunto: string }) => `Aviso - ${params.assunto}`,
    body: (params: {
      empresaNome: string
      cnpj: string
      assunto: string
      mensagem: string
      prazo?: string
    }) => `
Prezado(a) ${params.empresaNome},
CNPJ: ${params.cnpj}

AVISO FISCAL

Assunto: ${params.assunto}

${params.mensagem}

${params.prazo ? `\nPrazo: ${params.prazo}` : ''}

Esta é uma comunicação informativa da Secretaria Municipal de Fazenda através do 
Domicílio Tributário Eletrônico (DTE-SN).

Atenciosamente,
Secretaria Municipal de Fazenda
    `.trim()
  },

  autoInfracao: {
    subject: (params: { numero: string }) => `Auto de Infração nº ${params.numero}`,
    body: (params: {
      empresaNome: string
      cnpj: string
      numero: string
      infracao: string
      baseCalcular: number
      multa: number
      juros: number
      total: number
      prazo: string
    }) => `
Prezado(a) ${params.empresaNome},
CNPJ: ${params.cnpj}

AUTO DE INFRAÇÃO E IMPOSIÇÃO DE MULTA Nº ${params.numero}

A Secretaria Municipal de Fazenda, com base no poder de polícia administrativa,
LAVRA o presente Auto de Infração pelos seguintes fatos:

INFRAÇÃO CONSTATADA:
${params.infracao}

VALORES:
Base de Cálculo: R$ ${params.baseCalcular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Multa Aplicada: R$ ${params.multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Juros: R$ ${params.juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
TOTAL: R$ ${params.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

PRAZO PARA DEFESA: ${params.prazo}

DIREITOS DO AUTUADO:
- Apresentar defesa ou impugnação no prazo estabelecido
- Requerer parcelamento do débito
- Solicitar revisão administrativa

O não pagamento ou não apresentação de defesa implicará em inscrição em dívida ativa 
e execução fiscal.

FUNDAMENTO LEGAL:
- Código Tributário Municipal
- Lei Complementar nº 123/2006

Atenciosamente,
Secretaria Municipal de Fazenda
    `.trim()
  },

  lembrete: {
    subject: () => 'Lembrete - Obrigações Fiscais',
    body: (params: {
      empresaNome: string
      cnpj: string
      obrigacoes: Array<{ nome: string; vencimento: string }>
    }) => `
Prezado(a) ${params.empresaNome},
CNPJ: ${params.cnpj}

LEMBRETE DE OBRIGAÇÕES FISCAIS

Este é um lembrete automático sobre suas próximas obrigações fiscais:

${params.obrigacoes.map((obr, i) => `${i + 1}. ${obr.nome} - Vencimento: ${obr.vencimento}`).join('\n')}

Certifique-se de cumprir todas as obrigações dentro dos prazos estabelecidos.

Este é um aviso automático do sistema DTE-SN.

Atenciosamente,
Secretaria Municipal de Fazenda
    `.trim()
  }
}

export type DTETemplateType = keyof typeof dteTemplates
