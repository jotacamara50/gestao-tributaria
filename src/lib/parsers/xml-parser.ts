import xml2js from 'xml2js'

export interface PGDASData {
    cnpj: string
    period: string // Format: MM/YYYY
    competencia: string
    receitaBrutaTotal: number
    receitaBrutaMensal: number
    deducoes: number
    baseCalculo: number
    aliquota: number
    valorDevido: number
    valorDAS: number
    issRetido: number
    issSubstituicao: number
    dataApuracao: Date
    anexo?: string // Anexo do Simples Nacional (I, II, III, IV, V)
}

export async function parsePGDAS(xmlContent: string): Promise<PGDASData> {
    const parser = new xml2js.Parser({ 
        explicitArray: false,
        mergeAttrs: true,
        normalizeTags: true,
        attrValueProcessors: [
            (value) => {
                // Remove formatação de números
                if (typeof value === 'string' && value.match(/^\d+[,.]?\d*$/)) {
                    return value.replace(/\./g, '').replace(',', '.')
                }
                return value
            }
        ]
    })
    
    const result = await parser.parseStringPromise(xmlContent)

    // Estrutura real do PGDAS-D da Receita Federal
    const declaracao = result.declaracaopgdas || result.pgdas || result.root || result.declaracao || {}
    const cabecalho = declaracao.cabecalho || {}
    const dadosapuracao = declaracao.dadosapuracao || declaracao.apuracao || declaracao.apuracaodados || {}
    const totalizadores = dadosapuracao.totalizadores || declaracao.totalizadores || {}
    const dadosBasicos = declaracao.dadosbasicos || declaracao.identificacao || declaracao.dadosempresa || {}

    // Extrair CNPJ (pode estar em diferentes lugares)
    const cnpj = cabecalho.cnpj || 
                 declaracao.cnpj || 
                 cabecalho.identificacao?.cnpj ||
                 dadosBasicos.cnpj ||
                 declaracao.dadosempresa?.cnpj ||
                 ''

    // Período de apuração (MM/YYYY) - tag oficial PA vem como AAAAMM
    const periodoRaw = cabecalho.periodo || 
                       cabecalho.periodoapuracao || 
                       dadosapuracao.periodo || 
                       declaracao.pa || 
                       dadosBasicos.pa ||
                       ''
    const periodo = (() => {
        const clean = (periodoRaw || '').toString()
        if (clean.length === 6) {
            return `${clean.substring(4, 6)}/${clean.substring(0, 4)}`
        }
        if (clean.includes('/')) return clean
        return clean
    })()

    // Receita bruta total (últimos 12 meses)
    const receitaBrutaTotal = parseFloat(
        totalizadores.receitabruta12meses || 
        dadosapuracao.receitabruta12meses ||
        dadosapuracao.receita12meses ||
        dadosapuracao.receitabrutatotal ||
        declaracao.receitabruta12meses ||
        declaracao.receitabrutaacumulada ||
        '0'
    )

    // Receita bruta do mês
    const receitaBrutaMensal = parseFloat(
        dadosapuracao.receitabrutamensal ||
        dadosapuracao.receitames ||
        totalizadores.receitames ||
        declaracao.receitabruta ||
        declaracao.receitabrutaresumida ||
        '0'
    )

    // Deduções permitidas
    const deducoes = parseFloat(
        dadosapuracao.deducoes ||
        dadosapuracao.totaldeducoes ||
        '0'
    )

    // Base de cálculo
    const baseCalculo = parseFloat(
        dadosapuracao.basecalculo ||
        dadosapuracao.receitabrutaacumulada ||
        declaracao.basecalculo ||
        '0'
    )

    // Alíquota efetiva
    const aliquota = parseFloat(
        dadosapuracao.aliquota ||
        dadosapuracao.aliquotaefetiva ||
        declaracao.aliquotaefetiva ||
        '0'
    )

    // Valor devido total
    const valorDevido = parseFloat(
        dadosapuracao.valordevido ||
        totalizadores.valordevido ||
        declaracao.valordevido ||
        declaracao.valordas ||
        declaracao.valordar ||
        '0'
    )

    // Valor do DAS a pagar
    const valorDAS = parseFloat(
        dadosapuracao.valordas ||
        totalizadores.valordas ||
        declaracao.valordas ||
        '0'
    )

    // ISS retido na fonte
    const issRetido = parseFloat(
        dadosapuracao.issretido ||
        dadosapuracao.valorissretido ||
        declaracao.issretido ||
        '0'
    )

    // ISS por substituição tributária
    const issSubstituicao = parseFloat(
        dadosapuracao.isssubstituicao ||
        dadosapuracao.valorissst ||
        declaracao.issst ||
        '0'
    )

    return {
        cnpj: cnpj.replace(/\D/g, ''), // Remove formatação
        period: periodo,
        competencia: periodo,
        receitaBrutaTotal,
        receitaBrutaMensal,
        deducoes,
        baseCalculo,
        aliquota,
        valorDevido,
        valorDAS,
        issRetido,
        issSubstituicao,
        dataApuracao: new Date(),
        anexo: dadosapuracao.anexo || declaracao.anexo || undefined
    }
}

