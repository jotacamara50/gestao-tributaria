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

export async function importGuias(content: string) {
    const rows = parseCSV(content)
    let imported = 0

    for (const row of rows) {
        const cnpj = normalizeCNPJ(row['cnpj'] || row['companycnpj'] || '')
        if (!cnpj) continue
        const company = await findCompanyByCnpj(cnpj)
        if (!company) continue

        const numero = row['numero'] || row['guia'] || row['identificador']
        const periodo = row['periodo'] || row['competencia']
        const dataEmissao = row['data_emissao'] || row['dataemissao']
        const vencimento = row['vencimento'] || row['data_vencimento']
        const situacao = row['situacao'] || 'Em Aberto'
        const valorTotal = parseFloat(row['valor_total'] || row['valortotal'] || '0')
        const valorPrincipal = parseFloat(row['valor_principal'] || row['valorprincipal'] || '0')
        const valorMulta = parseFloat(row['valor_multa'] || row['valormulta'] || '0')
        const valorJuros = parseFloat(row['valor_juros'] || row['valorjuros'] || '0')
        const pagoEm = row['pago_em'] || row['pagoem']
        const banco = row['banco'] || undefined
        const agencia = row['agencia'] || undefined
        const valorPago = parseFloat(row['valor_pago'] || row['valorpago'] || '0')

        if (!numero || !periodo || !dataEmissao || !vencimento) continue

        const guia = await prisma.guia.upsert({
            where: { numero },
            update: {
                companyId: company.id,
                periodo,
                dataEmissao: new Date(dataEmissao),
                vencimento: new Date(vencimento),
                situacao,
                valorTotal,
                valorPrincipal,
                valorMulta,
                valorJuros,
                pagoEm: pagoEm ? new Date(pagoEm) : undefined,
                banco,
                agencia,
                valorPago: valorPago || undefined,
            },
            create: {
                companyId: company.id,
                numero,
                periodo,
                dataEmissao: new Date(dataEmissao),
                vencimento: new Date(vencimento),
                situacao,
                valorTotal,
                valorPrincipal,
                valorMulta,
                valorJuros,
                pagoEm: pagoEm ? new Date(pagoEm) : undefined,
                banco,
                agencia,
                valorPago: valorPago || undefined,
            }
        })

        // tributos (um por linha) opcional
        const tributo = row['tributo'] || row['tipo']
        const tPrincipal = parseFloat(row['tributo_valor_principal'] || row['tributovalorprincipal'] || '0')
        const tJuros = parseFloat(row['tributo_valor_juros'] || row['tributovalorjuros'] || '0')
        const tMulta = parseFloat(row['tributo_valor_multa'] || row['tributovalormulta'] || '0')
        if (tributo) {
            await prisma.guiaTributo.create({
                data: {
                    guiaId: guia.id,
                    tipo: tributo,
                    valorPrincipal: tPrincipal,
                    valorJuros: tJuros,
                    valorMulta: tMulta,
                }
            })
        }

        imported += 1
    }

    return { message: `Guias processadas: ${imported}` }
}
