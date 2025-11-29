import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configurações padrão do PDF
const CONFIG = {
    margin: 20,
    lineHeight: 7,
    fontSize: {
        title: 16,
        subtitle: 12,
        normal: 10,
        small: 8
    },
    colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        danger: '#dc2626',
        success: '#16a34a'
    }
}

export interface BrandingInfo {
    logoUrl?: string
    cityName?: string
    stateName?: string | null
    address?: string | null
}

interface Contribuinte {
    cnpj: string
    nome: string
    nomeFantasia?: string
    endereco?: string
}

interface NotificacaoParams {
    numero: string
    data: Date
    contribuinte: Contribuinte
    assunto: string
    conteudo: string
    prazo: Date
    fundamentacao: string
}

interface TermoFiscalizacaoParams {
    numero: string
    data: Date
    contribuinte: Contribuinte
    periodo: string
    tributos: string[]
    documentosAnalisados: string[]
    divergenciasEncontradas: {
        tipo: string
        descricao: string
        valorDeclarado: number
        valorApurado: number
        diferenca: number
    }[]
    conclusao: string
}

interface AutoInfracaoParams {
    numero: string
    data: Date
    contribuinte: Contribuinte
    infracoesConstatadas: {
        artigo: string
        descricao: string
        valorMulta: number
    }[]
    valorTotal: number
    prazoDefesa: Date
    prazoRecurso: Date
}

function addLogo(doc: jsPDF, brand?: BrandingInfo) {
    if (!brand?.logoUrl) return false
    try {
        const format = brand.logoUrl.includes('image/png') ? 'PNG' : 'JPEG'
        doc.addImage(brand.logoUrl, format, CONFIG.margin, CONFIG.margin - 8, 20, 20)
        return true
    } catch (err) {
        console.warn('Falha ao adicionar brasao no PDF:', err)
        return false
    }
}

/**
 * Gera cabeçalho padrão dos PDFs
 */
function gerarCabecalho(doc: jsPDF, titulo: string, brand?: BrandingInfo) {
    const pageWidth = doc.internal.pageSize.width
    
    // Brasão/Logo
    const logoDesenhado = addLogo(doc, brand)
    if (!logoDesenhado) {
        doc.setFillColor(30, 64, 175)
        doc.circle(CONFIG.margin, CONFIG.margin, 8, 'F')
    }
    
    // Cabeçalho oficial
    doc.setFontSize(CONFIG.fontSize.title)
    doc.setFont('helvetica', 'bold')
    doc.text(
        brand?.cityName ? `PREFEITURA DE ${brand.cityName.toUpperCase()}` : 'PREFEITURA MUNICIPAL',
        pageWidth / 2,
        CONFIG.margin,
        { align: 'center' }
    )
    
    doc.setFontSize(CONFIG.fontSize.subtitle)
    doc.text('SECRETARIA DE FINANCAS E TRIBUTACAO', pageWidth / 2, CONFIG.margin + 7, { align: 'center' })
    
    doc.setFontSize(CONFIG.fontSize.small)
    doc.setFont('helvetica', 'normal')
    doc.text(
        brand?.address ? brand.address : 'Sistema de Gestao Tributaria',
        pageWidth / 2,
        CONFIG.margin + 12,
        { align: 'center' }
    )
    
    // Linha separadora
    doc.setDrawColor(30, 64, 175)
    doc.setLineWidth(0.5)
    doc.line(CONFIG.margin, CONFIG.margin + 18, pageWidth - CONFIG.margin, CONFIG.margin + 18)
    
    // Título do documento
    doc.setFontSize(CONFIG.fontSize.title)
    doc.setFont('helvetica', 'bold')
    doc.text(titulo, pageWidth / 2, CONFIG.margin + 30, { align: 'center' })
    
    return CONFIG.margin + 40
}

/**
 * Gera rodapé padrão com numeração e data
 */
function gerarRodape(doc: jsPDF) {
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width
    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber
    
    doc.setFontSize(CONFIG.fontSize.small)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    
    // Linha separadora
    doc.setDrawColor(100, 116, 139)
    doc.setLineWidth(0.3)
    doc.line(CONFIG.margin, pageHeight - 20, pageWidth - CONFIG.margin, pageHeight - 20)
    
    // Texto do rodapé
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
    doc.text(
        `Documento emitido em ${dataEmissao}`,
        CONFIG.margin,
        pageHeight - 12
    )
    doc.text(
        `Pagina ${pageNumber}`,
        pageWidth - CONFIG.margin,
        pageHeight - 12,
        { align: 'right' }
    )
    
    // Assinatura digital
    doc.text(
        'Documento assinado eletronicamente',
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
    )
}

