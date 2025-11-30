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

    console.log('Seed complete (admin user + settings).')
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
