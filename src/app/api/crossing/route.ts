import { NextResponse } from 'next/server'
import { runCrossingChecks } from '@/lib/engine/crossing'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const { companyId } = await request.json()

        if (companyId) {
            // Run checks for specific company
            await runCrossingChecks(companyId)
            return NextResponse.json({ message: 'Crossing checks completed', companyId })
        } else {
            // Run checks for all companies
            const companies = await prisma.company.findMany({
                where: { status: 'Ativo' }
            })

            for (const company of companies) {
                await runCrossingChecks(company.id)
            }

            return NextResponse.json({
                message: 'Crossing checks completed for all companies',
                count: companies.length
            })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
