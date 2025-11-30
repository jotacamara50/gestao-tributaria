import { prisma } from '@/lib/prisma'
import { parsePGDAS } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj } from './helpers'

export async function importPGDAS(xmlContent: string) {
    const parsed = await parsePGDAS(xmlContent)

    if (!parsed.cnpj) {
        throw new Error('PGDAS-D sem CNPJ identificado')
    }
    if (!parsed.period) {
        throw new Error('PGDAS-D sem período de apuração')
    }

    const company = await findCompanyByCnpj(parsed.cnpj)
    if (!company) {
        return { error: 'Company not found', cnpj: parsed.cnpj, parsed }
    }

    // Dedup: mantém apenas uma declaração PGDAS por empresa + período (substitui retificações)
    await prisma.declaration.deleteMany({
        where: { companyId: company.id, period: parsed.period, type: 'PGDAS' }
    })

    const declaration = await prisma.declaration.create({
        data: {
            companyId: company.id,
            period: parsed.period,
            type: 'PGDAS',
            revenue: parsed.receitaBrutaMensal,
            taxDue: parsed.valorDevido,
            xmlContent
        }
    })

    return {
        declaration,
        parsed,
        message: 'PGDAS importado com sucesso'
    }
}
