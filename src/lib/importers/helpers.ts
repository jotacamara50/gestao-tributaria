import { prisma } from '@/lib/prisma'

export function normalizeCNPJ(raw: string): string {
    return raw.replace(/\D/g, '')
}

export function formatCNPJ(cnpj: string): string {
    const digits = normalizeCNPJ(cnpj)
    if (digits.length !== 14) return cnpj
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export async function findCompanyByCnpj(raw: string) {
    const clean = normalizeCNPJ(raw)
    const formatted = formatCNPJ(clean)

    return prisma.company.findFirst({
        where: {
            OR: [{ cnpj: clean }, { cnpj: formatted }]
        }
    })
}
