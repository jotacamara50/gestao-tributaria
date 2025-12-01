import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type RiscoEmpresa = {
  companyId: string
  cnpj: string
  name: string
  omissos: number
  divergencia: number
  risco: 'critico' | 'alto' | 'medio' | 'baixo'
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

function classificaRisco(divergencia: number, omissos: number): RiscoEmpresa['risco'] {
  if (divergencia > 500000 || omissos >= 6) return 'critico'
  if (divergencia > 200000 || omissos >= 3) return 'alto'
  if (divergencia > 50000 || omissos >= 1) return 'medio'
  return 'baixo'
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

    const [companies, declarations, invoices] = await Promise.all([
      prisma.company.findMany({ select: { id: true, cnpj: true, name: true } }),
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicio } },
        select: { companyId: true, period: true, revenue: true },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: inicio } },
        select: { companyId: true, issueDate: true, value: true },
      }),
    ])

    const allowedCompanies = new Set(
      companies
        .filter((c) => !filtroCnpj || (c.cnpj || '').replace(/\D/g, '').includes(filtroCnpj))
        .map((c) => c.id)
    )

    const decMap = new Map<string, Record<string, number>>()
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      if (!allowedCompanies.has(d.companyId)) return
      if (filtroCompetencia && comp !== filtroCompetencia) return
      const byComp = decMap.get(d.companyId) || {}
      byComp[comp] = (byComp[comp] || 0) + d.revenue
      decMap.set(d.companyId, byComp)
    })

    const nfseMap = new Map<string, Record<string, number>>()
    invoices.forEach((n) => {
      const comp = compFromDate(n.issueDate)
      if (!allowedCompanies.has(n.companyId)) return
      if (filtroCompetencia && comp !== filtroCompetencia) return
      const byComp = nfseMap.get(n.companyId) || {}
      byComp[comp] = (byComp[comp] || 0) + n.value
      nfseMap.set(n.companyId, byComp)
    })

    const resultados: RiscoEmpresa[] = companies
      .filter((c) => allowedCompanies.has(c.id))
      .map((c) => {
      const decs = decMap.get(c.id) || {}
      const notas = nfseMap.get(c.id) || {}

      let divergenciaTotal = 0
      let omissos = 0

      compsFiltradas.forEach((comp) => {
        const declarado = decs[comp] || 0
        const nf = notas[comp] || 0
        if (!declarado && nf > 0) {
          omissos += 1
        }
        if (nf > declarado) {
          divergenciaTotal += nf - declarado
        }
      })

      return {
        companyId: c.id,
        cnpj: c.cnpj,
        name: c.name,
        omissos,
        divergencia: Number(divergenciaTotal.toFixed(2)),
        risco: classificaRisco(divergenciaTotal, omissos),
      }
    })

    const resumo = resultados.reduce(
      (acc, r) => {
        acc[r.risco] += 1
        return acc
      },
      { critico: 0, alto: 0, medio: 0, baixo: 0 }
    )

    if ((searchParams.get('format') || '').toLowerCase() === 'csv') {
      const rows: string[] = []
      rows.push('cnpj,nome,risco,omissos,divergencia')
      resultados.forEach((r) => {
        rows.push([
          `"${r.cnpj}"`,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          r.risco,
          r.omissos,
          r.divergencia
        ].join(','))
      })
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="riscos-sn.csv"'
        }
      })
    }

    return NextResponse.json({
      periodo: { competencias: compsFiltradas, anos, meses },
      resumo,
      empresas: resultados.sort((a, b) => b.divergencia - a.divergencia),
    })
  } catch (error) {
    console.error('Erro em riscos SN:', error)
    return NextResponse.json({ error: 'Erro em riscos SN' }, { status: 500 })
  }
}
