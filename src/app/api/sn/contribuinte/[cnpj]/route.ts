import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type SerieNumero = { competencia: string; valor: number }

function sanitizeCnpj(raw: string) {
  return (raw || '').replace(/\D/g, '')
}

function maskCnpj(digits: string) {
  if (digits.length !== 14) return digits
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { cnpj: raw } = await params
    const digits = sanitizeCnpj(raw)
    if (digits.length !== 14) {
      return NextResponse.json({ error: 'CNPJ invalido' }, { status: 400 })
    }
    const masked = maskCnpj(digits)

    const empresa = await prisma.company.findFirst({
      where: {
        OR: [{ cnpj: digits }, { cnpj: masked }],
      },
      include: { enquadramentoHistory: { orderBy: { startDate: 'asc' } } },
    })

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
    }

    const comps = competenciasUltimosMeses(60)
    const inicio = new Date(comps[0] + '-01')

    const [declarations, invoices, guias, parcelamentos, defis] = await Promise.all([
      prisma.declaration.findMany({
        where: { companyId: empresa.id, createdAt: { gte: inicio } },
      }),
      prisma.invoice.findMany({
        where: { companyId: empresa.id, issueDate: { gte: inicio } },
      }),
      prisma.guia.findMany({
        where: { companyId: empresa.id, dataEmissao: { gte: inicio } },
        include: { tributos: true },
      }),
      prisma.parcelamento.findMany({
        where: { companyId: empresa.id },
        include: { parcelas: true },
      }),
      prisma.defis.findMany({
        where: { companyId: empresa.id },
        orderBy: { exercicio: 'desc' },
        include: { socios: true },
      }),
    ])

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
    const receitaDeclarada = somarPorCompetencia(
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

    const guiasPorComp = somarPorCompetencia(
      guias,
      (g) => {
        const d = g.dataEmissao
        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return comp
      },
      (g) => g.valorTotal
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
      (g) =>
        g.tributos
          .filter((t) => t.tipo?.toUpperCase() === 'ISS')
          .reduce((s, t) => s + t.valorPrincipal + t.valorJuros + t.valorMulta, 0)
    )

    const serieArrecadacao = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: arrecadacaoPrev[c] || 0,
    }))
    const serieReceita = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: receitaDeclarada[c] || 0,
    }))
    const serieNFSe = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: nfsePorComp[c] || 0,
    }))
    const serieGuias = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: guiasPorComp[c] || 0,
    }))
    const serieGuiasPagas = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: guiasPagasPorComp[c] || 0,
    }))
    const serieISS = comps.map<SerieNumero>((c) => ({
      competencia: c,
      valor: issGuiasPorComp[c] || 0,
    }))

    const receita12m = comps.slice(-12).reduce((s, c) => s + (receitaDeclarada[c] || 0), 0)
    const alertas: string[] = []
    if (receita12m > 4800000) alertas.push('Faturamento > 4.8M nos ultimos 12 meses (limite SN excedido).')
    else if (receita12m > 3600000) alertas.push('Faturamento > 3.6M nos ultimos 12 meses (sublimite SN excedido para ISS).')

    const parcelas = parcelamentos.flatMap((p) => p.parcelas)
    const parcelasAtraso = parcelas.filter(
      (p) => p.vencimento < new Date() && p.situacao.toLowerCase() !== 'paga'
    )
    const valorParcelasAtraso = parcelasAtraso.reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)
    const valorParcelasAberto = parcelas
      .filter((p) => p.situacao.toLowerCase() !== 'paga')
      .reduce((s, p) => s + (p.valor - (p.valorPago || 0)), 0)

    return NextResponse.json({
      company: {
        id: empresa.id,
        name: empresa.name,
        cnpj: empresa.cnpj,
        regime: empresa.regime,
        isMei: empresa.enquadramentoHistory.some((e) => e.isMei),
        enquadramento: empresa.enquadramentoHistory,
      },
      alertas,
      series: {
        arrecadacaoPrevista: serieArrecadacao,
        receitaDeclarada: serieReceita,
        nfse: serieNFSe,
        guiasEmitidas: serieGuias,
        guiasPagas: serieGuiasPagas,
        iss: serieISS,
      },
      guias,
      parcelamentos,
      defis,
      resumo: {
        receita12m: receita12m,
        parcelasEmAtraso: parcelasAtraso.length,
        valorParcelasAtraso,
        valorParcelasAberto,
      },
    })
  } catch (error) {
    console.error('Erro ao detalhar contribuinte SN:', error)
    return NextResponse.json({ error: 'Erro ao detalhar contribuinte SN' }, { status: 500 })
  }
}
