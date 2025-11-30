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
  if (period.includes('/')) {
    const [month, year] = period.split('/')
    if (month && year) return `${year}-${month.padStart(2, '0')}`
  }
  return null
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
    const inicioDate = new Date(comps[0] + '-01')

    const [companies, declarations, invoices, guias, parc, repasses] = await Promise.all([
      prisma.company.findMany({
        include: { enquadramentoHistory: true },
      }),
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicioDate } },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: inicioDate } },
      }),
      prisma.guia.findMany({
        where: { dataEmissao: { gte: inicioDate } },
        include: { tributos: true },
      }),
      prisma.parcela.findMany({
        where: { vencimento: { gte: inicioDate } },
        include: { parcelamento: true },
      }),
      prisma.repasse.findMany({
        where: { date: { gte: inicioDate } },
      }),
    ])

    const totalEmpresas = companies.length
    const meiIds = new Set(
      companies
        .filter(
          (c) =>
            c.regime?.toLowerCase().includes('mei') ||
            c.enquadramentoHistory.some((e) => e.isMei)
        )
        .map((c) => c.id)
    )

    const entregasPorComp = somarPorCompetencia(
      declarations,
      (d) => compFromPeriod(d.period),
      () => 1
    )
    const arrecadacaoPrev = somarPorCompetencia(
      declarations,
      (d) => compFromPeriod(d.period),
      (d) => d.taxDue
    )
    const arrecadacaoReceita = somarPorCompetencia(
      declarations,
      (d) => compFromPeriod(d.period),
      (d) => d.revenue
    )
    const entregasMeiPorComp = somarPorCompetencia(
      declarations.filter((d) => meiIds.has(d.companyId)),
      (d) => compFromPeriod(d.period),
      () => 1
    )
    const nfsePorComp = somarPorCompetencia(
      invoices,
      (n) => compFromDate(n.issueDate),
      (n) => n.value
    )
    const guiasPagasPorComp = somarPorCompetencia(
      guias,
      (g) => {
        const d = g.pagoEm || g.dataEmissao
        if (!d) return null
        return compFromDate(d)
      },
      (g) => g.valorPago ?? g.valorTotal
    )
    const issGuiasPorComp = somarPorCompetencia(
      guias,
      (g) => compFromDate(g.dataEmissao),
      (g) =>
        g.tributos
          .filter((t) => t.tipo?.toUpperCase() === 'ISS')
          .reduce((s, t) => s + t.valorPrincipal + t.valorJuros + t.valorMulta, 0)
    )
    const repassesPorComp = somarPorCompetencia(
      repasses,
      (r) => compFromDate(r.date),
      (r) => r.amount
    )

    const omissosPorComp: Record<string, number> = {}
    const omissosMeiPorComp: Record<string, number> = {}
    comps.forEach((c) => {
      const entregues = entregasPorComp[c] || 0
      const entreguesMei = entregasMeiPorComp[c] || 0
      omissosPorComp[c] = Math.max(totalEmpresas - entregues, 0)
      omissosMeiPorComp[c] = Math.max(meiIds.size - entreguesMei, 0)
    })

    const pagamentosEfetivosPorComp: Record<string, number> = {}
    const inadimplenciaValorPorComp: Record<string, number> = {}
    comps.forEach((c) => {
      const pago = (guiasPagasPorComp[c] || 0) + (repassesPorComp[c] || 0)
      const previsto = arrecadacaoPrev[c] || 0
      pagamentosEfetivosPorComp[c] = pago
      inadimplenciaValorPorComp[c] = Math.max(previsto - pago, 0)
    })

    const parcelamentosAtivos = parc.filter((p) => p.parcelamento.situacao?.toLowerCase() === 'ativo')
    const parcelasAtraso = parc.filter(
      (p) => p.vencimento < new Date() && p.situacao.toLowerCase() !== 'paga'
    )
    const valorAtraso = parcelasAtraso.reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)
    const valorAReceber = parc
      .filter((p) => p.situacao.toLowerCase() !== 'paga')
      .reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)

    const atrasosPorComp: Record<string, number> = {}
    const valorAtrasoPorComp: Record<string, number> = {}
    const valorAbertoPorComp: Record<string, number> = {}
    parc.forEach((p) => {
      const comp = compFromDate(p.vencimento)
      const isPaga = p.situacao.toLowerCase() === 'paga'
      const isAtraso = p.vencimento < new Date() && !isPaga
      const restante = p.valor - (p.valorPago || 0)

      if (isAtraso) {
        atrasosPorComp[comp] = (atrasosPorComp[comp] || 0) + 1
        valorAtrasoPorComp[comp] = (valorAtrasoPorComp[comp] || 0) + restante
      }
      if (!isPaga) {
        valorAbertoPorComp[comp] = (valorAbertoPorComp[comp] || 0) + restante
      }
    })

    const serieSN = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: arrecadacaoPrev[c] || 0,
    }))
    const serieReceita = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: arrecadacaoReceita[c] || 0,
    }))
    const serieNFSe = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: nfsePorComp[c] || 0,
    }))
    const serieISS = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: issGuiasPorComp[c] || 0,
    }))
    const serieRepasses = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: repassesPorComp[c] || 0,
    }))
    const serieEntregas = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: entregasPorComp[c] || 0,
    }))
    const serieOmissos = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: omissosPorComp[c] || 0,
    }))
    const serieOmissosMei = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: omissosMeiPorComp[c] || 0,
    }))
    const serieInadimplencia = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: inadimplenciaValorPorComp[c] || 0,
    }))
    const serieParcelasAtraso = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: atrasosPorComp[c] || 0,
    }))
    const serieValorAtraso = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: valorAtrasoPorComp[c] || 0,
    }))
    const serieValorAberto = comps.map<SerieValor>((c) => ({
      competencia: c,
      valor: valorAbertoPorComp[c] || 0,
    }))

    const receitaUlt12 = comps.slice(-12).reduce((s, c) => s + (arrecadacaoReceita[c] || 0), 0)
    const taxUlt12 = comps.slice(-12).reduce((s, c) => s + (arrecadacaoPrev[c] || 0), 0)
    const nfseUlt12 = comps.slice(-12).reduce((s, c) => s + (nfsePorComp[c] || 0), 0)
    const issUlt12 = comps.slice(-12).reduce((s, c) => s + (issGuiasPorComp[c] || 0), 0)
    const repasseUlt12 = comps.slice(-12).reduce((s, c) => s + (repassesPorComp[c] || 0), 0)

    const receitaPeriodo = comps.reduce((s, c) => s + (arrecadacaoReceita[c] || 0), 0)
    const taxPeriodo = comps.reduce((s, c) => s + (arrecadacaoPrev[c] || 0), 0)
    const nfsePeriodo = comps.reduce((s, c) => s + (nfsePorComp[c] || 0), 0)
    const issPeriodo = comps.reduce((s, c) => s + (issGuiasPorComp[c] || 0), 0)
    const repassesPeriodo = comps.reduce((s, c) => s + (repassesPorComp[c] || 0), 0)
    const pagamentosPeriodo = comps.reduce((s, c) => s + (pagamentosEfetivosPorComp[c] || 0), 0)
    const divergenciaBasePeriodo = nfsePeriodo - receitaPeriodo
    const inadimplenciaPeriodo = Math.max(taxPeriodo - pagamentosPeriodo, 0)
    const ultimaComp = comps[comps.length - 1]

    const alertas: string[] = []
    // Sublimite/limite usando receita dos ultimos 12 meses por empresa (simplificado com revenue total)
    if (receitaUlt12 > 4800000) alertas.push('Limite geral superior a 4.8M (verificar desenquadramento).')
    else if (receitaUlt12 > 3600000) alertas.push('Sublimite geral superior a 3.6M (verificar ISS fora do SN).')
    if (divergenciaBasePeriodo > nfsePeriodo * 0.05) {
      alertas.push('Divergencia de base PGDAS x NFSe acima de 5% no periodo analisado.')
    }
    if (inadimplenciaPeriodo > 0) {
      alertas.push('Pagamentos identificados (guias + DAF607) abaixo do devido. Verificar inadimplencia.')
    }

    return NextResponse.json({
      periodo: { meses, inicio: `${comps[0]}-01` },
      totais: {
        empresas: totalEmpresas,
        mei: meiIds.size,
        receitaPrevista12m: taxUlt12,
        receitaDeclarada12m: receitaUlt12,
        nfse12m: nfseUlt12,
        iss12m: issUlt12,
        repasses12m: repasseUlt12,
        parcelamentosAtivos: new Set(parcelamentosAtivos.map((p) => p.parcelamentoId)).size,
        parcelasEmAtraso: parcelasAtraso.length,
        valorAtraso,
        valorAReceber,
        receitaPrevistaPeriodo: taxPeriodo,
        receitaDeclaradaPeriodo: receitaPeriodo,
        nfsePeriodo,
        issPeriodo,
        repassesPeriodo,
        pagamentosEfetivosPeriodo: pagamentosPeriodo,
        divergenciaBasePeriodo,
        inadimplenciaPeriodo,
        omissosAtuais: omissosPorComp[ultimaComp] || 0,
        meiOmissosAtuais: omissosMeiPorComp[ultimaComp] || 0,
        parcelamentosValorAbertoAtual: valorAbertoPorComp[ultimaComp] || 0,
        parcelamentosValorAtrasoAtual: valorAtrasoPorComp[ultimaComp] || 0,
      },
      series: {
        arrecadacaoPrevista: serieSN,
        receitaDeclarada: serieReceita,
        nfse: serieNFSe,
        iss: serieISS,
        repasses: serieRepasses,
        entregas: serieEntregas,
        omissos: serieOmissos,
        omissosMei: serieOmissosMei,
        inadimplencia: serieInadimplencia,
        parcelamentosAtraso: serieParcelasAtraso,
        parcelamentosValorAtraso: serieValorAtraso,
        parcelamentosValorAberto: serieValorAberto,
      },
      alertas,
    })
  } catch (error) {
    console.error('Erro ao gerar dashboard SN:', error)
    return NextResponse.json({ error: 'Erro ao gerar dashboard SN' }, { status: 500 })
  }
}
