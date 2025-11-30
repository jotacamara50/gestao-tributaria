import { NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'short' })
}

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    const inicio6Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)

    const [
      declaracoes6Meses,
      nfse6Meses,
      divergencias6Meses,
      repassesMes,
      divergenciasResumo,
      empresasDiv,
      riscoPorEmpresa,
    ] = await Promise.all([
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicio6Meses } },
        select: { createdAt: true, revenue: true },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: inicio6Meses } },
        select: { issueDate: true, value: true },
      }),
      prisma.divergence.findMany({
        where: { detectedAt: { gte: inicio6Meses }, status: 'Pendente' },
        select: { detectedAt: true, value: true },
      }),
      prisma.repasse.aggregate({
        where: { date: { gte: inicioMes, lt: proximoMes } },
        _sum: { amount: true },
      }),
      prisma.divergence.aggregate({
        where: { status: 'Pendente' },
        _sum: { value: true },
      }),
      prisma.divergence.groupBy({
        by: ['companyId'],
        where: { status: 'Pendente' },
      }),
      prisma.company.groupBy({
        by: ['riskLevel'],
        _count: { _all: true },
      }),
    ])

    const comparativoBase: Record<string, { periodo: string; pgdas: number; nfse: number }> = {}
    const divergenciaBase: Record<string, { periodo: string; valor: number }> = {}

    for (let i = 5; i >= 0; i--) {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const chave = monthKey(referencia)
      const periodo = monthLabel(referencia)

      comparativoBase[chave] = { periodo, pgdas: 0, nfse: 0 }
      divergenciaBase[chave] = { periodo, valor: 0 }
    }

    declaracoes6Meses.forEach((item) => {
      const chave = monthKey(item.createdAt)
      if (comparativoBase[chave]) {
        comparativoBase[chave].pgdas += item.revenue
      }
    })

    nfse6Meses.forEach((item) => {
      const chave = monthKey(item.issueDate)
      if (comparativoBase[chave]) {
        comparativoBase[chave].nfse += item.value
      }
    })

    divergencias6Meses.forEach((item) => {
      const chave = monthKey(item.detectedAt)
      if (divergenciaBase[chave]) {
        divergenciaBase[chave].valor += item.value
      }
    })

    const comparativoPgdasNfse = Object.entries(comparativoBase)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        ...value,
        pgdas: Number(value.pgdas.toFixed(2)),
        nfse: Number(value.nfse.toFixed(2)),
      }))

    const divergenciasPorMes = Object.entries(divergenciaBase)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        ...value,
        valor: Number(value.valor.toFixed(2)),
      }))

    const chaveMesAtual = monthKey(hoje)
    const totalPgdasMes = comparativoBase[chaveMesAtual]?.pgdas || 0
    const totalNfseMes = comparativoBase[chaveMesAtual]?.nfse || 0

    const risco = { critico: 0, alto: 0, medio: 0, baixo: 0 }
    riscoPorEmpresa.forEach((item) => {
      const nivel = item.riskLevel?.toLowerCase() || ''
      if (nivel === 'critico') risco.critico = item._count._all
      if (nivel === 'alto') risco.alto = item._count._all
      if (nivel === 'medio') risco.medio = item._count._all
      if (nivel === 'baixo') risco.baixo = item._count._all
    })

    return NextResponse.json({
      resumo: {
        totalPgdasMes,
        totalNfseMes,
        totalRepassesMes: repassesMes._sum.amount || 0,
        divergenciaTotal: divergenciasResumo._sum.value || 0,
        empresasDivergentes: empresasDiv.length,
        risco,
      },
      comparativoPgdasNfse,
      divergenciasPorMes,
    })
  } catch (error) {
    console.error('Erro ao buscar estatisticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatisticas do dashboard' },
      { status: 500 }
    )
  }
}
