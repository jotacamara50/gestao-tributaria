import xml2js from 'xml2js'

export interface PGDASData {
    cnpj: string
    period: string
    revenue: number
    taxDue: number
}

export async function parsePGDAS(xmlContent: string): Promise<PGDASData> {
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(xmlContent)

    // This is a simplified parser - real PGDAS XML structure is complex
    // For POC, we'll extract basic fields
    const pgdas = result.PGDAS || result.pgdas

    return {
        cnpj: pgdas.CNPJ?.[0] || pgdas.cnpj?.[0] || '',
        period: pgdas.Periodo?.[0] || pgdas.periodo?.[0] || '',
        revenue: parseFloat(pgdas.ReceitaBruta?.[0] || pgdas.receitaBruta?.[0] || '0'),
        taxDue: parseFloat(pgdas.ValorDevido?.[0] || pgdas.valorDevido?.[0] || '0'),
    }
}

export interface NFSeData {
    number: string
    series?: string
    issueDate: Date
    value: number
    serviceCode?: string
    tomadorCnpj?: string
    prestadorCnpj: string
}

export async function parseNFSe(xmlContent: string): Promise<NFSeData> {
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(xmlContent)

    // Simplified NFS-e parser - real structure varies by municipality
    const nfse = result.NFSe || result.nfse || result.CompNfse?.Nfse || {}
    const infNfse = nfse.InfNfse?.[0] || nfse.infNfse?.[0] || {}

    return {
        number: infNfse.Numero?.[0] || infNfse.numero?.[0] || '',
        series: infNfse.Serie?.[0] || infNfse.serie?.[0],
        issueDate: new Date(infNfse.DataEmissao?.[0] || infNfse.dataEmissao?.[0] || new Date()),
        value: parseFloat(infNfse.ValorServicos?.[0] || infNfse.valorServicos?.[0] || '0'),
        serviceCode: infNfse.CodigoServico?.[0] || infNfse.codigoServico?.[0],
        tomadorCnpj: infNfse.TomadorCnpj?.[0] || infNfse.tomadorCnpj?.[0],
        prestadorCnpj: infNfse.PrestadorCnpj?.[0] || infNfse.prestadorCnpj?.[0] || '',
    }
}
