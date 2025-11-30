/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@prefeitura.gov.br' },
        update: {},
        create: {
            email: 'admin@prefeitura.gov.br',
            name: 'Administrador',
            password: hashedPassword,
            role: 'ADMIN',
            cpf: '00000000000',
            matricula: 'ADM-001',
            cargo: 'Administrador do Sistema',
            localTrabalho: 'Aurora/SP',
            phone: '11900000000',
            profiles: 'ADMIN',
            active: true
        }
    })
    console.log('Admin user:', admin.email)

    await prisma.settings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            cityName: 'Aurora',
            stateName: 'SP',
            secretaryName: 'Secretario de Fazenda',
            lawsText: 'Lei Municipal 1234/2024',
            address: 'Praca Central, 100 - Aurora/SP',
            logoUrl: null
        }
    })
    console.log('Settings created')

    const companies = [
        {
            cnpj: '12.345.678/0001-90',
            name: 'Alfa Tecnologia LTDA',
            tradeName: 'Alfa Tech',
            cnae: '6201500',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Baixo'
        },
        {
            cnpj: '98.765.432/0001-10',
            name: 'Beta Servicos Municipais',
            tradeName: 'Beta Servicos',
            cnae: '6920601',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Baixo'
        }
    ]

    for (const company of companies) {
        await prisma.company.upsert({
            where: { cnpj: company.cnpj },
            update: {},
            create: company
        })
    }
    console.log(`Companies created: ${companies.length}`)

    await prisma.iSSRate.deleteMany({})
    await prisma.iSSRate.createMany({
        data: [
            { cnae: '6201500', description: 'Desenvolvimento de software', rate: 0.05 },
            { cnae: '6920601', description: 'Consultoria contabilidade', rate: 0.02 }
        ]
    })

    const alfa = await prisma.company.findUnique({ where: { cnpj: '12.345.678/0001-90' } })
    const beta = await prisma.company.findUnique({ where: { cnpj: '98.765.432/0001-10' } })

    const histories = []
    if (alfa) {
        histories.push({
            companyId: alfa.id,
            regime: 'Simples Nacional',
            startDate: new Date('2021-01-01'),
            endDate: null,
            reason: 'Entrada no SN'
        })
    }
    if (beta) {
        histories.push({
            companyId: beta.id,
            regime: 'Simples Nacional',
            startDate: new Date('2020-01-01'),
            endDate: null,
            reason: 'Entrada no SN'
        })
    }
    if (histories.length) {
        await prisma.enquadramentoHistory.createMany({ data: histories })
    }

    console.log('Seed complete.')
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
