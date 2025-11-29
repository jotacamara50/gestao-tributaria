import { prisma } from '@/lib/prisma'
import { parseDEFIS } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj } from './helpers'

export async function importDEFIS(xmlContent: string) {
    const parsed = await parseDEFIS(xmlContent)

    if (!parsed.cnpj) {
        throw new Error('DEFIS sem CNPJ identificado')
    }
    if (!parsed.ano || Number.isNaN(parsed.ano)) {
        throw new Error('DEFIS sem ano de exercício')
    }

    const company = await findCompanyByCnpj(parsed.cnpj)
    if (!company) {
        return { error: 'Company not found', cnpj: parsed.cnpj, parsed }
    }

    const declaration = await prisma.declaration.create({
        data: {
            companyId: company.id,
            period: parsed.ano.toString(),
            type: 'DEFIS',
            revenue: parsed.receitaBrutaTotal,
            taxDue: 0,
            xmlContent
        }
    })

    return {
        declaration,
        parsed,
        message: 'DEFIS importado com sucesso'
    }
}
