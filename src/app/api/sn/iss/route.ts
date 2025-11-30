import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type SerieNumero = { competencia: string; valor: number }
type EmpresaOutrosMunicipios = { companyId: string; cnpj: string; name: string; competencia: string; valor: number }
type EmpresaIssRetido = { companyId: string; cnpj: string; name: string; competencia: string; retido: number; declarado: number; diferenca: number }

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

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })

    const [companies, declarations, invoices] = await Promise.all([
      prisma.company.findMany({ select: { id: true, cnpj: true, name: true } }),
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicio } },
        select: { companyId: true, period: true, taxDue: true },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: inicio } },
        select: {
          companyId: true,
          issueDate: true,
          value: true,
          issRetido: true,
          valorIssRetido: true,
          municipioPrestacao: true,
        },
      }),
    ])

    const decMap = new Map<string, Record<string, number>>()
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      const byComp = decMap.get(d.companyId) || {}
      byComp[comp] = (byComp[comp] || 0) + d.taxDue
      decMap.set(d.companyId, byComp)
    })

    const retencaoMap = new Map<string, Record<string, number>>()
    const foraMap = new Map<string, Record<string, number>>()
    const issLocalPorComp: Record<string, number> = {}
    const issForaPorComp: Record<string, number> = {}

    invoices.forEach((n) => {
      const comp = compFromDate(n.issueDate)
      const ret = retencaoMap.get(n.companyId) || {}
      if (n.issRetido) {
        ret[comp] = (ret[comp] || 0) + (n.valorIssRetido ?? 0)
      }
      retencaoMap.set(n.companyId, ret)

      if (settings?.cityName && n.municipioPrestacao && n.municipioPrestacao !== settings.cityName) {
        const fm = foraMap.get(n.companyId) || {}
        fm[comp] = (fm[comp] || 0) + n.value
        foraMap.set(n.companyId, fm)
        issForaPorComp[comp] = (issForaPorComp[comp] || 0) + n.value
      } else {
        issLocalPorComp[comp] = (issLocalPorComp[comp] || 0) + n.value
      }
    })

    const retencaoEmpresas: EmpresaIssRetido[] = []
    const foraEmpresas: EmpresaOutrosMunicipios[] = []

    companies.forEach((c) => {
      const retMap = retencaoMap.get(c.id) || {}
      const decs = decMap.get(c.id) || {}
      const fora = foraMap.get(c.id) || {}

      comps.forEach((comp) => {
        const ret = retMap[comp] || 0
        if (ret > 0) {
          const declarado = decs[comp] || 0
          if (Math.abs(ret - declarado) > 1) {
            retencaoEmpresas.push({
              companyId: c.id,
              cnpj: c.cnpj,
              name: c.name,
              competencia: comp,
              retido: Number(ret.toFixed(2)),
              declarado: Number(declarado.toFixed(2)),
              diferenca: Number((ret - declarado).toFixed(2)),
            })
          }
        }
        const nfFora = fora[comp] || 0
        if (nfFora > 0) {
          foraEmpresas.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            valor: nfFora,
          })
        }
      })
    })

    const serieIssLocal: SerieNumero[] = comps.map((c) => ({
      competencia: c,
      valor: issLocalPorComp[c] || 0,
    }))
    const serieIssFora: SerieNumero[] = comps.map((c) => ({
      competencia: c,
      valor: issForaPorComp[c] || 0,
    }))

    return NextResponse.json({
      periodo: { inicio, competencias: comps },
      series: {
        issLocal: serieIssLocal,
        issFora: serieIssFora,
      },
      retencaoDivergente: retencaoEmpresas,
      issOutroMunicipio: foraEmpresas,
    })
  } catch (error) {
    console.error('Erro em ISS SN:', error)
    return NextResponse.json({ error: 'Erro em ISS SN' }, { status: 500 })
  }
}
