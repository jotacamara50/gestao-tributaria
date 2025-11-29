/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function cleanCnpj(raw: string) {
    return (raw || '').replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cnpj = cleanCnpj(searchParams.get('cnpj') || '')

    if (!cnpj || cnpj.length !== 14) {
        return NextResponse.json({ error: 'CNPJ invalido' }, { status: 400 })
    }

    const company = await prisma.company.findFirst({
        where: { cnpj: { contains: cnpj } }
    })

    if (!company) {
        return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
    }

    const messages = await prisma.dTEMessage.findMany({
        where: { companyId: company.id },
        orderBy: { sentAt: 'desc' }
    })

    return NextResponse.json({
        company: { id: company.id, name: company.name, cnpj: company.cnpj },
        messages
    })
}
