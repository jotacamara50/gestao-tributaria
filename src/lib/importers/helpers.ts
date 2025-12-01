import { prisma } from '@/lib/prisma'

export function normalizeCNPJ(raw: string): string {
    return raw.replace(/\D/g, '')
}

export function formatCNPJ(cnpj: string): string {
    const digits = normalizeCNPJ(cnpj)
    if (digits.length !== 14) return cnpj
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function normalizePeriod(raw: string): string | null {
    const value = raw?.trim()
    if (!value) return null

    // AAAAMM
    if (/^\d{6}$/.test(value)) {
        const year = value.slice(0, 4)
        const month = value.slice(4)
        return `${month}/${year}`
    }

    // AAAA-MM
    if (/^\d{4}-\d{2}$/.test(value)) {
        const [year, month] = value.split('-')
        return `${month}/${year}`
    }

    // MM/AAAA
    if (/^\d{2}\/\d{4}$/.test(value)) {
        return value
    }

    return null
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

/**
 * Divide um conteúdo com múltiplos XML em documentos individuais, usando a tag raiz como marcador.
 * Útil para lotes de PGDAS/NFSe em um único arquivo.
 */
export function splitXmlByRoot(content: string, rootTag: string): string[] {
    const matches = [...content.matchAll(new RegExp(`<${rootTag}[^>]*>`, 'ig'))].map(m => m.index || 0)
    if (!matches.length) return [content]
    const parts: string[] = []
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i]
        const end = i === matches.length - 1 ? content.length : matches[i + 1]
        parts.push(content.slice(start, end).trim())
    }
    return parts.filter(Boolean)
}
