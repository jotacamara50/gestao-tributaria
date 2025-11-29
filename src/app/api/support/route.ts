/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function protocolFor(date: Date, seq: number) {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    return `SUP-${year}-${month}-${seq.toString().padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const companyId = searchParams.get('companyId') || undefined

    const tickets = await prisma.supportTicket.findMany({
        where: {
            status,
            companyId
        },
        orderBy: { openedAt: 'desc' },
        include: { company: true }
    })

    return NextResponse.json(tickets)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const now = new Date()

        const countMonth = await prisma.supportTicket.count({
            where: {
                openedAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1),
                    lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
                }
            }
        })
        const protocol = protocolFor(now, countMonth + 1)

        const ticket = await prisma.supportTicket.create({
            data: {
                protocol,
                subject: body.subject,
                category: body.category,
                priority: body.priority,
                description: body.description,
                requester: body.requester,
                companyId: body.companyId || null,
                status: 'Aberto',
                slaHours: body.slaHours || 4,
                attachmentName: body.attachmentName || null,
                openedAt: now
            },
            include: { company: true }
        })

        return NextResponse.json(ticket, { status: 201 })
    } catch (error: any) {
        console.error('Erro ao criar suporte:', error)
        return NextResponse.json({ error: error?.message || 'Erro ao criar chamado' }, { status: 500 })
    }
}
