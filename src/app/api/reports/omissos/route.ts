import { NextRequest, NextResponse } from 'next/server'
import { detectarOmissos } from '@/lib/engine/crossing'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || searchParams.get('periodo')

    if (!period) {
        return NextResponse.json({ error: 'period is required (MM/YYYY)' }, { status: 400 })
    }

    try {
        const dados = await detectarOmissos(period)
        const [month, year] = period.split('/')
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

        // NFSe emitidas no período para omissos
        const nfsePorEmpresa = await prisma.invoice.groupBy({
            by: ['companyId'],
            where: {
                companyId: { in: dados.map(d => d.companyId) },
                issueDate: { gte: startDate, lte: endDate }
            },
            _sum: { value: true }
        })
        const mapNF = new Map<string, number>()
        nfsePorEmpresa.forEach(n => mapNF.set(n.companyId, n._sum.value || 0))

        const payload = dados.map(d => ({
            companyId: d.companyId,
            cnpj: d.cnpj,
            razaoSocial: d.razaoSocial,
            periodo: period,
            valorNfse: mapNF.get(d.companyId) || 0
        }))
        return NextResponse.json(payload)
    } catch (error) {
        console.error('Erro relatorio omissos:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
    }
}
