import { prisma } from '@/lib/prisma'

export interface CrossingResult {
    companyId: string
    divergences: {
        type: string
        description: string
        value: number
    }[]
}

export async function comparePgdasNfse(companyId: string, period: string): Promise<CrossingResult> {
    const divergences: {
        type: string
        description: string
        value: number
    }[] = []

    const declaration = await prisma.declaration.findFirst({
        where: { companyId, period, type: 'PGDAS' }
    })

    if (!declaration) {
        return { companyId, divergences: [] }
    }

    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)

    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        }
    })

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.value, 0)
    const declared = declaration.revenue

    if (totalInvoiced > declared * 1.05) {
        const difference = totalInvoiced - declared
        divergences.push({
            type: 'Omissão de Receita',
            description: `NFS-e emitidas somam R$ ${totalInvoiced.toFixed(2)}, mas PGDAS declara R$ ${declared.toFixed(2)}`,
            value: difference
        })
    }

    return { companyId, divergences }
}

export async function checkSublimite(companyId: string, year: number, limit: number = 3600000): Promise<CrossingResult> {
    const divergences: {
        type: string
        description: string
        value: number
    }[] = []

    const declarations = await prisma.declaration.findMany({
        where: {
            companyId,
            period: { contains: `/${year}` }
        }
    })

    const totalRevenue = declarations.reduce((sum, decl) => sum + decl.revenue, 0)

    if (totalRevenue > limit) {
        divergences.push({
            type: 'Sublimite Excedido',
            description: `Faturamento anual de R$ ${totalRevenue.toFixed(2)} excede o sublimite de R$ ${limit.toFixed(2)}`,
            value: totalRevenue - limit
        })
    }

    return { companyId, divergences }
}

export async function detectOmissos(period: string): Promise<string[]> {
    const allCompanies = await prisma.company.findMany({
        where: { status: 'Ativo', regime: 'Simples Nacional' }
    })

    const declarations = await prisma.declaration.findMany({
        where: { period, type: 'PGDAS' }
    })

    const declaredCompanyIds = new Set(declarations.map(d => d.companyId))
    const omissos = allCompanies
        .filter(c => !declaredCompanyIds.has(c.id))
        .map(c => c.id)

    return omissos
}

export async function runCrossingChecks(companyId: string): Promise<void> {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
            declarations: {
                orderBy: { createdAt: 'desc' },
                take: 12
            }
        }
    })

    if (!company) return

    for (const declaration of company.declarations) {
        const result = await comparePgdasNfse(companyId, declaration.period)

        for (const div of result.divergences) {
            await prisma.divergence.upsert({
                where: { id: `${companyId}-${declaration.period}-${div.type}` },
                update: {
                    description: div.description,
                    value: div.value,
                    status: 'Pendente'
                },
                create: {
                    id: `${companyId}-${declaration.period}-${div.type}`,
                    companyId,
                    type: div.type,
                    description: div.description,
                    value: div.value,
                    status: 'Pendente'
                }
            })
        }
    }

    const currentYear = new Date().getFullYear()
    const sublimitResult = await checkSublimite(companyId, currentYear)

    for (const div of sublimitResult.divergences) {
        await prisma.divergence.upsert({
            where: { id: `${companyId}-${currentYear}-${div.type}` },
            update: {
                description: div.description,
                value: div.value,
                status: 'Pendente'
            },
            create: {
                id: `${companyId}-${currentYear}-${div.type}`,
                companyId,
                type: div.type,
                description: div.description,
                value: div.value,
                status: 'Pendente'
            }
        })
    }

    const allDivergences = await prisma.divergence.findMany({
        where: { companyId, status: 'Pendente' }
    })

    let riskLevel = 'Baixo'
    if (allDivergences.length > 0) {
        const totalValue = allDivergences.reduce((sum, d) => sum + d.value, 0)
        if (totalValue > 50000 || allDivergences.length > 3) {
            riskLevel = 'Alto'
        } else if (totalValue > 10000 || allDivergences.length > 1) {
            riskLevel = 'Médio'
        }
    }

    await prisma.company.update({
        where: { id: companyId },
        data: { riskLevel }
    })
}
