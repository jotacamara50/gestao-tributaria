import { prisma } from '@/lib/prisma'
import { parseNFSe } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj, normalizeCNPJ, splitXmlByRoot } from './helpers'

export async function importNFSe(xmlContent: string) {
    const documents = splitXmlByRoot(xmlContent, 'CompNfse')
    if (documents.length > 1) {
        const errors: Array<{ index: number; error: string; cnpj?: string }> = []
        let success = 0
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i]
            try {
                await importNFSe(doc)
                success += 1
            } catch (err) {
                errors.push({ index: i, error: err instanceof Error ? err.message : 'Erro desconhecido' })
            }
        }
        return {
            message: `NFSe processadas: ${success} de ${documents.length}`,
            count: success,
            errors
        }
    }

    const parsed = await parseNFSe(xmlContent)

    if (!parsed.prestadorCnpj) {
        throw new Error('NFS-e sem CNPJ do prestador')
    }
    if (!parsed.numero) {
        throw new Error('NFS-e sem número identificado')
    }
    if (!parsed.dataEmissao || Number.isNaN(new Date(parsed.dataEmissao).getTime())) {
        throw new Error('NFS-e sem data de emissão válida')
    }
    if (parsed.valorServicos <= 0) {
        throw new Error('NFS-e com valor de serviços inválido')
    }
    if ((parsed.competencia || '').length === 0) {
        throw new Error('NFS-e sem competência')
    }
    if (normalizeCNPJ(parsed.prestadorCnpj).length !== 14) {
        throw new Error('NFS-e com CNPJ do prestador inválido')
    }

    const cnpj = normalizeCNPJ(parsed.prestadorCnpj)
    const company = await findCompanyByCnpj(cnpj)
    if (!company) {
        return { error: 'Company not found', cnpj, parsed }
    }

    const data = {
        companyId: company.id,
        number: parsed.numero,
        series: undefined,
        issueDate: parsed.dataEmissao,
        value: parsed.valorServicos,
        serviceCode: parsed.itemListaServico,
        tomadorCnpj: parsed.tomadorCnpj,
        municipioPrestacao: parsed.municipioPrestacao || parsed.codigoMunicipio || null,
        municipioTomador: parsed.municipioTomador || null,
        issRetido: parsed.issRetido,
        valorIssRetido: parsed.valorIssRetido ?? (parsed.issRetido ? parsed.valorIss : undefined),
        aliquotaIss: parsed.aliquota || undefined,
        codigoVerificacao: parsed.codigoVerificacao || undefined,
        xmlContent
    }

    // Dedup: NFSe única por empresa + número; se existir com o mesmo número e outro código, atualiza
    const invoice = await prisma.invoice.upsert({
        where: { number_companyId: { number: parsed.numero, companyId: company.id } },
        update: data,
        create: data
    })

    return {
        invoice,
        parsed,
        message: 'NFS-e importada com sucesso'
    }
}
