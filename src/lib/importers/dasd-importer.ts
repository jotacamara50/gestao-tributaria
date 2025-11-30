import { prisma } from '@/lib/prisma'
import { findCompanyByCnpj, normalizeCNPJ } from './helpers'

function parseCSV(content: string) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (!lines.length) return []
    const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
        const cols = line.split(/[,;]/)
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
            row[h] = cols[idx]?.trim() || ''
        })
        return row
    })
}

export async function importDASD(content: string) {
    const rows = parseCSV(content)
    let imported = 0
    for (const row of rows) {
        const cnpj = normalizeCNPJ(row['cnpj'] || '')
        const period = row['periodo'] || row['period'] || row['competencia']
        if (!cnpj || !period) continue

        const company = await findCompanyByCnpj(cnpj)
        if (!company) continue

        await prisma.dasdDeclaration.upsert({
            where: {
                companyId_period: { companyId: company.id, period },
            },
            update: {
                deliveredAt: row['entregueem'] ? new Date(row['entregueem']) : undefined,
            },
            create: {
                companyId: company.id,
                period,
                deliveredAt: row['entregueem'] ? new Date(row['entregueem']) : undefined,
            }
        })
        imported += 1
    }

    return { message: `DAS-D importadas: ${imported}`, count: imported, parsedCount: rows.length, skipped: rows.length - imported }
}
