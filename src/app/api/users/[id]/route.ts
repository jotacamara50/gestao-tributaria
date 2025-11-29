/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json()
        const user = await prisma.user.update({
            where: { id: params.id },
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
