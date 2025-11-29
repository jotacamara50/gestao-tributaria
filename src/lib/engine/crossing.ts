import { prisma } from '@/lib/prisma'

export type DivergenciaTipo =
    | 'OMISSAO_RECEITA'
    | 'SUBLIMITE_EXCEDIDO'
    | 'RETENCAO_INVALIDA'
    | 'OMISSO'
    | 'INADIMPLENTE'
    | 'RETIFICACAO_A_MENOR'
    | 'ALIQUOTA_DIVERGENTE'
    | 'MUNICIPIO_DIVERGENTE'

export interface DivergenciaDetalhada {
    tipo: DivergenciaTipo
    descricao: string
    valor: number
    valorEsperado?: number
    valorDeclarado?: number
    percentualDivergencia?: number
    gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
    fundamentoLegal?: string
    periodo: string
}

export interface ResultadoCruzamento {
    companyId: string
    cnpj: string
    razaoSocial: string
    divergencias: DivergenciaDetalhada[]
    totalDivergencias: number
    valorTotalDivergente: number
    score: number // 0-100, quanto menor pior
}

function parseAliquotaFromXml(xml?: string | null): number | null {
    if (!xml) return null
    const match = xml.match(/aliquota[^0-9]*([0-9]+[.,]?[0-9]*)/i) || xml.match(/<Aliquota[^>]*>([0-9.,]+)<\/Aliquota>/i)
    if (!match?.[1]) return null
    const raw = match[1].replace(',', '.')
    let value = parseFloat(raw)
    if (isNaN(value)) return null
    if (value > 1) {
        value = value / 100
    }
    return value
}

function parseMunicipioFromXml(xml?: string | null): string | null {
    if (!xml) return null
    const municipioRegexes = [
        /<CodigoMunicipioPrestacao[^>]*>([^<]+)<\/CodigoMunicipioPrestacao>/i,
        /<cMunFG[^>]*>([^<]+)<\/cMunFG>/i,
        /<MunicipioPrestador[^>]*>([^<]+)<\/MunicipioPrestador>/i,
        /<municipioPrestacao[^>]*>([^<]+)<\/municipioPrestacao>/i
    ]

    for (const regex of municipioRegexes) {
        const match = xml.match(regex)
        if (match?.[1]) {
            return match[1].trim().toLowerCase()
        }
    }
    return null
}

/**
 * 1. CRUZAMENTO PGDAS vs NFSe
 * Compara receita declarada no PGDAS com soma de NFSe emitidas
 * Inclui detecção de retificação a menor e de divergência de município
 */
