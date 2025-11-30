/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { dteTemplates, DTETemplateType } from '@/lib/dte-templates'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { companyId, type, params } = body

        // Validar tipo de template
        if (!dteTemplates[type as DTETemplateType]) {
            return NextResponse.json({ error: 'Tipo de mensagem invalido' }, { status: 400 })
        }

        // Buscar empresa
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        })

        if (!company) {
            return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
        }

        // Gerar mensagem usando template
        const template = dteTemplates[type as DTETemplateType]
        const dataEmissao = new Date()
        const subject = template.subject(params)
        const bodyContent = template.body({
            empresaNome: company.name,
            cnpj: company.cnpj,
            dataEmissao,
            ...params
        })

        // Criar mensagem DTE no banco
        const dteMessage = await prisma.dTEMessage.create({
            data: {
                companyId,
                type,
                subject,
                content: bodyContent,
                createdBy: session.user.id,
            },
            include: {
                company: true,
            }
        })

        // Registrar auditoria com snapshot do conteudo enviado
        await createAuditLog({
            action: 'DTE_SENT',
            resource: `DTE ${dteMessage.id}`,
            details: JSON.stringify({ type, companyId }),
            after: {
                companyId,
                type,
                subject,
                sentAt: dteMessage.sentAt
            }
        })

        // Em producao, aqui seria feito o envio real via email/SMS
        // Por ora, apenas salvamos no banco e o contribuinte vera no portal

        return NextResponse.json({
            success: true,
            message: 'Mensagem DTE enviada com sucesso',
            dteMessage: {
                id: dteMessage.id,
                type: dteMessage.type,
                subject: dteMessage.subject,
                sentAt: dteMessage.sentAt
            }
        })
    } catch (error) {
        console.error('Erro ao enviar DTE:', error)
        return NextResponse.json(
            { error: 'Erro ao enviar mensagem DTE' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('companyId')
        const type = searchParams.get('type')
        const unreadOnly = searchParams.get('unreadOnly') === 'true'

        const where: any = {}
        if (companyId) where.companyId = companyId
        if (type) where.type = type
        if (unreadOnly) where.readAt = null

        const messages = await prisma.dTEMessage.findMany({
            where,
            include: {
                company: {
                    select: {
                        id: true,
                        cnpj: true,
                        name: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { sentAt: 'desc' },
            take: 100
        })

        return NextResponse.json(messages)
    } catch (error) {
        console.error('Erro ao buscar mensagens DTE:', error)
        return NextResponse.json(
            { error: 'Erro ao buscar mensagens' },
            { status: 500 }
        )
    }
}
