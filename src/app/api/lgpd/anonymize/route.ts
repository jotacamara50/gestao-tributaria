/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { anonymizeExpiredData } from '@/lib/lgpd'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        if (session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
        }

        const body = await request.json().catch(() => ({} as any))
        const years = Number(body.years) || 5

        const result = await anonymizeExpiredData(years)

        await createAuditLog({
            action: 'LGPD_ANONYMIZE',
            resource: 'LGPD',
            details: JSON.stringify({ years }),
            after: result
        })

        return NextResponse.json({
            success: true,
            result
        })
    } catch (error) {
        console.error('Erro ao anonimizar dados:', error)
        return NextResponse.json(
            { error: 'Erro ao executar anonimização' },
            { status: 500 }
        )
    }
}
