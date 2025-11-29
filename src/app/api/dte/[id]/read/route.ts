import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { id } = await params

        const before = await prisma.dTEMessage.findUnique({
            where: { id }
        })

        // Marcar como lida
        const dteMessage = await prisma.dTEMessage.update({
            where: { id },
            data: {
                readAt: new Date()
            }
        })

        // Registrar auditoria com snapshot
        await createAuditLog({
            action: 'DTE_READ',
            resource: `DTE ${id}`,
            details: JSON.stringify({ messageId: id }),
            before: before ? { readAt: before.readAt } : undefined,
            after: { readAt: dteMessage.readAt }
        })

        return NextResponse.json({
            success: true,
            message: 'Mensagem marcada como lida',
            readAt: dteMessage.readAt
        })
    } catch (error) {
        console.error('Erro ao marcar mensagem como lida:', error)
        return NextResponse.json(
            { error: 'Erro ao atualizar mensagem' },
            { status: 500 }
        )
    }
}
