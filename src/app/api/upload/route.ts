/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { importDAF607, importDEFIS, importNFSe, importPGDAS } from '@/lib/importers'
import { logAction } from '@/lib/audit'

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
            case 'NFSE':
                result = await importNFSe(content)
                break
            case 'DAF607':
                result = await importDAF607(content)
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

        const status = result?.error ? 404 : 200
        return NextResponse.json(result, { status })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
