/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
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
    return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        if (!body.email || !body.password || !body.cpf || !body.name) {
            return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
        }
        const hashedPassword = await bcrypt.hash(body.password, 10)

        const user = await prisma.user.create({
            data: {
                email: body.email,
                password: hashedPassword,
                name: body.name,
                cpf: body.cpf,
                matricula: body.matricula || null,
                cargo: body.cargo || null,
                localTrabalho: body.localTrabalho || null,
                phone: body.phone || null,
                role: body.role || 'AUDITOR',
                profiles: body.profiles || body.role || 'AUDITOR',
                active: body.active ?? true
            }
        })

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            matricula: user.matricula,
            cargo: user.cargo,
            localTrabalho: user.localTrabalho,
            phone: user.phone,
            role: user.role,
            profiles: user.profiles,
            active: user.active
        }, { status: 201 })
    } catch (error: any) {
        console.error('Erro ao criar usuario', error)
        return NextResponse.json({ error: error?.message || 'Erro ao criar usuario' }, { status: 500 })
    }
}
