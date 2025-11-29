import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gerarRelatorioLGPD } from '@/lib/pdf-generator'

export async function GET() {
    try {
        const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
        const pdf = gerarRelatorioLGPD({
            municipio: settings?.cityName || 'Municipio',
            dadosColetados: ['CPF', 'Nome', 'Renda'],
            finalidade: 'Fiscalizacao tributaria (art. 7 CTN).',
            retencao: '5 anos.'
        }, settings ? {
            logoUrl: settings.logoUrl || '/favicon.ico',
            cityName: settings.cityName || undefined,
            stateName: settings.stateName || undefined,
            address: settings.address || undefined
        } : undefined)

        const pdfBytes = Buffer.from(pdf.output('arraybuffer'))
        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="relatorio-lgpd.pdf"'
            }
        })
    } catch (error) {
        console.error('Erro ao gerar RIPD:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatorio LGPD' }, { status: 500 })
    }
}
