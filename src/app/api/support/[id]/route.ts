/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { id: params.id },
        include: { company: true }
    })
    if (!ticket) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(ticket)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json()
        const ticket = await prisma.supportTicket.update({
            where: { id: params.id },
            data: {
                status: body.status,
                closedAt: body.status === 'Resolvido' ? new Date() : undefined
            },
            include: { company: true }
        })
        return NextResponse.json(ticket)
    } catch (error: any) {
        console.error('Erro ao atualizar chamado', error)
        return NextResponse.json({ error: error?.message || 'Erro ao atualizar' }, { status: 500 })
    }
}