export async function cruzamentoPgdasNfse(
    companyId: string, 
    period: string
): Promise<ResultadoCruzamento> {
    const divergencias: DivergenciaDetalhada[] = []

    const company = await prisma.company.findUnique({
        where: { id: companyId }
    })

    if (!company) {
        throw new Error('Empresa nao encontrada')
    }

    // Buscar todas as declaracoes PGDAS do periodo (para detectar retificacao)
    const declarations = await prisma.declaration.findMany({
        where: { companyId, period, type: 'PGDAS' },
        orderBy: { createdAt: 'asc' }
    })

    if (!declarations.length) {
        return {
            companyId,
            cnpj: company.cnpj,
            razaoSocial: company.name,
            divergencias: [],
            totalDivergencias: 0,
            valorTotalDivergente: 0,
            score: 100
        }
    }

    const declaration = declarations[declarations.length - 1]

    // Detecao de retificacao a menor
    if (declarations.length > 1) {
        const original = declarations[0]
        const reducaoReceita = original.revenue - declaration.revenue
        const reducaoImposto = original.taxDue - declaration.taxDue

        if (reducaoReceita > 0.01 || reducaoImposto > 0.01) {
            const percentual = original.revenue > 0 ? (reducaoReceita / original.revenue) * 100 : 0
            divergencias.push({
                tipo: 'RETIFICACAO_A_MENOR',
                descricao: `Declaracao retificadora reduziu a base de calculo em R$ ${reducaoReceita.toFixed(2)} (de ${original.revenue.toFixed(2)} para ${declaration.revenue.toFixed(2)}).`,
                valor: reducaoReceita,
                valorDeclarado: declaration.revenue,
                valorEsperado: original.revenue,
                percentualDivergencia: percentual,
                gravidade: percentual > 20 ? 'CRITICA' : percentual > 10 ? 'ALTA' : 'MEDIA',
                fundamentoLegal: 'Item 4.30.5.7 do TR / fiscalizacao de retificacao a menor',
                periodo: period
            })
        }
    }

    // Calcular periodo
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    // Buscar NFSe do periodo
    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        }
    })

    const totalNFSeEmitidas = invoices.reduce((sum, inv) => sum + inv.value, 0)
    const totalDeclaradoPGDAS = declaration.revenue

    // Tolerancia de 2% para arredondamentos
    const tolerancia = totalDeclaradoPGDAS * 0.02
    const diferenca = Math.abs(totalNFSeEmitidas - totalDeclaradoPGDAS)

    if (diferenca > tolerancia) {
        const percentual = totalDeclaradoPGDAS > 0 ? (diferenca / totalDeclaradoPGDAS) * 100 : 0
        let gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'MEDIA'

        if (percentual > 50) gravidade = 'CRITICA'
        else if (percentual > 20) gravidade = 'ALTA'
        else if (percentual > 5) gravidade = 'MEDIA'
        else gravidade = 'BAIXA'

        const descricao = totalNFSeEmitidas > totalDeclaradoPGDAS
            ? `Receita de NFSe (R$ ${totalNFSeEmitidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) superior a receita declarada no PGDAS (R$ ${totalDeclaradoPGDAS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Possivel omissao de receita.`
            : `Receita declarada no PGDAS (R$ ${totalDeclaradoPGDAS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) superior as NFSe emitidas (R$ ${totalNFSeEmitidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Verificar outras fontes de receita ou inconsistencias.`

        divergencias.push({
            tipo: 'OMISSAO_RECEITA',
            descricao,
            valor: diferenca,
            valorEsperado: totalNFSeEmitidas,
            valorDeclarado: totalDeclaradoPGDAS,
            percentualDivergencia: percentual,
            gravidade,
            fundamentoLegal: 'LC 123/2006, Art. 18',
            periodo: period
        })
    }

    // Divergencia de municipio de prestacao
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
    const municipioSede = settings?.cityName?.toLowerCase()
    if (municipioSede) {
        const invoicesFora = invoices.filter(inv => {
            const municipioPrestacao = parseMunicipioFromXml(inv.xmlContent)
            if (!municipioPrestacao) return false
            return !municipioPrestacao.includes(municipioSede)
        })

        const valorFora = invoicesFora.reduce((sum, inv) => sum + inv.value, 0)
        if (valorFora > 0) {
            divergencias.push({
                tipo: 'MUNICIPIO_DIVERGENTE',
                descricao: `Ha NFSe com municipio de prestacao diferente de ${settings?.cityName}. Valor total fora do municipio: R$ ${valorFora.toFixed(2)}. Conferir se ISS foi recolhido ao municipio de destino.`,
                valor: valorFora,
                valorDeclarado: totalDeclaradoPGDAS,
                gravidade: valorFora > 10000 ? 'ALTA' : 'MEDIA',
                fundamentoLegal: 'Item 4.30.5.4 do TR - ISS devido ao municipio competente',
                periodo: period
            })
        }
    }

    return {
        companyId,
        cnpj: company.cnpj,
        razaoSocial: company.name,
        divergencias,
        totalDivergencias: divergencias.length,
        valorTotalDivergente: divergencias.reduce((sum, d) => sum + d.valor, 0),
        score: divergencias.length === 0 ? 100 : Math.max(0, 100 - (divergencias.length * 20))
    }
}

/**
 * 2. VERIFICACAO DE SUBLIMITES
 * LC 123/2006: Sublimite Estadual R$ 3,6M e Municipal R$ 4,8M
 */
