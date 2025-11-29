import { NextRequest, NextResponse } from 'next/server'
import { detectarInadimplentes } from '@/lib/engine/crossing'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || searchParams.get('periodo')
    const min = parseFloat(searchParams.get('min') || '0')

    if (!period) {
        return NextResponse.json({ error: 'period is required (MM/YYYY)' }, { status: 400 })
    }

    try {
        const dados = await detectarInadimplentes(period)
        const filtrados = dados
            .filter(d => d.valorTotalDivergente >= min)
            .map(d => ({
                companyId: d.companyId,
                cnpj: d.cnpj,
                razaoSocial: d.razaoSocial,
                valor: d.valorTotalDivergente,
                periodo: period
            }))
        return NextResponse.json(filtrados)
    } catch (error) {
        console.error('Erro relatorio inadimplentes:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
    }
}
