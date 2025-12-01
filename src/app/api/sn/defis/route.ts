import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type DefisResumo = {
  exercicio: number
  empresas: number
  socios: number
  rendimentoSocios: number
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
    const format = (searchParams.get('format') || '').toLowerCase()
    const anoAtual = new Date().getFullYear()
    const minAno = anoAtual - anos + 1

    const defis = await prisma.defis.findMany({
      where: {
        exercicio: { gte: minAno },
        ...(filtroCnpj
          ? {
              company: {
                cnpj: { contains: filtroCnpj },
              },
            }
          : {}),
      },
      include: { socios: true, company: { select: { id: true, cnpj: true, name: true } } },
      orderBy: { exercicio: 'desc' },
    })

    const porExercicio = new Map<number, DefisResumo>()
    defis.forEach((d) => {
      const atual = porExercicio.get(d.exercicio) || {
        exercicio: d.exercicio,
        empresas: 0,
        socios: 0,
        rendimentoSocios: 0,
      }
      atual.empresas += 1
      atual.socios += d.socios.length
      atual.rendimentoSocios += d.socios.reduce((s, sct) => s + (sct.rendimento || 0), 0)
      porExercicio.set(d.exercicio, atual)
    })

    const resumo = Array.from(porExercicio.values()).sort((a, b) => b.exercicio - a.exercicio)

    if (format === 'csv') {
      const rows: string[] = []
      rows.push('exercicio,cnpj,nome,socios,rendimentoSocios')
      defis.forEach((d) => {
        rows.push([
          d.exercicio,
          `"${d.company?.cnpj || ''}"`,
          `"${(d.company?.name || '').replace(/"/g, '""')}"`,
          d.socios.length,
          d.socios.reduce((s, sct) => s + (sct.rendimento || 0), 0)
        ].join(','))
      })
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="defis-sn.csv"'
        }
      })
    }

    return NextResponse.json({
      periodo: { anoAtual, anos },
      resumo,
      registros: defis,
    })
  } catch (error) {
    console.error('Erro em DEFIS SN:', error)
    return NextResponse.json({ error: 'Erro em DEFIS SN' }, { status: 500 })
  }
}
