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
    const filtroCnpj = (searchParams.get('cnpj') || '').replace(/\D/g, '')
    const filtroCompetencia = searchParams.get('competencia') || undefined
    const format = (searchParams.get('format') || '').toLowerCase()
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')
    const compsFiltradas = filtroCompetencia ? [filtroCompetencia] : comps

    const companies = await prisma.company.findMany({
      select: { id: true, cnpj: true, name: true, regime: true, enquadramentoHistory: true },
    })

    const meiIds = new Set(
      companies
        .filter((c) => {
          const isMei = c.regime?.toLowerCase().includes('mei') || c.enquadramentoHistory.some((e) => e.isMei)
          if (!isMei) return false
          if (filtroCnpj && !(c.cnpj || '').replace(/\D/g, '').includes(filtroCnpj)) return false
          return true
        })
        .map((c) => c.id)
    )

    const [declarations, invoices, guias] = await Promise.all([
      prisma.declaration.findMany({
        where: { companyId: { in: Array.from(meiIds) }, createdAt: { gte: inicio } },
        select: { companyId: true, period: true, revenue: true, taxDue: true },
      }),
      prisma.invoice.findMany({
        where: { companyId: { in: Array.from(meiIds) }, issueDate: { gte: inicio } },
        select: { companyId: true, issueDate: true, value: true },
      }),
      prisma.guia.findMany({
        where: { companyId: { in: Array.from(meiIds) }, pagoEm: { not: null, gte: inicio } },
        select: { companyId: true, pagoEm: true, valorPago: true, valorTotal: true },
      }),
    ])

    const entregasPorComp: Record<string, number> = {}
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      if (filtroCompetencia && comp !== filtroCompetencia) return
      entregasPorComp[comp] = (entregasPorComp[comp] || 0) + 1
    })

    const nfsePorComp: Record<string, number> = {}
    invoices.forEach((n) => {
      const comp = compFromDate(n.issueDate)
      if (filtroCompetencia && comp !== filtroCompetencia) return
      nfsePorComp[comp] = (nfsePorComp[comp] || 0) + n.value
    })
    const pagosPorComp: Record<string, number> = {}
    guias.forEach((g) => {
      if (!g.pagoEm) return
      const comp = compFromDate(g.pagoEm)
      if (filtroCompetencia && comp !== filtroCompetencia) return
      pagosPorComp[comp] = (pagosPorComp[comp] || 0) + (g.valorPago ?? g.valorTotal ?? 0)
    })

    const omissosPorComp: Record<string, number> = {}
    compsFiltradas.forEach((comp) => {
      const entregues = entregasPorComp[comp] || 0
      omissosPorComp[comp] = Math.max(meiIds.size - entregues, 0)
    })

    const serieEntregas: SerieNumero[] = compsFiltradas.map((c) => ({ competencia: c, valor: entregasPorComp[c] || 0 }))
    const serieOmissos: SerieNumero[] = compsFiltradas.map((c) => ({ competencia: c, valor: omissosPorComp[c] || 0 }))
    const serieNFSe: SerieNumero[] = compsFiltradas.map((c) => ({ competencia: c, valor: nfsePorComp[c] || 0 }))
    const seriePagos: SerieNumero[] = compsFiltradas.map((c) => ({ competencia: c, valor: pagosPorComp[c] || 0 }))

    const result = {
      periodo: { meses, inicio },
      resumo: {
        empresasMei: meiIds.size,
      },
      series: {
        entregas: serieEntregas,
        omissos: serieOmissos,
        nfse: serieNFSe,
        pagos: seriePagos,
      },
    }

    if (format === 'csv') {
      const rows: string[] = []
      rows.push('tipo,competencia,valor')
      serieEntregas.forEach((s) => rows.push(['entregas', s.competencia, s.valor].join(',')))
      serieOmissos.forEach((s) => rows.push(['omissos', s.competencia, s.valor].join(',')))
      serieNFSe.forEach((s) => rows.push(['nfse', s.competencia, s.valor].join(',')))
      seriePagos.forEach((s) => rows.push(['pagos', s.competencia, s.valor].join(',')))

      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="mei-sn.csv"'
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro em MEI SN:', error)
    return NextResponse.json({ error: 'Erro em MEI SN' }, { status: 500 })
  }
}
