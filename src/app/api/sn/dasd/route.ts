import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type Omissao = {
  companyId: string
  cnpj: string
  name: string
  competencias: string[]
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

    const [companies, dasd, declarations] = await Promise.all([
      prisma.company.findMany({ select: { id: true, cnpj: true, name: true } }),
      prisma.dasdDeclaration.findMany({
        where: { createdAt: { gte: inicio } },
        select: { companyId: true, period: true },
      }),
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicio } },
        select: { companyId: true, period: true },
      }),
    ])

    const dasdMap = new Map<string, Set<string>>()
    dasd.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      const set = dasdMap.get(d.companyId) || new Set<string>()
      set.add(comp)
      dasdMap.set(d.companyId, set)
    })

    const declMap = new Map<string, Set<string>>()
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      const set = declMap.get(d.companyId) || new Set<string>()
      set.add(comp)
      declMap.set(d.companyId, set)
    })

    const omissos: Omissao[] = []

    companies.forEach((c) => {
      const dset = dasdMap.get(c.id) || new Set<string>()
      const declSet = declMap.get(c.id) || new Set<string>()
      const faltantes: string[] = []
      comps.forEach((comp) => {
        if (!dset.has(comp) && declSet.has(comp)) {
          faltantes.push(comp)
        }
      })
      if (faltantes.length) {
        omissos.push({ companyId: c.id, cnpj: c.cnpj, name: c.name, competencias: faltantes })
      }
    })

    return NextResponse.json({
      periodo: { inicio, competencias: comps },
      omissos,
    })
  } catch (error) {
    console.error('Erro em DAS-D:', error)
    return NextResponse.json({ error: 'Erro em DAS-D' }, { status: 500 })
  }
}
