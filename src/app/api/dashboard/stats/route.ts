import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Período de análise (últimos 12 meses)
        const hoje = new Date()
        const inicio12Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)

        // 1. Arrecadação mensal (últimos 12 meses)
        const declarations = await prisma.declaration.findMany({
            where: {
                createdAt: { gte: inicio12Meses }
            },
            select: {
                period: true,
                revenue: true,
                taxDue: true
            }
        })

        // Agrupar por mês
        const arrecadacaoMensal = declarations.reduce((acc, decl) => {
            const mes = decl.period
            if (!acc[mes]) {
                acc[mes] = { periodo: mes, receita: 0, imposto: 0 }
            }
            acc[mes].receita += decl.revenue
            acc[mes].imposto += decl.taxDue
            return acc
        }, {} as Record<string, { periodo: string; receita: number; imposto: number }>)

        const arrecadacaoArray = Object.values(arrecadacaoMensal)
            .sort((a, b) => a.periodo.localeCompare(b.periodo))
            .slice(-12)

        // 2. Top 10 contribuintes por faturamento
        const companiesWithRevenue = await prisma.company.findMany({
            include: {
                declarations: {
                    where: {
                        createdAt: { gte: inicio12Meses }
                    },
                    select: {
                        revenue: true,
                        taxDue: true
                    }
                }
            }
        })

        const top10Contribuintes = companiesWithRevenue
            .map(company => {
                const totalReceita = company.declarations.reduce((sum, d) => sum + d.revenue, 0)
                const totalImposto = company.declarations.reduce((sum, d) => sum + d.taxDue, 0)
                return {
                    cnpj: company.cnpj,
                    nome: company.name,
                    receita: totalReceita,
                    imposto: totalImposto,
                    regime: company.regime
                }
            })
            .filter(c => c.receita > 0)
            .sort((a, b) => b.receita - a.receita)
            .slice(0, 10)

        // 3. Distribuição por anexo (regime)
        const distribuicaoPorAnexo = companiesWithRevenue.reduce((acc, company) => {
            const totalReceita = company.declarations.reduce((sum, d) => sum + d.revenue, 0)
            if (totalReceita > 0) {
                const regime = company.regime || 'Não informado'
                acc[regime] = (acc[regime] || 0) + 1
            }
            return acc
        }, {} as Record<string, number>)

        const distribuicaoArray = Object.entries(distribuicaoPorAnexo).map(([regime, quantidade]) => ({
            regime,
            quantidade
        }))

        // 4. Taxa de omissão (empresas ativas sem declaração nos últimos 3 meses)
        const inicio3Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)
        const empresasAtivas = await prisma.company.count({
            where: { status: 'Ativo' }
        })

        const empresasComDeclaracao = await prisma.company.count({
            where: {
                status: 'Ativo',
                declarations: {
                    some: {
                        createdAt: { gte: inicio3Meses }
                    }
                }
            }
        })

        const omissos = empresasAtivas - empresasComDeclaracao
        const taxaOmissao = empresasAtivas > 0 ? (omissos / empresasAtivas) * 100 : 0

        // 5. Inadimplentes (com divergências pendentes)
        const inadimplentes = await prisma.company.count({
            where: {
                status: 'Ativo',
                divergences: {
                    some: {
                        status: 'Pendente'
                    }
                }
            }
        })
        const taxaInadimplencia = empresasAtivas > 0 ? (inadimplentes / empresasAtivas) * 100 : 0

        // 6. Evolução de omissão (últimos 6 meses)
        const evolucaoOmissao = []
        for (let i = 5; i >= 0; i--) {
            const mesAnalise = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
            const mesAnterior = new Date(mesAnalise.getFullYear(), mesAnalise.getMonth() - 1, 1)
            const mesProximo = new Date(mesAnalise.getFullYear(), mesAnalise.getMonth() + 1, 1)

            const empresasComDeclMes = await prisma.company.count({
                where: {
                    status: 'Ativo',
                    declarations: {
                        some: {
                            createdAt: {
                                gte: mesAnterior,
                                lt: mesProximo
                            }
                        }
                    }
                }
            })

            const omissosMes = empresasAtivas - empresasComDeclMes
            const taxaMes = empresasAtivas > 0 ? (omissosMes / empresasAtivas) * 100 : 0

            evolucaoOmissao.push({
                mes: mesAnalise.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                taxa: parseFloat(taxaMes.toFixed(2)),
                omissos: omissosMes
            })
        }

        // 7. Resumo geral
        const totalArrecadado = arrecadacaoArray.reduce((sum, m) => sum + m.imposto, 0)
        const totalReceita = arrecadacaoArray.reduce((sum, m) => sum + m.receita, 0)

        const divergenciasPendentes = await prisma.divergence.count({
            where: { status: 'Pendente' }
        })

        const valorDivergencias = await prisma.divergence.aggregate({
            where: { status: 'Pendente' },
            _sum: { value: true }
        })

        return NextResponse.json({
            resumo: {
                empresasAtivas,
                totalArrecadado,
                totalReceita,
                omissos,
                taxaOmissao: parseFloat(taxaOmissao.toFixed(2)),
                inadimplentes,
                taxaInadimplencia: parseFloat(taxaInadimplencia.toFixed(2)),
                divergenciasPendentes,
                valorDivergencias: valorDivergencias._sum.value || 0
            },
            arrecadacaoMensal: arrecadacaoArray,
            top10Contribuintes,
            distribuicaoPorAnexo: distribuicaoArray,
            evolucaoOmissao
        })
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
        return NextResponse.json(
            { error: 'Erro ao buscar estatísticas do dashboard' },
            { status: 500 }
        )
    }
}
