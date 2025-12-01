import { prisma } from '@/lib/prisma'
import { findCompanyByCnpj, normalizeCNPJ, normalizePeriod } from './helpers'

function parseCSV(content: string) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (!lines.length) return []
    const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase())
    return lines.slice(1).map((line, idx) => {
        const cols = line.split(/[,;]/)
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
            row[h] = cols[idx]?.trim() || ''
        })
        row.__line = (idx + 2).toString()
        return row
    })
}

export async function importDASD(content: string) {
    const rows = parseCSV(content)
    let imported = 0
    const errors: Array<{ line: string; error: string; cnpj?: string; period?: string }> = []
    for (const row of rows) {
        const cnpj = normalizeCNPJ(row['cnpj'] || '')
        const periodRaw = row['periodo'] || row['period'] || row['competencia']
        const period = periodRaw ? normalizePeriod(periodRaw) : null
        if (!cnpj || cnpj.length !== 14 || !period) {
            errors.push({ line: row.__line || '', error: 'CNPJ ou competencia invalida', cnpj, period: period || undefined })
            continue
        }

        const company = await findCompanyByCnpj(cnpj)
        if (!company) {
            errors.push({ line: row.__line || '', error: 'Empresa nao encontrada', cnpj })
            continue
        }

        const municipioIncidencia = row['municipio'] || row['municipio_incidencia'] || undefined
        const regimeEspecial = row['regime_especial'] || row['regime'] || undefined
        const atividadeContabil = (row['atividade_contabil'] || '').toLowerCase() === 'true' || row['atividade_contabil'] === '1'
        const receitaDeclarada = parseFloat(row['receita_declarada'] || row['receita'] || '0')
        const receitaCaixa = parseFloat(row['receita_caixa'] || '0')

        await prisma.dasdDeclaration.upsert({
            where: {
                companyId_period: { companyId: company.id, period },
            },
            update: {
                deliveredAt: row['entregueem'] ? new Date(row['entregueem']) : undefined,
                municipioIncidencia,
                regimeEspecial,
                atividadeContabil: atividadeContabil || undefined,
                receitaDeclarada: isNaN(receitaDeclarada) ? undefined : receitaDeclarada,
                receitaCaixa: isNaN(receitaCaixa) ? undefined : receitaCaixa,
            },
            create: {
                companyId: company.id,
                period,
                deliveredAt: row['entregueem'] ? new Date(row['entregueem']) : undefined,
                municipioIncidencia,
                regimeEspecial,
                atividadeContabil: atividadeContabil || undefined,
                receitaDeclarada: isNaN(receitaDeclarada) ? undefined : receitaDeclarada,
                receitaCaixa: isNaN(receitaCaixa) ? undefined : receitaCaixa,
            }
        })
        imported += 1
    }

    return { message: `DAS-D importadas: ${imported}`, count: imported, parsedCount: rows.length, skipped: rows.length - imported, errors }
}
