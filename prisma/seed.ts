import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@prefeitura.gov.br' },
        update: {},
        create: {
            email: 'admin@prefeitura.gov.br',
            name: 'Administrador',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log('✅ Created admin user:', admin.email)

    // Create settings
    await prisma.settings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            cityName: 'Município Exemplo',
            secretaryName: 'Secretário de Fazenda',
            lawsText: 'Lei Municipal nº 1234/2024',
        },
    })

    console.log('✅ Created settings')

    // Seed companies from existing mock data
    const companies = [
        {
            cnpj: '12.345.678/0001-90',
            name: 'Padaria do João Ltda',
            tradeName: 'Padaria do João',
            cnae: '47.21-1-02',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Baixo',
        },
        {
            cnpj: '98.765.432/0001-10',
            name: 'Tech Solutions Informática',
            tradeName: 'Tech Solutions',
            cnae: '62.01-5-01',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Alto',
        },
        {
            cnpj: '45.678.901/0001-23',
            name: 'Construtora Silva',
            tradeName: 'Silva Construções',
            cnae: '41.20-4-00',
            regime: 'Lucro Presumido',
            status: 'Bloqueado',
            riskLevel: 'Médio',
        },
        {
            cnpj: '11.222.333/0001-44',
            name: 'Mercadinho da Esquina',
            tradeName: 'Mercadinho',
            cnae: '47.12-1-00',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Baixo',
        },
        {
            cnpj: '55.666.777/0001-88',
            name: 'Consultoria Financeira Alpha',
            tradeName: 'Alpha Consultoria',
            cnae: '66.19-3-02',
            regime: 'Simples Nacional',
            status: 'Ativo',
            riskLevel: 'Alto',
        },
    ]

    for (const company of companies) {
        await prisma.company.upsert({
            where: { cnpj: company.cnpj },
            update: {},
            create: company,
        })
    }

    console.log(`✅ Created ${companies.length} companies`)

    // Create some sample declarations
    const techCompany = await prisma.company.findUnique({
        where: { cnpj: '98.765.432/0001-10' },
    })

    if (techCompany) {
        await prisma.declaration.create({
            data: {
                companyId: techCompany.id,
                period: '10/2025',
                type: 'PGDAS',
                revenue: 12000,
                taxDue: 1200,
            },
        })

        // Create invoices that don't match
        await prisma.invoice.createMany({
            data: [
                {
                    companyId: techCompany.id,
                    number: '001',
                    issueDate: new Date('2025-10-05'),
                    value: 15000,
                    serviceCode: '01.01',
                },
                {
                    companyId: techCompany.id,
                    number: '002',
                    issueDate: new Date('2025-10-15'),
                    value: 20000,
                    serviceCode: '01.01',
                },
            ],
        })

        // Create divergence
        await prisma.divergence.create({
            data: {
                companyId: techCompany.id,
                type: 'Omissão de Receita',
                description: 'NFS-e emitidas somam R$ 35.000, mas PGDAS declara R$ 12.000',
                value: 23000,
                status: 'Pendente',
            },
        })

        console.log('✅ Created sample data for Tech Solutions')
    }

    console.log('🎉 Seeding complete!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
