import { prisma } from '@/lib/prisma'

export interface DivergenciaDetalhada {
    tipo: 'OMISSAO_RECEITA' | 'SUBLIMITE_EXCEDIDO' | 'RETENCAO_INVALIDA' | 'OMISSO' | 'INADIMPLENTE'
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

/**
 * 1. CRUZAMENTO PGDAS vs NFSe
 * Compara receita declarada no PGDAS com soma de NFSe emitidas
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
        throw new Error('Empresa não encontrada')
    }

    // Buscar declaração PGDAS do período
    const declaration = await prisma.declaration.findFirst({
        where: { companyId, period, type: 'PGDAS' },
        orderBy: { createdAt: 'desc' }
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

    // Calcular período
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    // Buscar todas as NFSe emitidas no período
    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        }
    })

    const totalNFSeEmitidas = invoices.reduce((sum, inv) => sum + inv.value, 0)
    const totalDeclaradoPGDAS = declaration.revenue

    // Tolerância de 2% para diferenças de arredondamento
    const tolerancia = totalDeclaradoPGDAS * 0.02
    const diferenca = Math.abs(totalNFSeEmitidas - totalDeclaradoPGDAS)

    if (diferenca > tolerancia) {
        let gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'MEDIA'
        const percentual = (diferenca / totalDeclaradoPGDAS) * 100

        if (percentual > 50) gravidade = 'CRITICA'
        else if (percentual > 20) gravidade = 'ALTA'
        else if (percentual > 5) gravidade = 'MEDIA'
        else gravidade = 'BAIXA'

        let tipo: 'OMISSAO_RECEITA' = 'OMISSAO_RECEITA'
        let descricao = ''

        if (totalNFSeEmitidas > totalDeclaradoPGDAS) {
            descricao = `Receita de NFSe (R$ ${totalNFSeEmitidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) superior à receita declarada no PGDAS (R$ ${totalDeclaradoPGDAS.toLocaleString('pt-BR', {minimumFractionDigits: 2})}). Possível omissão de receita.`
        } else {
            descricao = `Receita declarada no PGDAS (R$ ${totalDeclaradoPGDAS.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) superior às NFSe emitidas (R$ ${totalNFSeEmitidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}). Verificar outras fontes de receita ou inconsistência.`
        }

        divergencias.push({
            tipo,
            descricao,
            valor: diferenca,
            valorEsperado: totalNFSeEmitidas,
            valorDeclarado: totalDeclaradoPGDAS,
            percentualDivergencia: percentual,
            gravidade,
            fundamentoLegal: 'LC 123/2006, Art. 18, §§ 5º-C e 5º-H',
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
        score: divergencias.length === 0 ? 100 : Math.max(0, 100 - (divergencias.length * 20))
    }
}

/**
 * 2. VERIFICAÇÃO DE SUBLIMITES
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
        throw new Error('Empresa não encontrada')
    }

    // Buscar configurações dos sublimites
    const settings = await prisma.settings.findUnique({
        where: { id: 'default' }
    })

    const sublimiteEstadual = settings?.sublimitEstadual || 3600000
    const sublimiteMunicipal = settings?.sublimitMunicipal || 4800000

    // Buscar todas as declarações do ano
    const declarations = await prisma.declaration.findMany({
        where: {
            companyId,
            period: { contains: `/${year}` },
            type: 'PGDAS'
        }
    })

    const receitaBrutaAnual = declarations.reduce((sum, decl) => sum + decl.revenue, 0)

    // Verificar sublimite estadual
    if (receitaBrutaAnual > sublimiteEstadual) {
        const excesso = receitaBrutaAnual - sublimiteEstadual
        const percentual = (excesso / sublimiteEstadual) * 100

        divergencias.push({
            tipo: 'SUBLIMITE_EXCEDIDO',
            descricao: `Faturamento anual de R$ ${receitaBrutaAnual.toLocaleString('pt-BR', {minimumFractionDigits: 2})} excede o sublimite estadual de R$ ${sublimiteEstadual.toLocaleString('pt-BR', {minimumFractionDigits: 2})} em ${percentual.toFixed(2)}%. Empresa deve recolher ICMS em guia separada.`,
            valor: excesso,
            valorEsperado: sublimiteEstadual,
            valorDeclarado: receitaBrutaAnual,
            percentualDivergencia: percentual,
            gravidade: percentual > 50 ? 'CRITICA' : percentual > 20 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'LC 123/2006, Art. 20',
            periodo: year.toString()
        })
    }

    // Verificar sublimite municipal
    if (receitaBrutaAnual > sublimiteMunicipal) {
        const excesso = receitaBrutaAnual - sublimiteMunicipal
        const percentual = (excesso / sublimiteMunicipal) * 100

        divergencias.push({
            tipo: 'SUBLIMITE_EXCEDIDO',
            descricao: `Faturamento anual de R$ ${receitaBrutaAnual.toLocaleString('pt-BR', {minimumFractionDigits: 2})} excede o sublimite municipal de R$ ${sublimiteMunicipal.toLocaleString('pt-BR', {minimumFractionDigits: 2})} em ${percentual.toFixed(2)}%. Empresa deve recolher ISS em guia separada.`,
            valor: excesso,
            valorEsperado: sublimiteMunicipal,
            valorDeclarado: receitaBrutaAnual,
            percentualDivergencia: percentual,
            gravidade: percentual > 50 ? 'CRITICA' : percentual > 20 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'LC 123/2006, Art. 18, § 5º-C',
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
 * 3. VALIDAÇÃO DE RETENÇÕES NA FONTE
 * Verifica se retenções de ISS declaradas batem com NFSe
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
        throw new Error('Empresa não encontrada')
    }

    // Buscar declaração do período
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

    // Calcular período
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    // Buscar NFSe do período
    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        }
    })

    // Calcular total de retenções nas NFSe
    // Nota: Aqui seria necessário ter um campo 'issRetido' ou 'valorRetido' nas invoices
    // Por enquanto, vamos simular
    const totalRetidoNFSe = invoices
        .filter(inv => inv.xmlContent?.includes('ISSRetido') || inv.xmlContent?.includes('issretido'))
        .reduce((sum, inv) => sum + (inv.value * 0.05), 0) // Simulação: 5% de ISS retido

    // O valor retido deveria estar no XML do PGDAS
    // Por enquanto, vamos assumir que está no campo taxDue
    const retidoDeclarado = declaration.taxDue * 0.1 // Simulação

    const diferenca = Math.abs(totalRetidoNFSe - retidoDeclarado)
    const tolerancia = retidoDeclarado * 0.05

    if (diferenca > tolerancia && retidoDeclarado > 0) {
        divergencias.push({
            tipo: 'RETENCAO_INVALIDA',
            descricao: `Retenções de ISS nas NFSe (R$ ${totalRetidoNFSe.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) divergem do declarado (R$ ${retidoDeclarado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}). Verificar lançamentos.`,
            valor: diferenca,
            valorEsperado: totalRetidoNFSe,
            valorDeclarado: retidoDeclarado,
            percentualDivergencia: (diferenca / retidoDeclarado) * 100,
            gravidade: diferenca > 1000 ? 'ALTA' : 'MEDIA',
            fundamentoLegal: 'Lei Complementar Municipal de ISS',
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
 * 4. DETECÇÃO DE OMISSOS
 * Identifica empresas ativas que não declararam PGDAS no período
 */
export async function detectarOmissos(period: string): Promise<ResultadoCruzamento[]> {
    // Buscar todas as empresas ativas no Simples Nacional
    const empresasAtivas = await prisma.company.findMany({
        where: {
            status: 'Ativo',
            regime: 'Simples Nacional'
        }
    })

    // Buscar declarações do período
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
            descricao: `Empresa ativa no Simples Nacional não apresentou declaração PGDAS-D no período ${period}`,
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
 * 5. DETECÇÃO DE INADIMPLENTES
 * Cruza declarações com repasses efetivamente recebidos (DAF607 ou similar)
 */
export async function detectarInadimplentes(period: string): Promise<ResultadoCruzamento[]> {
    const resultados: ResultadoCruzamento[] = []

    // Buscar todas as declarações do período
    const declaracoes = await prisma.declaration.findMany({
        where: {
            period,
            type: 'PGDAS'
        },
        include: {
            company: true
        }
    })

    // Buscar repasses do período (DAF607 ou arrecadação municipal)
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    const repasses = await prisma.repasse.findMany({
        where: {
            date: { gte: startDate, lte: endDate }
        }
    })

    for (const declaracao of declaracoes) {
        // Procurar repasse correspondente
        const repasseEncontrado = repasses.find(r => 
            r.description?.includes(declaracao.company.cnpj) ||
            r.origin?.includes(declaracao.company.cnpj)
        )

        // Se declarou imposto devido mas não há repasse
        if (declaracao.taxDue > 100 && !repasseEncontrado) {
            resultados.push({
                companyId: declaracao.companyId,
                cnpj: declaracao.company.cnpj,
                razaoSocial: declaracao.company.name,
                divergencias: [{
                    tipo: 'INADIMPLENTE',
                    descricao: `Empresa declarou R$ ${declaracao.taxDue.toLocaleString('pt-BR', {minimumFractionDigits: 2})} de ISS devido no período ${period}, mas não há registro de pagamento no DAF607`,
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
 * EXECUTOR GERAL - Executa todos os cruzamentos para uma empresa
 */
export async function executarTodosCruzamentos(
    companyId: string,
    period: string
): Promise<ResultadoCruzamento> {
    const [month, year] = period.split('/')
    const anoAtual = parseInt(year)

    // Executar todos os cruzamentos
    const resultado1 = await cruzamentoPgdasNfse(companyId, period)
    const resultado2 = await verificarSublimites(companyId, anoAtual)
    const resultado3 = await validarRetencoes(companyId, period)

    // Consolidar todas as divergências
    const todasDivergencias = [
        ...resultado1.divergencias,
        ...resultado2.divergencias,
        ...resultado3.divergencias
    ]

    // Calcular score geral (média ponderada)
    const scoreGeral = Math.round(
        (resultado1.score * 0.4 + resultado2.score * 0.35 + resultado3.score * 0.25)
    )

    // Salvar divergências no banco
    for (const div of todasDivergencias) {
        const divId = `${companyId}-${period}-${div.tipo}-${Date.now()}`
        
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

    // Atualizar nível de risco da empresa
    let nivelRisco = 'Baixo'
    if (scoreGeral < 30) nivelRisco = 'Crítico'
    else if (scoreGeral < 50) nivelRisco = 'Alto'
    else if (scoreGeral < 75) nivelRisco = 'Médio'

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
 * EXECUTOR EM LOTE - Executa cruzamentos para todas as empresas
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

    // Processar cada empresa
    for (const empresa of empresas) {
        const resultado = await executarTodosCruzamentos(empresa.id, period)
        if (resultado.totalDivergencias > 0) {
            comDivergencias++
            totalDivergencias += resultado.totalDivergencias
        }
    }

    // Detectar omissos
    const omissos = await detectarOmissos(period)
    
    // Detectar inadimplentes
    const inadimplentes = await detectarInadimplentes(period)

    return {
        processadas: empresas.length,
        comDivergencias,
        omissos: omissos.length,
        inadimplentes: inadimplentes.length,
        totalDivergencias
    }
}