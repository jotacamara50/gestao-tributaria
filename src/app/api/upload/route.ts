import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parsePGDAS, parseNFSe } from '@/lib/parsers/xml-parser'
import { parseDAF607 } from '@/lib/parsers/csv-parser'
import { logAction } from '@/lib/audit'

function formatCNPJ(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return cnpj
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

async function findCompanyByCnpj(raw: string) {
    const clean = raw.replace(/\D/g, '')
    const formatted = formatCNPJ(clean)
    return prisma.company.findFirst({
        where: {
            OR: [
                { cnpj: clean },
                { cnpj: formatted }
            ]
        }
    })
}

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
                const company = await findCompanyByCnpj(pgdasData.cnpj)

                if (company) {
                    const declaration = await prisma.declaration.create({
                        data: {
                            companyId: company.id,
                            period: pgdasData.period,
                            type: 'PGDAS',
                            revenue: pgdasData.receitaBrutaMensal,
                            taxDue: pgdasData.valorDevido,
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
                const prestador = await findCompanyByCnpj(nfseData.prestadorCnpj)

                if (prestador) {
                    const invoice = await prisma.invoice.create({
                        data: {
                            companyId: prestador.id,
                            number: nfseData.numero,
                            issueDate: nfseData.dataEmissao,
                            value: nfseData.valorServicos,
                            serviceCode: nfseData.itemListaServico,
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
        await logAction(
            'FILE_UPLOAD',
            fileType,
            {
                fileName: file.name,
                fileSize: file.size,
                result: result
            },
            null,
            result
        )

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
