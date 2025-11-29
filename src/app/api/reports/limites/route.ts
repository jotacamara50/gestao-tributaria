/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verificarSublimites } from '@/lib/engine/crossing'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const ano = parseInt(searchParams.get('ano') || `${new Date().getFullYear()}`, 10)

    try {
        const companies = await prisma.company.findMany({
            where: { status: 'Ativo' }
        })

        const resultados: any[] = []
        for (const company of companies) {
            const r = await verificarSublimites(company.id, ano)
            r.divergencias.forEach(div => {
                resultados.push({
                    companyId: company.id,
                    cnpj: company.cnpj,
                    razaoSocial: company.name,
                    tipo: div.descricao.includes('estadual') ? 'Sublimite Estadual 3,6M' : 'Sublimite Municipal 4,8M',
                    excesso: div.valor,
                    ano
                })
            })
        }

        return NextResponse.json(resultados)
    } catch (error) {
        console.error('Erro relatorio limites:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
    }
}
