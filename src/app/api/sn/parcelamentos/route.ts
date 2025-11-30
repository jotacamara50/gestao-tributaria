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
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')

    const parcelas = await prisma.parcela.findMany({
      where: { vencimento: { gte: inicio } },
      include: { parcelamento: { select: { companyId: true, situacao: true } } },
    })

    // agregações
    const empresasComParcelamento = new Set<string>()
    const empresasComParcelamentoAtraso = new Set<string>()
    const atrasosPorComp: Record<string, number> = {}
    const valorAtrasoPorComp: Record<string, number> = {}
    const valorAReceberPorComp: Record<string, number> = {}

    parcelsLoop: for (const p of parcelas) {
      const comp = compFromDate(p.vencimento)
      const empresa = p.parcelamento.companyId
      empresasComParcelamento.add(empresa)
      const isPaga = p.situacao.toLowerCase() === 'paga'
      const isAtraso = p.vencimento < new Date() && !isPaga
      const restante = p.valor - (p.valorPago || 0)

      if (isAtraso) {
        empresasComParcelamentoAtraso.add(empresa)
        atrasosPorComp[comp] = (atrasosPorComp[comp] || 0) + 1
        valorAtrasoPorComp[comp] = (valorAtrasoPorComp[comp] || 0) + restante
      }
      if (!isPaga) {
        valorAReceberPorComp[comp] = (valorAReceberPorComp[comp] || 0) + restante
      }
    }

    const serieAtrasos: SerieNumero[] = comps.map((c) => ({
      competencia: c,
      valor: atrasosPorComp[c] || 0,
    }))
    const serieValorAtraso: SerieNumero[] = comps.map((c) => ({
      competencia: c,
      valor: valorAtrasoPorComp[c] || 0,
    }))
    const serieValorAberto: SerieNumero[] = comps.map((c) => ({
      competencia: c,
      valor: valorAReceberPorComp[c] || 0,
    }))

    return NextResponse.json({
      periodo: { meses, inicio },
      resumo: {
        empresasParcelamento: empresasComParcelamento.size,
        empresasParcelamentoAtraso: empresasComParcelamentoAtraso.size,
      },
      series: {
        parcelasAtrasadas: serieAtrasos,
        valorAtraso: serieValorAtraso,
        valorAberto: serieValorAberto,
      },
    })
  } catch (error) {
    console.error('Erro em parcelamentos SN:', error)
    return NextResponse.json({ error: 'Erro em parcelamentos SN' }, { status: 500 })
  }
}
