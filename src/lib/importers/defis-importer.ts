import { prisma } from '@/lib/prisma'
import { parseDEFIS } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj, splitXmlByRoot } from './helpers'

type DEFISImportResult = {
    message: string
    count: number
    errors: Array<{ index: number; error: string; cnpj?: string; ano?: number }>
}

export async function importDEFIS(xmlContent: string): Promise<DEFISImportResult | { declaration: any; parsed: any; message: string; error?: string }> {
    const documents = splitXmlByRoot(xmlContent, 'Defis')
    if (documents.length > 1) {
        const errors: DEFISImportResult['errors'] = []
        let success = 0
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i]
            try {
                await importDEFIS(doc)
                success += 1
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro desconhecido'
                errors.push({ index: i, error: msg })
            }
        }
        return { message: `DEFIS processadas: ${success} de ${documents.length}`, count: success, errors }
    }

    const parsed = await parseDEFIS(xmlContent)

    if (!parsed.cnpj) {
        throw new Error('DEFIS sem CNPJ identificado')
    }
    if (parsed.cnpj.replace(/\D/g, '').length !== 14) {
        throw new Error('DEFIS com CNPJ inválido')
    }
    if (!parsed.ano || Number.isNaN(parsed.ano)) {
        throw new Error('DEFIS sem ano de exercício')
    }
    const anoAtual = new Date().getFullYear()
    if (parsed.ano < 2000 || parsed.ano > anoAtual + 1) {
        throw new Error('DEFIS com ano fora do intervalo esperado')
    }
    if (parsed.receitaBrutaTotal < 0) {
        throw new Error('DEFIS com receita negativa')
    }

    const company = await findCompanyByCnpj(parsed.cnpj)
    if (!company) {
        return { error: 'Company not found', cnpj: parsed.cnpj, parsed }
    }

    // Dedup: uma DEFIS por empresa+exercício; se tiver recibo, usar como chave
    const period = parsed.ano.toString()
    const uniqueWhere: any = parsed.recibo
        ? { companyId_type_period_receipt: { companyId: company.id, type: 'DEFIS', period, receipt: parsed.recibo } }
        : undefined

    let declaration
    if (uniqueWhere) {
        declaration = await prisma.declaration.upsert({
            where: uniqueWhere,
            update: {
                revenue: parsed.receitaBrutaTotal,
                authenticationCode: parsed.autenticacao,
                xmlContent
            },
            create: {
                companyId: company.id,
                period,
                type: 'DEFIS',
                revenue: parsed.receitaBrutaTotal,
                taxDue: 0,
                receipt: parsed.recibo,
                authenticationCode: parsed.autenticacao,
                xmlContent
            }
        })
    } else {
        await prisma.declaration.deleteMany({
            where: { companyId: company.id, period, type: 'DEFIS' }
        })
        declaration = await prisma.declaration.create({
            data: {
                companyId: company.id,
                period,
                type: 'DEFIS',
                revenue: parsed.receitaBrutaTotal,
                taxDue: 0,
                receipt: parsed.recibo,
                authenticationCode: parsed.autenticacao,
                xmlContent
            }
        })
    }

    return {
        declaration,
        parsed,
        message: 'DEFIS importado com sucesso'
    }
}
