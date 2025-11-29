import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gerarRelatorioFiscalIndividual } from '@/lib/pdf-generator'

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const actionId = params.id
    try {
        const action = await prisma.fiscalAction.findUnique({
            where: { id: actionId },
            include: {
                company: true,
                attachments: true,
                history: { orderBy: { createdAt: 'asc' } }
            }
        })

        if (!action) {
            return NextResponse.json({ error: 'Action not found' }, { status: 404 })
        }

        const settings = await prisma.settings.findUnique({ where: { id: 'default' } })

        const pdf = gerarRelatorioFiscalIndividual({
            action: {
                number: action.number,
                type: action.type,
                subject: action.subject,
                status: action.status,
                openedAt: action.openedAt,
                closedAt: action.closedAt,
                description: action.description
            },
            company: {
                name: action.company.name,
                tradeName: action.company.tradeName,
                cnpj: action.company.cnpj,
                address: action.company.address
            },
            history: action.history,
            attachments: action.attachments
        }, settings ? {
            logoUrl: settings.logoUrl || undefined,
            cityName: settings.cityName || undefined,
            stateName: settings.stateName || undefined,
            address: settings.address || undefined
        } : undefined)

        const pdfBytes = Buffer.from(pdf.output('arraybuffer'))
        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="relatorio-fiscal-${action.number}.pdf"`
            }
        })
    } catch (error) {
        console.error('Erro ao gerar relatorio fiscal', error)
        return NextResponse.json({ error: 'Erro ao gerar relatorio' }, { status: 500 })
    }
}
