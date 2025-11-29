/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const actionId = params.id
    try {
        const body = await request.json()
        const attachments = Array.isArray(body) ? body : [body]

        const action = await prisma.fiscalAction.findUnique({ where: { id: actionId } })
        if (!action) {
            return NextResponse.json({ error: 'Action not found' }, { status: 404 })
        }

        const created = await prisma.fiscalAttachment.createMany({
            data: attachments.map((att: any) => ({
                actionId,
                name: att.name,
                mimeType: att.mimeType,
                size: att.size,
                contentBase64: att.contentBase64
            }))
        })

        await prisma.fiscalHistory.create({
            data: {
                companyId: action.companyId,
                actionId,
                type: 'ANEXO',
                note: `${created.count} documento(s) anexado(s)`
            }
        })

        return NextResponse.json({ count: created.count })
    } catch (error) {
        console.error('Erro ao anexar documentos', error)
        return NextResponse.json({ error: 'Erro ao anexar documentos' }, { status: 500 })
    }
}
