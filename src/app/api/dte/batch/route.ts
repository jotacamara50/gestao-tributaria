import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { generateDTEBatch } from '@/lib/dte-batch'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const format = (searchParams.get('format') as 'txt' | 'xml') || 'txt'
        const companyId = searchParams.get('companyId') || undefined
        const unreadOnly = searchParams.get('unreadOnly') === 'true'
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        const startDate = startDateParam ? new Date(startDateParam) : undefined
        const endDate = endDateParam ? new Date(endDateParam) : undefined

        const batch = await generateDTEBatch({
            format,
            companyId,
            unreadOnly,
            startDate,
            endDate
        })

        await createAuditLog({
            action: 'DTE_BATCH_EXPORT',
            resource: 'DTE_BATCH',
            details: JSON.stringify({ format, companyId, unreadOnly }),
            after: { count: batch.count, format }
        })

        return new NextResponse(batch.content, {
            status: 200,
            headers: {
                'Content-Type': format === 'xml' ? 'application/xml' : 'text/plain',
                'Content-Disposition': `attachment; filename="${batch.filename}"`
            }
        })
    } catch (error) {
        console.error('Erro ao gerar lote DTE:', error)
        return NextResponse.json(
            { error: 'Erro ao gerar arquivo de lote DTE' },
            { status: 500 }
        )
    }
}