export interface DEFISData {
    cnpj: string
    ano: number
    receitaBrutaTotal: number
    receitaExportacao: number
    receitaRevenda: number
    receitaServicos: number
    folhaSalarios: number
    despesasTotal: number
    investimentos: number
    anexo: string
}

export async function parseDEFIS(xmlContent: string): Promise<DEFISData> {
    const parser = new xml2js.Parser({ 
        explicitArray: false,
        mergeAttrs: true,
        normalizeTags: true 
    })
    
    const result = await parser.parseStringPromise(xmlContent)

    const declaracao = result.defis || result.declaracaodefis || {}
    const identificacao = declaracao.identificacao || {}
    const receitas = declaracao.receitas || {}
    const despesas = declaracao.despesas || {}

    return {
        cnpj: (identificacao.cnpj || '').replace(/\D/g, ''),
        ano: parseInt(identificacao.anocalendario || identificacao.ano || '0'),
        receitaBrutaTotal: parseFloat(receitas.total || receitas.receitabrutatotal || '0'),
        receitaExportacao: parseFloat(receitas.exportacao || '0'),
        receitaRevenda: parseFloat(receitas.revenda || '0'),
        receitaServicos: parseFloat(receitas.servicos || '0'),
        folhaSalarios: parseFloat(despesas.folha || despesas.folhasalarios || '0'),
        despesasTotal: parseFloat(despesas.total || '0'),
        investimentos: parseFloat(despesas.investimentos || '0'),
        anexo: identificacao.anexo || declaracao.anexo || ''
    }
}

export interface NFSeData {
    numero: string
    codigoVerificacao: string
    dataEmissao: Date
    competencia: string
    naturezaOperacao: number // 1=Tributação no município, 2=Tributação fora do município, etc
    optanteSimplesNacional: boolean
    incentivadorCultural: boolean
    status: number // 1=Normal, 2=Cancelada
    
    // Prestador
    prestadorCnpj: string
    prestadorRazaoSocial: string
    prestadorInscricaoMunicipal?: string
    
    // Tomador
    tomadorCnpj?: string
    tomadorCpf?: string
    tomadorRazaoSocial?: string
    tomadorInscricaoMunicipal?: string
    
    // Serviço
    valorServicos: number
    valorDeducoes: number
    valorPIS: number
    valorCOFINS: number
    valorINSS: number
    valorIR: number
    valorCSLL: number
    outrasRetencoes: number
    valorIss: number
    issRetido: boolean
    valorLiquidoNfse: number
    
    // Detalhes do serviço
    itemListaServico: string // Código do serviço na lista do município
    codigoCnae?: string
    discriminacao: string
    codigoMunicipio: string
    
    // ISS
    aliquota: number
    baseCalculo: number
}

