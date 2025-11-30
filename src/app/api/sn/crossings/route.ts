import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type Divergencia = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  declarado: number
  nfse: number
  diferenca: number
}

type Omissao = {
  companyId: string
  cnpj: string
  name: string
  competencias: string[]
}

type SemMovimento = Omissao

type LimiteAlerta = {
  companyId: string
  cnpj: string
  name: string
  receita12m: number
}

type Retencao = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  issRetidoNotas: number
  declarado: number
  diferenca: number
}

type IsencaoIrregular = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  notas: number
}

type OutroMunicipio = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  notas: number
  municipioNotas: string
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
  // assume formato AAAA-MM ou AAAAMM
  if (period.includes('-')) {
    const [y, m] = period.split('-')
    if (y && m) return `${y}-${m.padStart(2, '0')}`
  }
  if (period.length === 6) {
    return `${period.slice(0, 4)}-${period.slice(4)}`
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const comps = competenciasUltimosMeses(60)
    const inicio = new Date(comps[0] + '-01')

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })

    const [companies, declarations, invoices] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, cnpj: true, name: true, issIsento: true },
      }),
      prisma.declaration.findMany({
        where: { createdAt: { gte: inicio } },
        select: { companyId: true, period: true, revenue: true, taxDue: true },
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

    // maps
    const decMap = new Map<string, Record<string, { revenue: number; tax: number }>>()
    declarations.forEach((d) => {
      const comp = compFromPeriod(d.period)
      if (!comp) return
      const byComp = decMap.get(d.companyId) || {}
      byComp[comp] = {
        revenue: (byComp[comp]?.revenue || 0) + d.revenue,
        tax: (byComp[comp]?.tax || 0) + d.taxDue,
      }
      decMap.set(d.companyId, byComp)
    })

    const nfseMap = new Map<string, Record<string, number>>()
    invoices.forEach((n) => {
      const comp = compFromDate(n.issueDate)
      const byComp = nfseMap.get(n.companyId) || {}
      byComp[comp] = (byComp[comp] || 0) + n.value
      nfseMap.set(n.companyId, byComp)
    })

    // pré-agregações para retenção e município
    const retencaoMap = new Map<string, Record<string, number>>() // comp => valor retido notas
    const foraMap = new Map<string, Record<string, number>>() // comp => valor notas fora município
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
      }
    })

    const omissos: Omissao[] = []
    const semMovimento: SemMovimento[] = []
    const divergencias: Divergencia[] = []
    const sublimite: LimiteAlerta[] = []
    const limite: LimiteAlerta[] = []
    const retencao: Retencao[] = []
    const isencaoIrregular: IsencaoIrregular[] = []
    const outroMunicipio: OutroMunicipio[] = []

    companies.forEach((c) => {
      const decls = decMap.get(c.id) || {}
      const nfse = nfseMap.get(c.id) || {}

      const compsOmissos: string[] = []
      const compsSemMov: string[] = []

      comps.forEach((comp) => {
        const dec = decls[comp]
        const notas = nfse[comp] || 0

        if (!dec && notas > 0) {
          compsOmissos.push(comp)
        }

        if (dec && dec.revenue <= 0 && notas > 0) {
          compsSemMov.push(comp)
        }

        if (dec && notas > dec.revenue) {
          divergencias.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            declarado: dec.revenue,
            nfse: notas,
            diferenca: notas - dec.revenue,
          })
        }

        // isencao/imunidade sem autorizacao (declarado zero e notas >0 e empresa nao isenta)
        if (dec && dec.taxDue <= 0 && notas > 0 && !c.issIsento) {
          isencaoIrregular.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            notas,
          })
        }

        // retenção ISS: somar notas com issRetido=true e comparar com declarado
        const notasRetidas = retencaoMap.get(c.id)?.[comp] || 0
        if (notasRetidas > 0) {
          const declarado = dec ? dec.taxDue : 0
          if (Math.abs(notasRetidas - declarado) > 1) {
            retencao.push({
              companyId: c.id,
              cnpj: c.cnpj,
              name: c.name,
              competencia: comp,
              issRetidoNotas: Number(notasRetidas.toFixed(2)),
              declarado: Number(declarado.toFixed(2)),
              diferenca: Number((notasRetidas - declarado).toFixed(2)),
            })
          }
        }

        // ISS devido a outro município: notas com municipioPrestacao diferente do settings.cityName
        const notasFora = foraMap.get(c.id)?.[comp] || 0
        if (notasFora > 0 && dec) {
          outroMunicipio.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            notas: notasFora,
            municipioNotas: settings?.cityName || '',
          })
        }
      })

      if (compsOmissos.length) {
        omissos.push({ companyId: c.id, cnpj: c.cnpj, name: c.name, competencias: compsOmissos })
      }
      if (compsSemMov.length) {
        semMovimento.push({ companyId: c.id, cnpj: c.cnpj, name: c.name, competencias: compsSemMov })
      }

      // faturamento 12m para sublimite/limite por empresa
      const comps12 = comps.slice(-12)
      const receita12 = comps12.reduce((s, comp) => s + (decls[comp]?.revenue || 0), 0)
      if (receita12 > 4800000) {
        limite.push({ companyId: c.id, cnpj: c.cnpj, name: c.name, receita12m: receita12 })
      } else if (receita12 > 3600000) {
        sublimite.push({ companyId: c.id, cnpj: c.cnpj, name: c.name, receita12m: receita12 })
      }
    })

    return NextResponse.json({
      periodo: { inicio, competencias: comps },
      omissos,
      semMovimento,
      divergenciasBase: divergencias,
      sublimite36: sublimite,
      limite48: limite,
      retencao,
      isencaoIrregular,
      outroMunicipio,
    })
  } catch (error) {
    console.error('Erro nos cruzamentos SN:', error)
    return NextResponse.json({ error: 'Erro nos cruzamentos SN' }, { status: 500 })
  }
}
