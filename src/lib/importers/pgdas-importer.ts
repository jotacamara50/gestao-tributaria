import { prisma } from '@/lib/prisma'
import { parsePGDAS } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj, normalizePeriod, splitXmlByRoot } from './helpers'

type PGDASImportResult = {
    message: string
    count: number
    errors: Array<{ index: number; error: string; cnpj?: string; period?: string }>
}

export async function importPGDAS(xmlContent: string): Promise<PGDASImportResult | { declaration: any; parsed: any; message: string; error?: string }> {
    const documents = splitXmlByRoot(xmlContent, 'DeclaracaoPGDAS')
    if (documents.length > 1) {
        const errors: PGDASImportResult['errors'] = []
        let success = 0
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i]
            try {
                await importPGDAS(doc) // processa individualmente
                success += 1
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro desconhecido'
                errors.push({ index: i, error: msg })
            }
        }
        return { message: `PGDAS processados: ${success} de ${documents.length}`, count: success, errors }
    }

    const parsed = await parsePGDAS(xmlContent)

    const cnpj = parsed.cnpj?.trim()
    if (!cnpj) {
        throw new Error('PGDAS-D sem CNPJ identificado')
    }
    if (cnpj.replace(/\D/g, '').length !== 14) {
        throw new Error('PGDAS-D com CNPJ inválido')
    }
    const period = normalizePeriod(parsed.period)
    if (!period) {
        throw new Error('PGDAS-D sem período de apuração válido (use MM/AAAA ou AAAAMM)')
    }
    if (Number.isNaN(parsed.receitaBrutaMensal) || Number.isNaN(parsed.valorDevido)) {
        throw new Error('PGDAS-D sem valores numéricos válidos para receita ou imposto')
    }
    if (parsed.receitaBrutaMensal < 0 || parsed.valorDevido < 0) {
        throw new Error('PGDAS-D com valores negativos para receita ou imposto')
    }

    const company = await findCompanyByCnpj(cnpj)
    if (!company) {
        return { error: 'Company not found', cnpj, parsed }
    }

    // Dedup: uma PGDAS por empresa + período; se houver recibo, usa como chave adicional
    const uniqueWhere: any = parsed.recibo
        ? { companyId_type_period_receipt: { companyId: company.id, type: 'PGDAS', period, receipt: parsed.recibo } }
        : undefined

    let declaration
    if (uniqueWhere) {
        declaration = await prisma.declaration.upsert({
            where: uniqueWhere,
            update: {
                revenue: parsed.receitaBrutaMensal,
                taxDue: parsed.valorDevido,
                authenticationCode: parsed.autenticacao,
                xmlContent
            },
            create: {
                companyId: company.id,
                period,
                type: 'PGDAS',
                revenue: parsed.receitaBrutaMensal,
                taxDue: parsed.valorDevido,
                receipt: parsed.recibo,
                authenticationCode: parsed.autenticacao,
                xmlContent
            }
        })
    } else {
        await prisma.declaration.deleteMany({
            where: { companyId: company.id, period, type: 'PGDAS' }
        })
        declaration = await prisma.declaration.create({
            data: {
                companyId: company.id,
                period,
                type: 'PGDAS',
                revenue: parsed.receitaBrutaMensal,
                taxDue: parsed.valorDevido,
                receipt: parsed.recibo,
                authenticationCode: parsed.autenticacao,
                xmlContent
            }
        })
    }

    return {
        declaration,
        parsed,
        message: 'PGDAS importado com sucesso'
    }
}
