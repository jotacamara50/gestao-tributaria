/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: messageId } = await params
    if (!messageId) {
      return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
    }
    const msg = await prisma.dTEMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    })
    return NextResponse.json(msg)
  } catch (error: any) {
    console.error('Erro ao marcar leitura', error)
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar' }, { status: 500 })
  }
}
