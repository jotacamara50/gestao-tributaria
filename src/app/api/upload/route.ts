import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parsePGDAS, parseNFSe } from '@/lib/parsers/xml-parser'
import { parseDAF607 } from '@/lib/parsers/csv-parser'
import { logAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const fileType = formData.get('type') as string

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const content = await file.text()
        let result: any = {}

        switch (fileType) {
            case 'PGDAS':
                const pgdasData = await parsePGDAS(content)
                const company = await prisma.company.findUnique({
                    where: { cnpj: pgdasData.cnpj }
                })

                if (company) {
                    const declaration = await prisma.declaration.create({
                        data: {
                            companyId: company.id,
                            period: pgdasData.period,
                            type: 'PGDAS',
                            revenue: pgdasData.revenue,
                            taxDue: pgdasData.taxDue,
                            xmlContent: content,
                        }
                    })
                    result = { declaration, message: 'PGDAS imported successfully' }
                } else {
                    result = { error: 'Company not found', cnpj: pgdasData.cnpj }
                }
                break

            case 'NFSE':
                const nfseData = await parseNFSe(content)
                const prestador = await prisma.company.findUnique({
                    where: { cnpj: nfseData.prestadorCnpj }
                })

                if (prestador) {
                    const invoice = await prisma.invoice.create({
                        data: {
                            companyId: prestador.id,
                            number: nfseData.number,
                            series: nfseData.series,
                            issueDate: nfseData.issueDate,
                            value: nfseData.value,
                            serviceCode: nfseData.serviceCode,
                            tomadorCnpj: nfseData.tomadorCnpj,
                            xmlContent: content,
                        }
                    })
                    result = { invoice, message: 'NFS-e imported successfully' }
                } else {
                    result = { error: 'Company not found', cnpj: nfseData.prestadorCnpj }
                }
                break

            case 'DAF607':
                const dafData = parseDAF607(content)
                const repasses = await prisma.repasse.createMany({
                    data: dafData
                })
                result = { count: repasses.count, message: `${repasses.count} repasses imported` }
                break

            default:
                return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
        }

        // Log the upload action
        await logAction('FILE_UPLOAD', fileType, {
            fileName: file.name,
            fileSize: file.size,
            result: result
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
