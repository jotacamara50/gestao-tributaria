import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const companies = await prisma.company.findMany({
            include: {
                declarations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                divergences: {
                    where: { status: 'Pendente' }
                }
            }
        })

        return NextResponse.json(companies)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
