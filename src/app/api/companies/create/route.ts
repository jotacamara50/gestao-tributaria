import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { auth } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        
        const {
            cnpj,
            name,
            tradeName,
            cnae,
            secondaryCnaes,
            regime,
            status,
            address,
            phone,
            email,
        } = body

        // Validações básicas
        if (!cnpj || !name || !cnae) {
            return NextResponse.json({ 
                error: 'CNPJ, Nome e CNAE são obrigatórios' 
            }, { status: 400 })
        }

        // Verifica se CNPJ já existe
        const existingCompany = await prisma.company.findUnique({
            where: { cnpj }
        })

        if (existingCompany) {
            return NextResponse.json({ 
                error: 'CNPJ já cadastrado no sistema' 
            }, { status: 409 })
        }

        // Cria a empresa
        const company = await prisma.company.create({
            data: {
                cnpj,
                name,
                tradeName,
                cnae,
                secondaryCnaes,
                regime: regime || 'Simples Nacional',
                status: status || 'Ativo',
                riskLevel: 'Baixo', // Será calculado posteriormente
                address,
                phone,
                email,
            }
        })

        // Registra log de auditoria
        await logAction(
            'CREATE_COMPANY',
            `Company:${company.id}`,
            `Cadastrou empresa ${name} (${cnpj})`,
            null,
            {
                id: company.id,
                cnpj: company.cnpj,
                name: company.name,
                createdAt: company.createdAt
            }
        )

        return NextResponse.json({ 
            success: true,
            company 
        }, { status: 201 })

    } catch (error: any) {
        console.error('[API] Error creating company:', error)
        return NextResponse.json({ 
            error: 'Erro ao cadastrar contribuinte',
            details: error.message 
        }, { status: 500 })
    }
}
