/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { importDAF607, importDEFIS, importNFSe, importPGDAS, importDASD, importParcelamentos, importGuias } from '@/lib/importers'
import { logAction } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const fileType = (formData.get('type') as string)?.toUpperCase()

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const content = await file.text()
        let result: any = {}

        switch (fileType) {
            case 'PGDAS':
                result = await importPGDAS(content)
                break
            case 'DEFIS':
                result = await importDEFIS(content)
                break
            case 'DASD':
                result = await importDASD(content)
                break
            case 'NFSE':
                result = await importNFSe(content)
                break
            case 'DAF607':
                result = await importDAF607(content)
                break
            case 'PARCELAMENTO':
                result = await importParcelamentos(content)
                break
            case 'GUIA':
                result = await importGuias(content)
                break
            default:
                return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
        }

        // Log the upload action com detalhes e erros se houver
        await logAction(
            'FILE_UPLOAD',
            fileType,
            {
                fileName: file.name,
                fileSize: file.size,
                errors: result?.errors,
                count: result?.count || result?.imported,
                skipped: result?.skipped,
            },
            null,
            result
        )

        // Persist log em tabela dedicada para rastreabilidade do edital
        try {
            await prisma.importLog.create({
                data: {
                    type: fileType,
                    fileName: file.name,
                    fileSize: Number(file.size),
                    status: result?.error ? 'error' : result?.errors?.length ? 'partial' : 'success',
                    message: result?.message || null,
                    errors: result?.errors ? JSON.stringify(result.errors).slice(0, 10000) : null,
                }
            })
        } catch (err) {
            console.error('Erro ao registrar ImportLog:', err)
        }

        const status = result?.error ? 404 : 200
        return NextResponse.json(result, { status })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
