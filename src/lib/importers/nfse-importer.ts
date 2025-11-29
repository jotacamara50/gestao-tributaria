import { prisma } from '@/lib/prisma'
import { parseNFSe } from '@/lib/parsers/xml-parser'
import { findCompanyByCnpj } from './helpers'

export async function importNFSe(xmlContent: string) {
    const parsed = await parseNFSe(xmlContent)

    if (!parsed.prestadorCnpj) {
        throw new Error('NFS-e sem CNPJ do prestador')
    }
    if (!parsed.numero) {
        throw new Error('NFS-e sem número identificado')
    }

    const company = await findCompanyByCnpj(parsed.prestadorCnpj)
    if (!company) {
        return { error: 'Company not found', cnpj: parsed.prestadorCnpj, parsed }
    }

    const invoice = await prisma.invoice.create({
        data: {
            companyId: company.id,
            number: parsed.numero,
            series: undefined,
            issueDate: parsed.dataEmissao,
            value: parsed.valorServicos,
            serviceCode: parsed.itemListaServico,
            tomadorCnpj: parsed.tomadorCnpj,
            xmlContent
        }
    })

    return {
        invoice,
        parsed,
        message: 'NFS-e importada com sucesso'
    }
}
