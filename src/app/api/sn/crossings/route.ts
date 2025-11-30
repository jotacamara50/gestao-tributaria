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

type Inadimplente = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  devido: number
  pago: number
  diferenca: number
}

type RepasseSerie = { competencia: string; valor: number }

type DeclarouSemNFSe = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  receitaDeclarada: number
}

type DeclarouComNFSe = {
  companyId: string
  cnpj: string
  name: string
  competencia: string
  receitaDeclarada: number
  baseNFSe: number
  diferenca: number
}

type NFSeItemResumo = {
  competencia: string
  itemServico: string
  quantidade: number
  baseCalculo: number
  issEstimado: number
}

type NFSeCnaeResumo = {
  competencia: string
  cnae: string
  quantidade: number
  baseCalculo: number
  issEstimado: number
}

type NFSeTomadorResumo = {
  competencia: string
  tomadorCnpj: string
  quantidade: number
  baseCalculo: number
}

type RepassesFaixa = { faixa: string; valor: number }
type RepassesOrigem = { origem: string; valor: number }

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

    const { searchParams } = new URL(request.url)
    const anos = Number(searchParams.get('anos') || '5')
    const meses = Math.max(12, Math.min(anos * 12, 60))
    const comps = competenciasUltimosMeses(meses)
    const inicio = new Date(comps[0] + '-01')

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } })

    const [companies, declarations, invoices, repasses, guias] = await Promise.all([
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
      prisma.repasse.findMany({
        where: { date: { gte: inicio } },
        select: { date: true, amount: true, origin: true, description: true },
      }),
      prisma.guia.findMany({
        where: { pagoEm: { not: null, gte: inicio } },
        select: { companyId: true, pagoEm: true, valorPago: true, valorTotal: true },
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

      const item = n.serviceCode || 'ITEM'
      const keyItem = `${comp}|${item}`
      const atual = nfsePorItemMap.get(keyItem) || { comp, item, qtd: 0, base: 0, iss: 0 }
      atual.qtd += 1
      atual.base += n.value
      const issEstimado = n.valorIssRetido ?? (n.aliquotaIss ? n.value * n.aliquotaIss : n.value * 0.03)
      atual.iss += issEstimado || 0
      nfsePorItemMap.set(keyItem, atual)

      const cnae = n.serviceCode || 'CNAE'
      const keyCnae = `${comp}|${cnae}`
      const atualCnae = nfsePorCnaeMap.get(keyCnae) || { comp, cnae, qtd: 0, base: 0, iss: 0 }
      atualCnae.qtd += 1
      atualCnae.base += n.value
      atualCnae.iss += issEstimado || 0
      nfsePorCnaeMap.set(keyCnae, atualCnae)

      const tomador = n.tomadorCnpj || 'TOMADOR'
      const keyTomador = `${comp}|${tomador}`
      const atualTomador = nfseTomadorMap.get(keyTomador) || { comp, tomador, qtd: 0, base: 0 }
      atualTomador.qtd += 1
      atualTomador.base += n.value
      nfseTomadorMap.set(keyTomador, atualTomador)
    })

    // pre-agragacoes para retencao e municipio
    const retencaoMap = new Map<string, Record<string, number>>() // comp => valor retido notas
    const foraMap = new Map<string, Record<string, number>>() // comp => valor notas fora municipio
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

    // repasses por CNPJ extraido de origin/description
    const repasseMap = new Map<string, Record<string, number>>() // key: cnpj digits
    const repasseSerie: Record<string, number> = {}
    repasses.forEach((r) => {
      const comp = compFromDate(r.date)
      repasseSerie[comp] = (repasseSerie[comp] || 0) + r.amount

      const cnpjDigits = (r.origin || r.description || '').replace(/\D/g, '')
      if (!cnpjDigits) return
      const byComp = repasseMap.get(cnpjDigits) || {}
      byComp[comp] = (byComp[comp] || 0) + r.amount
      repasseMap.set(cnpjDigits, byComp)

      const origemKey = (r.origin || 'OUTROS').trim() || 'OUTROS'
      repasseOrigem[origemKey] = (repasseOrigem[origemKey] || 0) + r.amount
      const val = r.amount
      let faixa = '0-5k'
      if (val > 5000 && val <= 20000) faixa = '5k-20k'
      else if (val > 20000 && val <= 50000) faixa = '20k-50k'
      else if (val > 50000) faixa = '50k+'
      repasseFaixa[faixa] = (repasseFaixa[faixa] || 0) + val
    })

    // guias pagas por empresa/competencia
    const guiasPagasMap = new Map<string, Record<string, number>>()
    guias.forEach((g) => {
      if (!g.pagoEm) return
      const comp = compFromDate(g.pagoEm)
      const byComp = guiasPagasMap.get(g.companyId) || {}
      const valorPago = g.valorPago ?? g.valorTotal ?? 0
      byComp[comp] = (byComp[comp] || 0) + valorPago
      guiasPagasMap.set(g.companyId, byComp)
    })

    const omissos: Omissao[] = []
    const semMovimento: SemMovimento[] = []
    const divergencias: Divergencia[] = []
    const sublimite: LimiteAlerta[] = []
    const limite: LimiteAlerta[] = []
    const retencao: Retencao[] = []
    const isencaoIrregular: IsencaoIrregular[] = []
    const outroMunicipio: OutroMunicipio[] = []
    const inadimplentes: Inadimplente[] = []
    const declararamSemNFSe: DeclarouSemNFSe[] = []
    const declararamComNFSe: DeclarouComNFSe[] = []
    const nfsePorItemMap = new Map<string, { comp: string; item: string; qtd: number; base: number; iss: number }>()
    const nfsePorCnaeMap = new Map<string, { comp: string; cnae: string; qtd: number; base: number; iss: number }>()
    const nfseTomadorMap = new Map<string, { comp: string; tomador: string; qtd: number; base: number }>()
    const repasseFaixa: Record<string, number> = {}
    const repasseOrigem: Record<string, number> = {}

    companies.forEach((c) => {
      const decls = decMap.get(c.id) || {}
      const nfse = nfseMap.get(c.id) || {}
      const repassesEmpresa = repasseMap.get(c.cnpj.replace(/\D/g, '')) || {}

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

        if (dec && dec.revenue > 0 && notas === 0) {
          declararamSemNFSe.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            receitaDeclarada: dec.revenue,
          })
        }

        if (dec && dec.revenue > 0 && notas > 0) {
          declararamComNFSe.push({
            companyId: c.id,
            cnpj: c.cnpj,
            name: c.name,
            competencia: comp,
            receitaDeclarada: dec.revenue,
            baseNFSe: notas,
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

        // retencao ISS: somar notas com issRetido=true e comparar com declarado
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

        // ISS devido a outro municipio: notas com municipioPrestacao diferente do settings.cityName
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

        // Inadimplencia DAF607 x PGDAS (pagamentos vs devido)
        const repassesComp = repassesEmpresa[comp] || 0
        const guiasPagasComp = guiasPagasMap.get(c.id)?.[comp] || 0
        const pagosTotais = repassesComp + guiasPagasComp
        if (dec && dec.taxDue > 0) {
          const diferenca = dec.taxDue - pagosTotais
          const tolerancia = Math.max(50, dec.taxDue * 0.05)
          if (diferenca > tolerancia) {
            inadimplentes.push({
              companyId: c.id,
              cnpj: c.cnpj,
              name: c.name,
              competencia: comp,
              devido: Number(dec.taxDue.toFixed(2)),
              pago: Number(pagosTotais.toFixed(2)),
              diferenca: Number(diferenca.toFixed(2)),
            })
          }
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
      periodo: { inicio, competencias: comps, anos, meses },
      omissos,
      semMovimento,
      divergenciasBase: divergencias,
      sublimite36: sublimite,
      limite48: limite,
      retencao,
      isencaoIrregular,
      outroMunicipio,
      inadimplentes,
      repassesSerie: comps.map<RepasseSerie>((c) => ({
        competencia: c,
        valor: repasseSerie[c] || 0,
      })),
      nfsePorCnae: Array.from(nfsePorCnaeMap.values()).map(i => ({
        competencia: i.comp,
        cnae: i.cnae,
        quantidade: i.qtd,
        baseCalculo: i.base,
        issEstimado: i.iss,
      })),
      nfseTomadas: Array.from(nfseTomadorMap.values()).map(i => ({
        competencia: i.comp,
        tomadorCnpj: i.tomador,
        quantidade: i.qtd,
        baseCalculo: i.base,
      })),
      repassesFaixa: Object.entries(repasseFaixa).map(([faixa, valor]) => ({ faixa, valor })),
      repassesOrigem: Object.entries(repasseOrigem).map(([origem, valor]) => ({ origem, valor })),
      declararamSemNFSe,
      declararamComNFSe,
      nfsePorItem: Array.from(nfsePorItemMap.values()).map(i => ({
        competencia: i.comp,
        itemServico: i.item,
        quantidade: i.qtd,
        baseCalculo: i.base,
        issEstimado: i.iss,
      })),
    })
  } catch (error) {
    console.error('Erro nos cruzamentos SN:', error)
    return NextResponse.json({ error: 'Erro nos cruzamentos SN' }, { status: 500 })
  }
}
