/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const actionId = params.id
    try {
        const body = await request.json()
        const { type, note, status } = body as any

        const action = await prisma.fiscalAction.findUnique({ where: { id: actionId } })
        if (!action) {
            return NextResponse.json({ error: 'Action not found' }, { status: 404 })
        }

        const history = await prisma.fiscalHistory.create({
            data: {
                actionId,
                companyId: action.companyId,
                type: type || 'HISTORICO',
                note: note || ''
            }
        })

        if (status) {
            await prisma.fiscalAction.update({
                where: { id: actionId },
                data: { status, closedAt: status === 'Encerrada' ? new Date() : undefined }
            })
        }

        return NextResponse.json(history, { status: 201 })
    } catch (error) {
        console.error('Erro ao registrar historico fiscal', error)
        return NextResponse.json({ error: 'Erro ao registrar historico' }, { status: 500 })
    }
}
