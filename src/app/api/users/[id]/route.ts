/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type ParamsInput = { params: { id: string } } | { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: ParamsInput) {
    try {
        const paramsObj = 'then' in ctx.params ? await ctx.params : ctx.params
        if (!paramsObj?.id) {
            return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
        }
        const body = await request.json()
        const where = paramsObj.id ? { id: paramsObj.id } : body?.id ? { id: body.id } : body?.email ? { email: body.email } : body?.cpf ? { cpf: body.cpf } : null
        if (!where) {
            return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })
        }
        // garantir que existe para evitar erro de filtro vazio
        const exists = await prisma.user.findUnique({ where })
        if (!exists) {
            return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
        }
        const user = await prisma.user.update({
            where,
            data: {
                name: body.name,
                matricula: body.matricula,
                cargo: body.cargo,
                localTrabalho: body.localTrabalho,
                phone: body.phone,
                role: body.role,
                profiles: body.profiles || body.role,
                active: body.active
            },
            select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                matricula: true,
                cargo: true,
                localTrabalho: true,
                phone: true,
                role: true,
                profiles: true,
                active: true,
                createdAt: true
            }
        })
        return NextResponse.json(user)
    } catch (error: any) {
        console.error('Erro ao atualizar usuario', error)
        return NextResponse.json({ error: error?.message || 'Erro ao atualizar' }, { status: 500 })
    }
}
