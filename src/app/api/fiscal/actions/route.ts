/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeCnpj(value: string) {
    return value.replace(/\D/g, '')
}

function gerarNumero() {
    const now = new Date()
    return `FIS-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj')
    const status = searchParams.get('status')

    try {
        let companyIds: string[] | undefined
        if (cnpj) {
            const clean = normalizeCnpj(cnpj)
            const company = await prisma.company.findFirst({
                where: {
                    cnpj: {
                        contains: clean
                    }
                }
            })
            if (!company) {
                return NextResponse.json([], { status: 200 })
            }
            companyIds = [company.id]
        }

        const actions = await prisma.fiscalAction.findMany({
            where: {
                companyId: companyIds ? { in: companyIds } : undefined,
                status: status || undefined
            },
            orderBy: { openedAt: 'desc' },
            include: {
                company: true,
                attachments: true,
                history: { orderBy: { createdAt: 'desc' } }
            }
        })

        return NextResponse.json(actions)
    } catch (error) {
        console.error('Erro ao listar fiscal actions', error)
        return NextResponse.json({ error: 'Erro ao listar acoes fiscais' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cnpj, companyId, type, subject, description, status, attachments } = body as any

        if (!type || !subject) {
            return NextResponse.json({ error: 'type and subject are required' }, { status: 400 })
        }

        let company = null
        if (companyId) {
            company = await prisma.company.findUnique({ where: { id: companyId } })
        } else if (cnpj) {
            const clean = normalizeCnpj(cnpj)
            company = await prisma.company.findFirst({
                where: { cnpj: { contains: clean } }
            })
        }

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        const numero = gerarNumero()

        const action = await prisma.fiscalAction.create({
            data: {
                companyId: company.id,
                number: numero,
                type,
                subject,
                description,
                status: status || 'Aberta',
                attachments: attachments?.length
                    ? {
                        create: attachments.map((att: any) => ({
                            name: att.name,
                            mimeType: att.mimeType,
                            size: att.size,
                            contentBase64: att.contentBase64
                        }))
                    }
                    : undefined,
                history: {
                    create: [{
                        companyId: company.id,
                        type: 'CRIACAO',
                        note: `Acao fiscal ${numero} criada - ${subject}`
                    }]
                }
            },
            include: {
                attachments: true,
                history: true,
                company: true
            }
        })

        return NextResponse.json(action, { status: 201 })
    } catch (error: any) {
        console.error('Erro ao criar acao fiscal', error)
        return NextResponse.json({ error: error?.message || 'Erro ao criar acao fiscal' }, { status: 500 })
    }
}