/**
 * Formata CNPJ
 */
function formatarCNPJ(cnpj: string): string {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/**
 * Formata valor monetário
 */
function formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

/**
 * Gera PDF de Notificação Fiscal
 */
export function gerarNotificacaoFiscal(params: NotificacaoParams, brand?: BrandingInfo): jsPDF {
    const doc = new jsPDF()
    let yPos = gerarCabecalho(doc, 'NOTIFICACAO FISCAL', brand)
    
    // Número e data
    doc.setFontSize(CONFIG.fontSize.normal)
    doc.setFont('helvetica', 'bold')
    doc.text(`Notificacao no ${params.numero}`, CONFIG.margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(
        `Data: ${params.data.toLocaleDateString('pt-BR')}`,
        doc.internal.pageSize.width - CONFIG.margin,
        yPos,
        { align: 'right' }
    )
    
    yPos += CONFIG.lineHeight * 2
    
    // Dados do contribuinte
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRIBUINTE:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Nome: ${params.contribuinte.nome}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    doc.text(`CNPJ: ${formatarCNPJ(params.contribuinte.cnpj)}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    
    if (params.contribuinte.nomeFantasia) {
        doc.text(`Nome Fantasia: ${params.contribuinte.nomeFantasia}`, CONFIG.margin + 5, yPos)
        yPos += CONFIG.lineHeight
    }
    
    if (params.contribuinte.endereco) {
        doc.text(`Endereco: ${params.contribuinte.endereco}`, CONFIG.margin + 5, yPos)
        yPos += CONFIG.lineHeight
    }
    
    yPos += CONFIG.lineHeight
    
    // Assunto
    doc.setFont('helvetica', 'bold')
    doc.text('ASSUNTO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    const assuntoLines = doc.splitTextToSize(params.assunto, doc.internal.pageSize.width - CONFIG.margin * 2 - 5)
    doc.text(assuntoLines, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight * assuntoLines.length + CONFIG.lineHeight
    
    // Conteúdo
    doc.setFont('helvetica', 'bold')
    doc.text('CONTEUDO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    const conteudoLines = doc.splitTextToSize(params.conteudo, doc.internal.pageSize.width - CONFIG.margin * 2 - 5)
    doc.text(conteudoLines, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight * conteudoLines.length + CONFIG.lineHeight
    
    // Fundamentação legal
    doc.setFont('helvetica', 'bold')
    doc.text('FUNDAMENTACAO LEGAL:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    const fundamentacaoLines = doc.splitTextToSize(params.fundamentacao, doc.internal.pageSize.width - CONFIG.margin * 2 - 5)
    doc.text(fundamentacaoLines, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight * fundamentacaoLines.length + CONFIG.lineHeight * 2
    
    // Prazo para manifestação
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(
        `PRAZO PARA MANIFESTACAO: ${params.prazo.toLocaleDateString('pt-BR')}`,
        CONFIG.margin,
        yPos
    )
    doc.setTextColor(0, 0, 0)
    
    gerarRodape(doc)
    return doc
}

/**
 * Gera PDF de Termo de Fiscalização
 */
export function gerarTermoFiscalizacao(params: TermoFiscalizacaoParams, brand?: BrandingInfo): jsPDF {
    const doc = new jsPDF()
    let yPos = gerarCabecalho(doc, 'TERMO DE FISCALIZACAO', brand)
    
    // Número e data
    doc.setFontSize(CONFIG.fontSize.normal)
    doc.setFont('helvetica', 'bold')
    doc.text(`Termo no ${params.numero}`, CONFIG.margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(
        `Data: ${params.data.toLocaleDateString('pt-BR')}`,
        doc.internal.pageSize.width - CONFIG.margin,
        yPos,
        { align: 'right' }
    )
    
    yPos += CONFIG.lineHeight * 2
    
    // Dados do contribuinte
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRIBUINTE FISCALIZADO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Nome: ${params.contribuinte.nome}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    doc.text(`CNPJ: ${formatarCNPJ(params.contribuinte.cnpj)}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight * 2
    
    // Período fiscalizado
    doc.setFont('helvetica', 'bold')
    doc.text(`PERIODO FISCALIZADO: ${params.periodo}`, CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight * 2
    
    // Tributos fiscalizados
    doc.setFont('helvetica', 'bold')
    doc.text('TRIBUTOS FISCALIZADOS:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    params.tributos.forEach(tributo => {
        doc.text(`• ${tributo}`, CONFIG.margin + 5, yPos)
        yPos += CONFIG.lineHeight
    })
    yPos += CONFIG.lineHeight
    
    // Documentos analisados
    doc.setFont('helvetica', 'bold')
    doc.text('DOCUMENTOS ANALISADOS:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    params.documentosAnalisados.forEach(doc_item => {
        doc.text(`• ${doc_item}`, CONFIG.margin + 5, yPos)
        yPos += CONFIG.lineHeight
    })
    yPos += CONFIG.lineHeight * 2
    
    // Divergências encontradas (tabela)
    if (params.divergenciasEncontradas.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('DIVERGENCIAS ENCONTRADAS:', CONFIG.margin, yPos)
        yPos += CONFIG.lineHeight
        
        autoTable(doc, {
            startY: yPos,
            head: [['Tipo', 'Descricao', 'Declarado', 'Apurado', 'Diferenca']],
            body: params.divergenciasEncontradas.map(div => [
                div.tipo,
                div.descricao,
                formatarValor(div.valorDeclarado),
                formatarValor(div.valorApurado),
                formatarValor(div.diferenca)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 64, 175] },
            styles: { fontSize: CONFIG.fontSize.small },
            margin: { left: CONFIG.margin, right: CONFIG.margin }
        })
        
        yPos = (doc as any).lastAutoTable.finalY + CONFIG.lineHeight * 2
    }
    
    // Conclusão
    doc.setFont('helvetica', 'bold')
    doc.text('CONCLUSAO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    doc.setFont('helvetica', 'normal')
    const conclusaoLines = doc.splitTextToSize(params.conclusao, doc.internal.pageSize.width - CONFIG.margin * 2 - 5)
    doc.text(conclusaoLines, CONFIG.margin + 5, yPos)
    
    gerarRodape(doc)
    return doc
}

/**
 * Gera PDF de Auto de Infração
 */
export function gerarAutoInfracao(params: AutoInfracaoParams, brand?: BrandingInfo): jsPDF {
    const doc = new jsPDF()
    let yPos = gerarCabecalho(doc, 'AUTO DE INFRACAO', brand)
    
    // Número e data
    doc.setFontSize(CONFIG.fontSize.normal)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(`Auto de Infracao no ${params.numero}`, CONFIG.margin, yPos)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text(
        `Data da Lavratura: ${params.data.toLocaleDateString('pt-BR')}`,
        doc.internal.pageSize.width - CONFIG.margin,
        yPos,
        { align: 'right' }
    )
    
    yPos += CONFIG.lineHeight * 2
    
    // Dados do autuado
    doc.setFont('helvetica', 'bold')
    doc.text('AUTUADO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Nome: ${params.contribuinte.nome}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    doc.text(`CNPJ: ${formatarCNPJ(params.contribuinte.cnpj)}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    
    if (params.contribuinte.endereco) {
        doc.text(`Endereco: ${params.contribuinte.endereco}`, CONFIG.margin + 5, yPos)
        yPos += CONFIG.lineHeight
    }
    
    yPos += CONFIG.lineHeight * 2
    
    // Infrações constatadas (tabela)
    doc.setFont('helvetica', 'bold')
    doc.text('INFRACOES CONSTATADAS:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    autoTable(doc, {
        startY: yPos,
        head: [['Dispositivo Legal', 'Descricao da Infracao', 'Valor da Multa']],
        body: params.infracoesConstatadas.map(inf => [
            inf.artigo,
            inf.descricao,
            formatarValor(inf.valorMulta)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: CONFIG.fontSize.small },
        margin: { left: CONFIG.margin, right: CONFIG.margin },
        foot: [['', 'VALOR TOTAL', formatarValor(params.valorTotal)]],
        footStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' }
    })
    
    yPos = (doc as any).lastAutoTable.finalY + CONFIG.lineHeight * 2
    
    // Informações sobre defesa e recurso
    doc.setFont('helvetica', 'bold')
    doc.text('DIREITOS DO AUTUADO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    doc.setFont('helvetica', 'normal')
    doc.text(
        `• Apresentar defesa administrativa ate: ${params.prazoDefesa.toLocaleDateString('pt-BR')}`,
        CONFIG.margin + 5,
        yPos
    )
    yPos += CONFIG.lineHeight
    
    doc.text(
        `• Prazo para recurso: ${params.prazoRecurso.toLocaleDateString('pt-BR')}`,
        CONFIG.margin + 5,
        yPos
    )
    yPos += CONFIG.lineHeight * 2
    
    doc.setFontSize(CONFIG.fontSize.small)
    doc.text(
        'O nao pagamento no prazo estabelecido implicara em inscricao em Divida Ativa e execucao fiscal.',
        CONFIG.margin + 5,
        yPos
    )
    yPos += CONFIG.lineHeight
    doc.text(
        'A apresentacao de defesa suspende a exigibilidade do credito tributario ate decisao final.',
        CONFIG.margin + 5,
        yPos
    )
    
    gerarRodape(doc)
    return doc
}

/**
 * Gera PDF de Relatório de Arrecadação
 */
export function gerarRelatorioArrecadacao(dados: {
    periodo: string
    totalArrecadado: number
    metaMensal: number
    porAnexo: { anexo: string; valor: number }[]
    topContribuintes: { nome: string; cnpj: string; valor: number }[]
}, brand?: BrandingInfo) {
    const doc = new jsPDF()
    let yPos = gerarCabecalho(doc, 'RELATORIO DE ARRECADACAO', brand)
    
    // Período
    doc.setFontSize(CONFIG.fontSize.subtitle)
    doc.setFont('helvetica', 'bold')
    doc.text(`Periodo: ${dados.periodo}`, CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight * 2
    
    // Resumo geral
    doc.setFontSize(CONFIG.fontSize.normal)
    doc.text('RESUMO GERAL:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Arrecadado: ${formatarValor(dados.totalArrecadado)}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    doc.text(`Meta Mensal: ${formatarValor(dados.metaMensal)}`, CONFIG.margin + 5, yPos)
    yPos += CONFIG.lineHeight
    
    const percentualMeta = (dados.totalArrecadado / dados.metaMensal) * 100
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(percentualMeta >= 100 ? 22 : 220, percentualMeta >= 100 ? 163 : 38, percentualMeta >= 100 ? 74 : 38)
    doc.text(`Percentual da Meta: ${percentualMeta.toFixed(2)}%`, CONFIG.margin + 5, yPos)
    doc.setTextColor(0, 0, 0)
    yPos += CONFIG.lineHeight * 2
    
    // Arrecadação por Anexo
    doc.setFont('helvetica', 'bold')
    doc.text('ARRECADACAO POR ANEXO:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    autoTable(doc, {
        startY: yPos,
        head: [['Anexo', 'Valor Arrecadado', '% do Total']],
        body: dados.porAnexo.map(item => [
            item.anexo,
            formatarValor(item.valor),
            `${((item.valor / dados.totalArrecadado) * 100).toFixed(2)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: CONFIG.fontSize.small },
        margin: { left: CONFIG.margin, right: CONFIG.margin }
    })
    
    yPos = (doc as any).lastAutoTable.finalY + CONFIG.lineHeight * 2
    
    // Top 10 contribuintes
    doc.setFont('helvetica', 'bold')
    doc.text('MAIORES CONTRIBUINTES:', CONFIG.margin, yPos)
    yPos += CONFIG.lineHeight
    
    autoTable(doc, {
        startY: yPos,
        head: [['#', 'Nome', 'CNPJ', 'Valor']],
        body: dados.topContribuintes.map((item, index) => [
            (index + 1).toString(),
            item.nome,
            formatarCNPJ(item.cnpj),
            formatarValor(item.valor)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: CONFIG.fontSize.small },
        margin: { left: CONFIG.margin, right: CONFIG.margin }
    })
    
    gerarRodape(doc)
    return doc
}
