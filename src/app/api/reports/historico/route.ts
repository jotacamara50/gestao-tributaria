/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeCnpj(raw?: string | null) {
    return (raw || '').replace(/\D/g, '')
}

function monthPeriods(months = 12) {
    const now = new Date()
    const periods: string[] = []
    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mm = `${d.getMonth() + 1}`.padStart(2, '0')
        periods.push(`${mm}/${d.getFullYear()}`)
    }
    return periods
}

function periodoRange(period: string) {
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
    return { startDate, endDate }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const companyIdParam = searchParams.get('companyId') || searchParams.get('id')
    const cnpjParam = searchParams.get('cnpj')
    const monthsParam = parseInt(searchParams.get('months') || '12', 10)
    const periods = monthPeriods(Number.isNaN(monthsParam) ? 12 : monthsParam)

    if (!companyIdParam && !cnpjParam) {
        return NextResponse.json({ error: 'companyId or cnpj is required' }, { status: 400 })
    }

    try {
        let company = null
        if (companyIdParam) {
            company = await prisma.company.findUnique({ where: { id: companyIdParam } })
        }
        if (!company && cnpjParam) {
            company = await prisma.company.findFirst({
                where: { cnpj: { contains: normalizeCnpj(cnpjParam) } }
            })
        }

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        const cnpjDigits = normalizeCnpj(company.cnpj)
        const historico: any[] = []

        for (const period of periods) {
            const { startDate, endDate } = periodoRange(period)

            const declaracao = await prisma.declaration.findFirst({
                where: { companyId: company.id, period, type: 'PGDAS' },
                orderBy: { createdAt: 'desc' }
            })

            const invoices = await prisma.invoice.findMany({
                where: { companyId: company.id, issueDate: { gte: startDate, lte: endDate } }
            })
            const repasses = await prisma.repasse.findMany({
                where: { date: { gte: startDate, lte: endDate } }
            })

            const repassesEmpresa = repasses.filter(r => {
                const concat = `${r.description || ''} ${r.origin || ''}`.replace(/\D/g, '')
                return concat.includes(cnpjDigits)
            })

            historico.push({
                period,
                receitaDeclarada: declaracao?.revenue || 0,
                impostoDeclarado: declaracao?.taxDue || 0,
                nfse: invoices.reduce((sum, inv) => sum + inv.value, 0),
                repasses: repassesEmpresa.reduce((sum, rep) => sum + rep.amount, 0)
            })
        }

        return NextResponse.json({
            companyId: company.id,
            cnpj: company.cnpj,
            razaoSocial: company.name,
            historico: historico.reverse() // crescente no tempo
        })
    } catch (error) {
        console.error('Erro relatorio historico:', error)
        return NextResponse.json({ error: 'Erro ao gerar historico' }, { status: 500 })
    }
}