export async function verificarSublimites(
    companyId: string, 
    year: number
): Promise<ResultadoCruzamento> {
    const divergencias: DivergenciaDetalhada[] = []

    const company = await prisma.company.findUnique({
        where: { id: companyId }
    })

    if (!company) {
        throw new Error('Empresa nao encontrada')
    }

    const settings = await prisma.settings.findUnique({
        where: { id: 'default' }
    })

    const sublimiteEstadual = settings?.sublimitEstadual || 3600000
    const sublimiteMunicipal = settings?.sublimitMunicipal || 4800000

    const declarations = await prisma.declaration.findMany({
        where: {
            companyId,
            period: { contains: `/${year}` },
            type: 'PGDAS'
        }
    })

    const receitaBrutaAnual = declarations.reduce((sum, decl) => sum + decl.revenue, 0)

    if (receitaBrutaAnual > sublimiteEstadual) {
        const excesso = receitaBrutaAnual - sublimiteEstadual
        const percentual = (excesso / sublimiteEstadual) * 100

        divergencias.push({
            tipo: 'SUBLIMITE_EXCEDIDO',
            descricao: `Faturamento anual de R$ ${receitaBrutaAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} excede o sublimite estadual de R$ ${sublimiteEstadual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${percentual.toFixed(2)}%.`,
            valor: excesso,
            valorEsperado: sublimiteEstadual,
            valorDeclarado: receitaBrutaAnual,
            percentualDivergencia: percentual,
            gravidade: percentual > 50 ? 'CRITICA' : percentual > 20 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'LC 123/2006, Art. 20',
            periodo: year.toString()
        })
    }

    if (receitaBrutaAnual > sublimiteMunicipal) {
        const excesso = receitaBrutaAnual - sublimiteMunicipal
        const percentual = (excesso / sublimiteMunicipal) * 100

        divergencias.push({
            tipo: 'SUBLIMITE_EXCEDIDO',
            descricao: `Faturamento anual de R$ ${receitaBrutaAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} excede o sublimite municipal de R$ ${sublimiteMunicipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${percentual.toFixed(2)}%.`,
            valor: excesso,
            valorEsperado: sublimiteMunicipal,
            valorDeclarado: receitaBrutaAnual,
            percentualDivergencia: percentual,
            gravidade: percentual > 50 ? 'CRITICA' : percentual > 20 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'LC 123/2006, Art. 18',
            periodo: year.toString()
        })
    }

    return {
        companyId,
        cnpj: company.cnpj,
        razaoSocial: company.name,
        divergencias,
        totalDivergencias: divergencias.length,
        valorTotalDivergente: divergencias.reduce((sum, d) => sum + d.valor, 0),
        score: divergencias.length === 0 ? 100 : Math.max(0, 100 - (divergencias.length * 30))
    }
}

/**
 * 3. VALIDACAO DE RETENCOES NA FONTE E ALIQUOTAS
 * Compara aliquota efetiva declarada com aliquota retida em NFSe
 */
