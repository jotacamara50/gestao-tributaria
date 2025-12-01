import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type SerieNumero = { competencia: string; valor: number }
type EmpresaAtraso = { companyId: string; cnpj: string; name: string; parcelas: number; valor: number }

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
    const format = (searchParams.get('format') || '').toLowerCase()
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')
    const compsFiltradas = filtroCompetencia ? [filtroCompetencia] : comps

    const [parcelas, companies] = await Promise.all([
      prisma.parcela.findMany({
        where: { vencimento: { gte: inicio } },
        include: { parcelamento: { select: { companyId: true, situacao: true } } },
      }),
      prisma.company.findMany({ select: { id: true, cnpj: true, name: true } }),
    ])

    const empresasFiltro = new Set(
      companies
        .filter((c) => !filtroCnpj || (c.cnpj || '').replace(/\D/g, '').includes(filtroCnpj))
        .map((c) => c.id)
    )
    const parcelasFiltradas = parcelas.filter((p) => empresasFiltro.has(p.parcelamento.companyId))

    // agregações
    const empresasComParcelamento = new Set<string>()
    const empresasComParcelamentoAtraso = new Set<string>()
    const atrasosPorComp: Record<string, number> = {}
    const valorAtrasoPorComp: Record<string, number> = {}
    const valorAReceberPorComp: Record<string, number> = {}
    const atrasoPorEmpresa: Record<string, { parcelas: number; valor: number }> = {}
    const parcelasPagasPorComp: Record<string, number> = {}
    const parcelamentosPorComp: Record<string, Set<string>> = {}

    for (const p of parcelasFiltradas) {
      const comp = compFromDate(p.vencimento)
      if (filtroCompetencia && comp !== filtroCompetencia) continue
      const empresa = p.parcelamento.companyId
      empresasComParcelamento.add(empresa)
      const isPaga = p.situacao.toLowerCase() === 'paga'
      const isAtraso = p.vencimento < new Date() && !isPaga
      const restante = p.valor - (p.valorPago || 0)

      if (isAtraso) {
        empresasComParcelamentoAtraso.add(empresa)
        atrasosPorComp[comp] = (atrasosPorComp[comp] || 0) + 1
        valorAtrasoPorComp[comp] = (valorAtrasoPorComp[comp] || 0) + restante
        atrasoPorEmpresa[empresa] = {
          parcelas: (atrasoPorEmpresa[empresa]?.parcelas || 0) + 1,
          valor: (atrasoPorEmpresa[empresa]?.valor || 0) + restante,
        }
      }
      if (!isPaga) {
        valorAReceberPorComp[comp] = (valorAReceberPorComp[comp] || 0) + restante
      }
      if (isPaga && p.pagoEm) {
        const compPago = compFromDate(p.pagoEm)
        parcelasPagasPorComp[compPago] = (parcelasPagasPorComp[compPago] || 0) + (p.valorPago || p.valor)
      }
      if (!parcelamentosPorComp[comp]) parcelamentosPorComp[comp] = new Set<string>()
      parcelamentosPorComp[comp].add(p.parcelamentoId)
    }

    const empresasAtraso: EmpresaAtraso[] = Object.entries(atrasoPorEmpresa)
      .map(([companyId, info]) => {
        const compInfo = companies.find((c) => c.id === companyId)
        return {
          companyId,
          cnpj: compInfo?.cnpj || '',
          name: compInfo?.name || companyId,
          parcelas: info.parcelas,
          valor: info.valor,
        }
      })
      .sort((a, b) => b.valor - a.valor)

    const serieAtrasos: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: atrasosPorComp[c] || 0,
    }))
    const serieValorAtraso: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: valorAtrasoPorComp[c] || 0,
    }))
    const serieValorAberto: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: valorAReceberPorComp[c] || 0,
    }))
    const serieValorPago: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: parcelasPagasPorComp[c] || 0,
    }))
    const serieParcelamentos: SerieNumero[] = compsFiltradas.map((c) => ({
      competencia: c,
      valor: (parcelamentosPorComp[c]?.size) || 0,
    }))

    const result = {
      periodo: { meses, inicio },
      resumo: {
        empresasParcelamento: empresasComParcelamento.size,
        empresasParcelamentoAtraso: empresasComParcelamentoAtraso.size,
      },
      empresasAtraso,
      series: {
        parcelasAtrasadas: serieAtrasos,
        valorAtraso: serieValorAtraso,
        valorAberto: serieValorAberto,
        valorPago: serieValorPago,
        parcelamentos: serieParcelamentos,
      },
    }

    if (format === 'csv') {
      const rows: string[] = []
      rows.push('tipo,competencia,cnpj,nome,parcelas,valor')
      empresasAtraso.forEach((e) => {
        rows.push([
          'atraso_empresa',
          '',
          `"${e.cnpj}"`,
          `"${(e.name || '').replace(/"/g, '""')}"`,
          e.parcelas,
          e.valor
        ].join(','))
      })
      serieValorAtraso.forEach((s) => rows.push(['valor_atraso', s.competencia, '', '', '', s.valor].join(',')))
      serieValorAberto.forEach((s) => rows.push(['valor_aberto', s.competencia, '', '', '', s.valor].join(',')))
      serieValorPago.forEach((s) => rows.push(['valor_pago', s.competencia, '', '', '', s.valor].join(',')))
      serieParcelamentos.forEach((s) => rows.push(['parcelamentos', s.competencia, '', '', '', s.valor].join(',')))

      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="parcelamentos-sn.csv"'
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro em parcelamentos SN:', error)
    return NextResponse.json({ error: 'Erro em parcelamentos SN' }, { status: 500 })
  }
}
