import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarRetencoes } from '@/lib/engine/crossing'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || searchParams.get('periodo')

    if (!period) {
        return NextResponse.json({ error: 'period is required (MM/YYYY)' }, { status: 400 })
    }

    try {
        const companies = await prisma.company.findMany({
            where: { status: 'Ativo' }
        })

        const resultados: any[] = []
        for (const company of companies) {
            const r = await validarRetencoes(company.id, period)
            r.divergencias
                .filter(div => div.tipo === 'ALIQUOTA_DIVERGENTE' || div.tipo === 'RETENCAO_INVALIDA')
                .forEach(div => {
                    resultados.push({
                        companyId: company.id,
                        cnpj: company.cnpj,
                        razaoSocial: company.name,
                        descricao: div.descricao,
                        valor: div.valor,
                        periodo: period
                    })
                })
        }

        return NextResponse.json(resultados)
    } catch (error) {
        console.error('Erro relatorio retencoes:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
    }
}
