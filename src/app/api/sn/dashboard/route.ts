import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type SerieValor = { competencia: string; valor: number }

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

function somarPorCompetencia<T>(
  dados: T[],
  getComp: (item: T) => string | null,
  getValor: (item: T) => number
): Record<string, number> {
  return dados.reduce<Record<string, number>>((acc, item) => {
    const comp = getComp(item)
    if (!comp) return acc
    acc[comp] = (acc[comp] || 0) + getValor(item)
    return acc
  }, {})
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
    const inicio = comps[0] + '-01'

    const [companies, declarations, invoices, guias, parc] = await Promise.all([
      prisma.company.findMany({}),
      prisma.declaration.findMany({
        where: { createdAt: { gte: new Date(inicio) } },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: new Date(inicio) } },
      }),
      prisma.guia.findMany({
        where: { dataEmissao: { gte: new Date(inicio) } },
        include: { tributos: true },
      }),
      prisma.parcela.findMany({
        where: { vencimento: { gte: new Date(inicio) } },
        include: { parcelamento: true },
      }),
    ])

    const totalEmpresas = companies.length
    const empresasMei = companies.filter((c) => c.regime?.toLowerCase().includes('mei')).length

    const entregasPorComp = somarPorCompetencia(
      declarations,
      (d) => d.period ?? null,
      () => 1
    )
    const arrecadacaoPrev = somarPorCompetencia(
      declarations,
      (d) => d.period ?? null,
      (d) => d.taxDue
    )
    const arrecadacaoReceita = somarPorCompetencia(
      declarations,
      (d) => d.period ?? null,
      (d) => d.revenue
    )
    const nfsePorComp = somarPorCompetencia(
      invoices,
      (n) => {
        const d = n.issueDate
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return comp
      },
      (n) => n.value
    )
    const guiasPagasPorComp = somarPorCompetencia(
      guias,
      (g) => {
        const d = g.pagoEm || g.dataEmissao
        if (!d) return null
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return comp
      },
      (g) => g.valorPago ?? g.valorTotal
    )
    const issGuiasPorComp = somarPorCompetencia(
      guias,
      (g) => {
        const d = g.dataEmissao
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return comp
      },
      (g) => g.tributos.filter((t) => t.tipo?.toUpperCase() === 'ISS').reduce((s, t) => s + t.valorPrincipal + t.valorJuros + t.valorMulta, 0)
    )

    const omissosPorComp: Record<string, number> = {}
    comps.forEach((c) => {
      const entregues = entregasPorComp[c] || 0
      omissosPorComp[c] = Math.max(totalEmpresas - entregues, 0)
    })

    const inadimplentesPorComp: Record<string, number> = {}
    comps.forEach((c) => {
      const pago = guiasPagasPorComp[c] || 0
      const previsto = arrecadacaoPrev[c] || 0
      inadimplentesPorComp[c] = previsto > pago ? totalEmpresas : 0
    })

    const parcelamentosAtivos = parc.filter((p) => p.parcelamento.situacao?.toLowerCase() === 'ativo')
    const parcelasAtraso = parc.filter(
      (p) => p.vencimento < new Date() && p.situacao.toLowerCase() !== 'paga'
    )
    const valorAtraso = parcelasAtraso.reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)
    const valorAReceber = parc
      .filter((p) => p.situacao.toLowerCase() !== 'paga')
      .reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)

    const serieSN = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: arrecadacaoPrev[c] || 0,
    }))
    const serieNFSe = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: nfsePorComp[c] || 0,
    }))
    const serieISS = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: issGuiasPorComp[c] || 0,
    }))
    const serieEntregas = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: entregasPorComp[c] || 0,
    }))
    const serieOmissos = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: omissosPorComp[c] || 0,
    }))
    const serieInadimplencia = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: inadimplentesPorComp[c] || 0,
    }))

    const receitaUlt12 = comps.slice(-12).reduce((s, c) => s + (arrecadacaoReceita[c] || 0), 0)
    const taxUlt12 = comps.slice(-12).reduce((s, c) => s + (arrecadacaoPrev[c] || 0), 0)
    const nfseUlt12 = comps.slice(-12).reduce((s, c) => s + (nfsePorComp[c] || 0), 0)

    const alertas: string[] = []
    // sublimite/limite usando receita dos últimos 12 meses por empresa (simplificado com revenue total)
    // sem dados individuais de faturamento anual, apenas sinalização geral se receita total > 3.6m ou 4.8m
    if (receitaUlt12 > 4800000) alertas.push('Limite geral superior a 4.8M (verificar desenquadramento).')
    else if (receitaUlt12 > 3600000) alertas.push('Sublimite geral superior a 3.6M (verificar ISS fora do SN).')

    return NextResponse.json({
      periodo: { meses, inicio },
      totais: {
        empresas: totalEmpresas,
        mei: empresasMei,
        receitaPrevista12m: taxUlt12,
        receitaDeclarada12m: receitaUlt12,
        nfse12m: nfseUlt12,
        parcelamentosAtivos: new Set(parcelamentosAtivos.map((p) => p.parcelamentoId)).size,
        parcelasEmAtraso: parcelasAtraso.length,
        valorAtraso,
        valorAReceber,
      },
      series: {
        arrecadacaoPrevista: serieSN,
        nfse: serieNFSe,
        iss: serieISS,
        entregas: serieEntregas,
        omissos: serieOmissos,
        inadimplencia: serieInadimplencia,
      },
      alertas,
    })
  } catch (error) {
    console.error('Erro ao gerar dashboard SN:', error)
    return NextResponse.json({ error: 'Erro ao gerar dashboard SN' }, { status: 500 })
  }
}
