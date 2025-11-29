import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 })
        }

        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'Imagem deve ter no maximo 2MB' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const dataUrl = `data:${file.type};base64,${base64}`

        return NextResponse.json({ url: dataUrl })
    } catch (error) {
        console.error('Erro no upload de logo:', error)
        return NextResponse.json(
            { error: 'Erro ao processar upload do brasao' },
            { status: 500 }
        )
    }
}
