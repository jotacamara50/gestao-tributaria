import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type SerieNumero = { competencia: string; valor: number }

function competenciasUltimosMeses(qtd: number) {
  const hoje = new Date()
  const lista: string[] = []
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    lista.push(comp)
  }
  return lista
}

function compFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function compFromPeriod(period?: string | null) {
  if (!period) return null
  if (period.includes('-')) {
    const [y, m] = period.split('-')
    if (y && m) return `${y}-${m.padStart(2, '0')}`
  }
  if (period.length === 6) return `${period.slice(0, 4)}-${period.slice(4)}`
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const anos = Number(searchParams.get('anos') || '5')
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')

    const companies = await prisma.company.findMany({
      select: { id: true, cnpj: true, name: true, regime: true, enquadramentoHistory: true },
    })

    const meiIds = new Set(
      companies
        .filter((c) => c.regime?.toLowerCase().includes('mei') || c.enquadramentoHistory.some((e) => e.isMei))
        .map((c) => c.id)
    )

    const [declarations, invoices] = await Promise.all([
      prisma.declaration.findMany({
        where: { companyId: { in: Array.from(meiIds) }, createdAt: { gte: inicio } },
        select: { companyId: true, period: true, revenue: true, taxDue: true },
      }),
      prisma.invoice.findMany({
        where: { companyId: { in: Array.from(meiIds) }, issueDate: { gte: inicio } },
        select: { companyId: true, issueDate: true, value: true },
      }),
    ])

    const entregasPorComp: Record<string, number> = {}
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      entregasPorComp[comp] = (entregasPorComp[comp] || 0) + 1
    })

    const nfsePorComp: Record<string, number> = {}
    invoices.forEach((n) => {
      const comp = compFromDate(n.issueDate)
      nfsePorComp[comp] = (nfsePorComp[comp] || 0) + n.value
    })

    const omissosPorComp: Record<string, number> = {}
    comps.forEach((comp) => {
      const entregues = entregasPorComp[comp] || 0
      omissosPorComp[comp] = Math.max(meiIds.size - entregues, 0)
    })

    const serieEntregas: SerieNumero[] = comps.map((c) => ({ competencia: c, valor: entregasPorComp[c] || 0 }))
    const serieOmissos: SerieNumero[] = comps.map((c) => ({ competencia: c, valor: omissosPorComp[c] || 0 }))
    const serieNFSe: SerieNumero[] = comps.map((c) => ({ competencia: c, valor: nfsePorComp[c] || 0 }))

    return NextResponse.json({
      periodo: { meses, inicio },
      resumo: {
        empresasMei: meiIds.size,
      },
      series: {
        entregas: serieEntregas,
        omissos: serieOmissos,
        nfse: serieNFSe,
      },
    })
  } catch (error) {
    console.error('Erro em MEI SN:', error)
    return NextResponse.json({ error: 'Erro em MEI SN' }, { status: 500 })
  }
}