export async function validarRetencoes(
    companyId: string,
    period: string
): Promise<ResultadoCruzamento> {
    const divergencias: DivergenciaDetalhada[] = []

    const company = await prisma.company.findUnique({
        where: { id: companyId }
    })

    if (!company) {
        throw new Error('Empresa nao encontrada')
    }

    const declaration = await prisma.declaration.findFirst({
        where: { companyId, period, type: 'PGDAS' }
    })

    if (!declaration) {
        return {
            companyId,
            cnpj: company.cnpj,
            razaoSocial: company.name,
            divergencias: [],
            totalDivergencias: 0,
            valorTotalDivergente: 0,
            score: 100
        }
    }

    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        }
    })

    const aliquotaEfetiva = declaration.revenue > 0 ? declaration.taxDue / declaration.revenue : 0

    const invoicesComRetencao = invoices.filter(inv => 
        (inv.xmlContent && /iss.?ret/i.test(inv.xmlContent)) || inv.xmlContent?.includes('RETIDO')
    )

    const aliquotasRetidas = invoicesComRetencao.map(inv => {
        const parsed = parseAliquotaFromXml(inv.xmlContent)
        if (parsed !== null) return parsed
        // fallback: assume 5% retencao se marcado como retido
        return 0.05
    })

    const aliquotaRetidaMedia = aliquotasRetidas.length
        ? aliquotasRetidas.reduce((sum, a) => sum + a, 0) / aliquotasRetidas.length
        : 0

    const valorRetidoNFSe = invoicesComRetencao.reduce((sum, inv, idx) => {
        const aliq = aliquotasRetidas[idx] || aliquotaRetidaMedia || 0
        return sum + inv.value * aliq
    }, 0)

    // Se houve retencao na nota mas aliquota efetiva declarada diverge muito
    const diferencaAliquota = Math.abs(aliquotaEfetiva - aliquotaRetidaMedia)
    if (invoicesComRetencao.length > 0 && diferencaAliquota > 0.005) {
        divergencias.push({
            tipo: 'ALIQUOTA_DIVERGENTE',
            descricao: `Aliquota efetiva declarada no PGDAS (${(aliquotaEfetiva * 100).toFixed(2)}%) difere da aliquota retida em NFSe (${(aliquotaRetidaMedia * 100).toFixed(2)}%).`,
            valor: valorRetidoNFSe,
            valorDeclarado: declaration.taxDue,
            percentualDivergencia: diferencaAliquota * 100,
            gravidade: diferencaAliquota > 0.02 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'Item 4.30.6.3 do TR - cruzamento de aliquotas declaradas vs retidas',
            periodo: period
        })
    }

    // Divergencia de retencao declarada vs NFSe
    const retidoDeclarado = declaration.taxDue * 0.1 // placeholder ate termos campo especifico
    const diferencaValor = Math.abs(valorRetidoNFSe - retidoDeclarado)
    const tolerancia = retidoDeclarado * 0.05

    if (retidoDeclarado > 0 && diferencaValor > tolerancia) {
        divergencias.push({
            tipo: 'RETENCAO_INVALIDA',
            descricao: `Retencoes de ISS nas NFSe (R$ ${valorRetidoNFSe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) divergem do declarado (R$ ${retidoDeclarado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Verificar lancamentos.`,
            valor: diferencaValor,
            valorEsperado: valorRetidoNFSe,
            valorDeclarado: retidoDeclarado,
            percentualDivergencia: retidoDeclarado > 0 ? (diferencaValor / retidoDeclarado) * 100 : undefined,
            gravidade: diferencaValor > 1000 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'Lei Complementar Municipal de ISS / Item 4.30.6.3',
            periodo: period
        })
    }

    return {
        companyId,
        cnpj: company.cnpj,
        razaoSocial: company.name,
        divergencias,
        totalDivergencias: divergencias.length,
        valorTotalDivergente: divergencias.reduce((sum, d) => sum + d.valor, 0),
        score: divergencias.length === 0 ? 100 : Math.max(0, 100 - (divergencias.length * 25))
    }
}

/**
 * 4. DETECCAO DE OMISSOS
 */
export async function detectarOmissos(period: string): Promise<ResultadoCruzamento[]> {
    const empresasAtivas = await prisma.company.findMany({
        where: {
            status: 'Ativo',
            regime: 'Simples Nacional'
        }
    })

    const declaracoes = await prisma.declaration.findMany({
        where: {
            period,
            type: 'PGDAS'
        }
    })

    const idsDeclararam = new Set(declaracoes.map(d => d.companyId))
    const empresasOmissas = empresasAtivas.filter(e => !idsDeclararam.has(e.id))

    return empresasOmissas.map(empresa => ({
        companyId: empresa.id,
        cnpj: empresa.cnpj,
        razaoSocial: empresa.name,
        divergencias: [{
            tipo: 'OMISSO',
            descricao: `Empresa ativa no Simples Nacional nao apresentou declaracao PGDAS-D no periodo ${period}`,
            valor: 0,
            gravidade: 'ALTA',
            fundamentoLegal: 'RES CGSN 140/2018, Art. 38',
            periodo: period
        }],
        totalDivergencias: 1,
        valorTotalDivergente: 0,
        score: 30
    }))
}

/**
 * 5. DETECCAO DE INADIMPLENTES
 */
