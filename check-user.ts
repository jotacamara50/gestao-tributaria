import { prisma } from './src/lib/prisma'
import bcrypt from 'bcryptjs'

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@prefeitura.gov.br' }
    })

    console.log('User exists:', !!user)

    if (user) {
        console.log('User ID:', user.id)
        console.log('User email:', user.email)
        console.log('Password hash (first 20 chars):', user.password.substring(0, 20))

        // Test password
        const isValid = await bcrypt.compare('admin123', user.password)
        console.log('Password "admin123" is valid:', isValid)
    }

    await prisma.$disconnect()
}

checkUser()
