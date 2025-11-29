/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cruzamentoPgdasNfse, validarRetencoes, verificarSublimites } from '@/lib/engine/crossing'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || searchParams.get('periodo')

    if (!period) {
        return NextResponse.json({ error: 'period is required (MM/YYYY)' }, { status: 400 })
    }

    const [, yearStr] = period.split('/')
    const ano = parseInt(yearStr || `${new Date().getFullYear()}`, 10)

    try {
        const companies = await prisma.company.findMany({
            where: { status: 'Ativo' }
        })

        const divergentes: any[] = []

        for (const company of companies) {
            const resultadoPgdas = await cruzamentoPgdasNfse(company.id, period)
            const resultadoRetencao = await validarRetencoes(company.id, period)
            const resultadoLimites = await verificarSublimites(company.id, ano)

            const todas = [
                ...resultadoPgdas.divergencias,
                ...resultadoRetencao.divergencias,
                ...resultadoLimites.divergencias
            ]

            todas.forEach(div => {
                divergentes.push({
                    companyId: company.id,
                    cnpj: company.cnpj,
                    razaoSocial: company.name,
                    tipo: div.tipo,
                    descricao: div.descricao,
                    valor: div.valor,
                    gravidade: div.gravidade,
                    periodo: div.periodo
                })
            })
        }

        return NextResponse.json(divergentes)
    } catch (error) {
        console.error('Erro relatorio divergentes:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatorio' }, { status: 500 })
    }
}