export async function detectarInadimplentes(period: string): Promise<ResultadoCruzamento[]> {
    const resultados: ResultadoCruzamento[] = []

    const declaracoes = await prisma.declaration.findMany({
        where: {
            period,
            type: 'PGDAS'
        },
        include: {
            company: true
        }
    })

    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    const repasses = await prisma.repasse.findMany({
        where: {
            date: { gte: startDate, lte: endDate }
        }
    })

    for (const declaracao of declaracoes) {
        const repasseEncontrado = repasses.find(r => 
            r.description?.includes(declaracao.company.cnpj) ||
            r.origin?.includes(declaracao.company.cnpj)
        )

        if (declaracao.taxDue > 100 && !repasseEncontrado) {
            resultados.push({
                companyId: declaracao.companyId,
                cnpj: declaracao.company.cnpj,
                razaoSocial: declaracao.company.name,
                divergencias: [{
                    tipo: 'INADIMPLENTE',
                    descricao: `Empresa declarou R$ ${declaracao.taxDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ISS devido no periodo ${period}, mas nao ha registro de pagamento.`,
                    valor: declaracao.taxDue,
                    valorDeclarado: declaracao.taxDue,
                    valorEsperado: 0,
                    percentualDivergencia: 100,
                    gravidade: declaracao.taxDue > 5000 ? 'CRITICA' : declaracao.taxDue > 1000 ? 'ALTA' : 'MEDIA',
                    fundamentoLegal: 'CTN, Art. 139 e Lei Municipal de ISS',
                    periodo: period
                }],
                totalDivergencias: 1,
                valorTotalDivergente: declaracao.taxDue,
                score: 20
            })
        }
    }

    return resultados
}

/**
 * EXECUTOR GERAL
 */
export async function executarTodosCruzamentos(
    companyId: string,
    period: string
): Promise<ResultadoCruzamento> {
    const [month, year] = period.split('/')
    const anoAtual = parseInt(year)

    const resultado1 = await cruzamentoPgdasNfse(companyId, period)
    const resultado2 = await verificarSublimites(companyId, anoAtual)
    const resultado3 = await validarRetencoes(companyId, period)

    const todasDivergencias = [
        ...resultado1.divergencias,
        ...resultado2.divergencias,
        ...resultado3.divergencias
    ]

    const scoreGeral = Math.round(
        (resultado1.score * 0.4 + resultado2.score * 0.35 + resultado3.score * 0.25)
    )

    for (const div of todasDivergencias) {
        await prisma.divergence.create({
            data: {
                companyId,
                type: div.tipo,
                description: div.descricao,
                value: div.valor,
                status: 'Pendente'
            }
        })
    }

    let nivelRisco = 'Baixo'
    if (scoreGeral < 30) nivelRisco = 'Critico'
    else if (scoreGeral < 50) nivelRisco = 'Alto'
    else if (scoreGeral < 75) nivelRisco = 'Medio'

    await prisma.company.update({
        where: { id: companyId },
        data: { riskLevel: nivelRisco }
    })

    return {
        companyId: resultado1.companyId,
        cnpj: resultado1.cnpj,
        razaoSocial: resultado1.razaoSocial,
        divergencias: todasDivergencias,
        totalDivergencias: todasDivergencias.length,
        valorTotalDivergente: todasDivergencias.reduce((sum, d) => sum + d.valor, 0),
        score: scoreGeral
    }
}

/**
 * EXECUTOR EM LOTE
 */
export async function executarCruzamentoEmLote(period: string): Promise<{
    processadas: number
    comDivergencias: number
    omissos: number
    inadimplentes: number
    totalDivergencias: number
}> {
    const empresas = await prisma.company.findMany({
        where: {
            status: 'Ativo',
            regime: 'Simples Nacional'
        }
    })

    let comDivergencias = 0
    let totalDivergencias = 0

    for (const empresa of empresas) {
        const resultado = await executarTodosCruzamentos(empresa.id, period)
        if (resultado.totalDivergencias > 0) {
            comDivergencias++
            totalDivergencias += resultado.totalDivergencias
        }
    }

    const omissos = await detectarOmissos(period)
    const inadimplentes = await detectarInadimplentes(period)

    return {
        processadas: empresas.length,
        comDivergencias,
        omissos: omissos.length,
        inadimplentes: inadimplentes.length,
        totalDivergencias
    }
}