export async function parseNFSe(xmlContent: string): Promise<NFSeData> {
    const parser = new xml2js.Parser({ 
        explicitArray: false,
        mergeAttrs: true,
        normalizeTags: true 
    })
    
    const result = await parser.parseStringPromise(xmlContent)

    // Padrão ABRASF 2.0/2.1/2.3
    const compNfse = result.compnfse || result.nfse || result.notafiscal || {}
    const nfse = compNfse.nfse || compNfse
    const infNfse = nfse.infnfse || nfse.infsubstituicao || {}
    
    // Dados da NFS-e
    const numero = infNfse.numero || nfse.numero || ''
    const codigoVerificacao = infNfse.codigoverificacao || nfse.codigoverificacao || ''
    const dataEmissao = infNfse.dataemissao || nfse.dataemissao || new Date().toISOString()
    const competencia = infNfse.competencia || nfse.competencia || ''
    
    // Prestador
    const prestador = infNfse.prestadorservico || infNfse.prestador || {}
    const identificacaoPrestador = prestador.identificacaoprestador || prestador
    
    // Tomador
    const tomador = infNfse.tomadorservico || infNfse.tomador || {}
    const identificacaoTomador = tomador.identificacaotomador || tomador
    const cpfCnpjTomador = identificacaoTomador.cpfcnpj || {}
    
    // Serviço
    const servico = infNfse.servico || {}
    const valores = servico.valores || servico
    const itemLista = servico.itemlistaservico || servico.codigoservico || ''
    
    // Valores
    const valorServicos = parseFloat(valores.valorservicos || '0')
    const valorDeducoes = parseFloat(valores.valordeducoes || '0')
    const valorPIS = parseFloat(valores.valorpis || '0')
    const valorCOFINS = parseFloat(valores.valorcofins || '0')
    const valorINSS = parseFloat(valores.valorinss || '0')
    const valorIR = parseFloat(valores.valorir || '0')
    const valorCSLL = parseFloat(valores.valorcsll || '0')
    const outrasRetencoes = parseFloat(valores.outrasretencoes || '0')
    const valorIss = parseFloat(valores.valoriss || '0')
    const valorLiquidoNfse = parseFloat(valores.valorliquidonfse || valores.valorliquido || '0')
    const baseCalculo = parseFloat(valores.basecalculo || '0')
    const aliquota = parseFloat(valores.aliquota || '0')
    const issRetido = valores.issretido === '1' || valores.issretido === 'true' || valores.issretido === true

    return {
        numero: numero.toString(),
        codigoVerificacao,
        dataEmissao: new Date(dataEmissao),
        competencia,
        naturezaOperacao: parseInt(infNfse.naturezaoperacao || '1'),
        optanteSimplesNacional: infNfse.optantesimplesnacional === '1' || infNfse.optantesimplesnacional === true,
        incentivadorCultural: infNfse.incentivadorcultural === '1' || infNfse.incentivadorcultural === true,
        status: parseInt(infNfse.status || nfse.status || '1'),
        
        prestadorCnpj: (identificacaoPrestador.cnpj || '').replace(/\D/g, ''),
        prestadorRazaoSocial: prestador.razaosocial || '',
        prestadorInscricaoMunicipal: identificacaoPrestador.inscricaomunicipal,
        
        tomadorCnpj: cpfCnpjTomador.cnpj ? cpfCnpjTomador.cnpj.replace(/\D/g, '') : undefined,
        tomadorCpf: cpfCnpjTomador.cpf ? cpfCnpjTomador.cpf.replace(/\D/g, '') : undefined,
        tomadorRazaoSocial: tomador.razaosocial || identificacaoTomador.razaosocial,
        tomadorInscricaoMunicipal: identificacaoTomador.inscricaomunicipal,
        
        valorServicos,
        valorDeducoes,
        valorPIS,
        valorCOFINS,
        valorINSS,
        valorIR,
        valorCSLL,
        outrasRetencoes,
        valorIss,
        issRetido,
        valorLiquidoNfse,
        
        itemListaServico: itemLista.toString(),
        codigoCnae: servico.codigocnae || servico.cnae,
        discriminacao: servico.discriminacao || '',
        codigoMunicipio: servico.codigomunicipio || valores.codigomunicipio || '',
        
        aliquota,
        baseCalculo
    }
}
