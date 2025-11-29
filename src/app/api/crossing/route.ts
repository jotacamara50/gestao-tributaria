/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { executarTodosCruzamentos, executarCruzamentoEmLote } from '@/lib/engine/crossing'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { companyId, period } = body

        if (!period) {
            return NextResponse.json({ error: 'period is required' }, { status: 400 })
        }

        if (companyId) {
            // Run checks for specific company
            const result = await executarTodosCruzamentos(companyId, period)
            return NextResponse.json({ message: 'Crossing checks completed', result })
        } else {
            // Run checks for all companies
            const result = await executarCruzamentoEmLote(period)
            return NextResponse.json({
                message: 'Crossing checks completed for all companies',
                result
            })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
