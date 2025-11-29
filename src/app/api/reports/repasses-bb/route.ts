/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function periodoRange(period: string) {
    const [month, year] = period.split('/')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
    return { startDate, endDate }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || searchParams.get('periodo')
    const cnpjFilter = (searchParams.get('cnpj') || '').replace(/\D/g, '')
    const min = parseFloat(searchParams.get('min') || '0')
    const max = parseFloat(searchParams.get('max') || '0')
    const originFilter = (searchParams.get('origin') || '').toLowerCase()

    if (!period) {
        return NextResponse.json({ error: 'period is required (MM/YYYY)' }, { status: 400 })
    }

    try {
        const { startDate, endDate } = periodoRange(period)

        const repasses = await prisma.repasse.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'desc' }
        })

        const companies = await prisma.company.findMany({
            select: { id: true, cnpj: true, name: true }
        })

        const payload = repasses
            .filter(rep => {
                if (!cnpjFilter) return true
                const concat = `${rep.description || ''} ${rep.origin || ''}`.replace(/\D/g, '')
                return concat.includes(cnpjFilter)
            })
            .filter(rep => {
                const amountOk = (!min || rep.amount >= min) && (!max || rep.amount <= max)
                const originOk = originFilter ? ((rep.origin || '').toLowerCase().includes(originFilter)) : true
                return amountOk && originOk
            })
            .map(rep => {
                const concat = `${rep.description || ''} ${rep.origin || ''}`.replace(/\D/g, '')
                const matched = companies.find(c => concat.includes(c.cnpj.replace(/\D/g, '')))
                return {
                    id: rep.id,
                    date: rep.date,
                    amount: rep.amount,
                    origin: rep.origin,
                    description: rep.description,
                    companyId: matched?.id,
                    cnpj: matched?.cnpj,
                    razaoSocial: matched?.name
                }
            })

        return NextResponse.json(payload)
    } catch (error) {
        console.error('Erro relatorio repasses BB:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatorio' }, { status: 500 })
    }
}
