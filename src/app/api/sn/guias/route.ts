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
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')
    const compsFiltradas = filtroCompetencia ? [filtroCompetencia] : comps

    const guias = await prisma.guia.findMany({
      where: {
        dataEmissao: { gte: inicio },
        ...(filtroCnpj
          ? {
              company: {
                cnpj: { contains: filtroCnpj },
              },
            }
          : {}),
      },
      include: { tributos: true, company: true },
    })

    const emitidasPorComp: Record<string, number> = {}
    const pagasPorComp: Record<string, number> = {}
    const issPorComp: Record<string, number> = {}

    guias.forEach((g) => {
      const comp = compFromDate(g.dataEmissao)
      if (filtroCompetencia && comp !== filtroCompetencia) return
      emitidasPorComp[comp] = (emitidasPorComp[comp] || 0) + g.valorTotal
      const issValor = g.tributos
        .filter((t) => t.tipo?.toUpperCase() === 'ISS')
        .reduce((s, t) => s + t.valorPrincipal + t.valorJuros + t.valorMulta, 0)
      issPorComp[comp] = (issPorComp[comp] || 0) + issValor

      if (g.pagoEm) {
        const compPag = compFromDate(g.pagoEm)
        if (filtroCompetencia && compPag !== filtroCompetencia) return
        pagasPorComp[compPag] = (pagasPorComp[compPag] || 0) + (g.valorPago ?? g.valorTotal)
      }
    })

    const serieEmitidas: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: emitidasPorComp[c] || 0,
    }))
    const seriePagas: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: pagasPorComp[c] || 0,
    }))
    const serieISS: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: issPorComp[c] || 0,
    }))

    if ((searchParams.get('format') || '').toLowerCase() === 'csv') {
      const rows: string[] = []
      rows.push('tipo,competencia,valor')
      serieEmitidas.forEach((s) => rows.push(['emitidas', s.competencia, s.valor].join(',')))
      seriePagas.forEach((s) => rows.push(['pagas', s.competencia, s.valor].join(',')))
      serieISS.forEach((s) => rows.push(['iss', s.competencia, s.valor].join(',')))
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="guias-sn.csv"'
        }
      })
    }

    return NextResponse.json({
      periodo: { meses, inicio },
      series: {
        emitidas: serieEmitidas,
        pagas: seriePagas,
        iss: serieISS,
      },
    })
  } catch (error) {
    console.error('Erro em guias SN:', error)
    return NextResponse.json({ error: 'Erro em guias SN' }, { status: 500 })
  }
}
