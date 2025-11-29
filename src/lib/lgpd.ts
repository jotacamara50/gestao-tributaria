import { prisma } from '@/lib/prisma'

export interface AnonymizeResult {
    companiesSanitized: number
    partnersSanitized: number
}

/**
 * Remove dados pessoais de socios/contribuintes que nao precisam mais ser mantidos.
 * Criterio: empresas baixadas/inativas com ultima atualizacao anterior ao cutoff em anos.
 */
export async function anonymizeExpiredData(years: number = 5): Promise<AnonymizeResult> {
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - years)

    const companies = await prisma.company.findMany({
        where: {
            status: { in: ['Baixada', 'Inativa', 'Encerrada'] as any },
            updatedAt: { lt: cutoff }
        },
        select: { id: true }
    })

    const companyIds = companies.map(c => c.id)

    if (companyIds.length === 0) {
        return { companiesSanitized: 0, partnersSanitized: 0 }
    }

    const partnersResult = await prisma.partner.updateMany({
        where: { companyId: { in: companyIds } },
        data: {
            cpf: null,
            name: 'ANONYMIZED',
            role: 'ANONYMIZED',
            endDate: new Date()
        }
    })

    const companiesResult = await prisma.company.updateMany({
        where: { id: { in: companyIds } },
        data: {
            email: null,
            phone: null,
            address: null,
            secondaryCnaes: null
        }
    })

    return {
        companiesSanitized: companiesResult.count,
        partnersSanitized: partnersResult.count
    }
}
