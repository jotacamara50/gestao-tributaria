import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const enquadramentos = await prisma.enquadramentoHistory.findMany({
      orderBy: [{ companyId: 'asc' }, { startDate: 'asc' }],
      include: { company: { select: { cnpj: true, name: true } } },
    })

    return NextResponse.json(
      enquadramentos.map((e) => ({
        companyId: e.companyId,
        cnpj: e.company.cnpj,
        name: e.company.name,
        regime: e.regime,
        isMei: e.isMei,
        startDate: e.startDate,
        endDate: e.endDate,
        reason: e.reason,
      }))
    )
  } catch (error) {
    console.error('Erro em enquadramento SN:', error)
    return NextResponse.json({ error: 'Erro em enquadramento SN' }, { status: 500 })
  }
}
