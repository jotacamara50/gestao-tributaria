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

export async function importParcelamentos(content: string) {
    const rows = parseCSV(content)
    let imported = 0

    for (const row of rows) {
        const cnpj = normalizeCNPJ(row['cnpj'] || row['companycnpj'] || '')
        if (!cnpj) continue
        const company = await findCompanyByCnpj(cnpj)
        if (!company) continue

        const numero = row['numero'] || row['parcelamento']
        if (!numero) continue

        const valorTotal = parseFloat(row['valor_total'] || row['valortotal'] || row['valor'] || '0')
        const qtdParcelas = parseInt(row['qtd_parcelas'] || row['quantidadeparcelas'] || '0', 10)
        const situacao = row['situacao'] || 'Ativo'
        const tipo = row['tipo'] || null
        const dataPedido = row['data_pedido'] || row['datapedido']
        const dataSituacao = row['data_situacao'] || row['datasituacao']

        const parcelamento = await prisma.parcelamento.upsert({
            where: { numero },
            update: {
                companyId: company.id,
                valorTotal,
                quantidadeParcelas: qtdParcelas || undefined,
                situacao,
                tipo: tipo || undefined,
                dataPedido: dataPedido ? new Date(dataPedido) : new Date(),
                dataSituacao: dataSituacao ? new Date(dataSituacao) : undefined,
            },
            create: {
                companyId: company.id,
                numero,
                valorTotal,
                quantidadeParcelas: qtdParcelas || 0,
                situacao,
                tipo: tipo || undefined,
                dataPedido: dataPedido ? new Date(dataPedido) : new Date(),
                dataSituacao: dataSituacao ? new Date(dataSituacao) : undefined,
            }
        })

        // parcelas
        const parcelaNumero = parseInt(row['parcela_numero'] || row['parcelanumero'] || '0', 10)
        const parcelaVenc = row['parcela_vencimento'] || row['parcelavencimento']
        const parcelaValor = parseFloat(row['parcela_valor'] || row['parcelavalor'] || '0')
        const parcelaSituacao = row['parcela_situacao'] || row['parcelasituacao'] || 'Pendente'
        const parcelaPagoEm = row['parcela_pago_em'] || row['parcelapagoem']
        const parcelaValorPago = parseFloat(row['parcela_valor_pago'] || row['parcelavalorpago'] || '0')

        if (parcelaNumero && parcelaVenc) {
            await prisma.parcela.upsert({
                where: { id: `${parcelamento.id}-${parcelaNumero}` },
                update: {
                    parcelamentoId: parcelamento.id,
                    numero: parcelaNumero,
                    vencimento: new Date(parcelaVenc),
                    valor: parcelaValor,
                    situacao: parcelaSituacao,
                    pagoEm: parcelaPagoEm ? new Date(parcelaPagoEm) : undefined,
                    valorPago: parcelaValorPago || undefined,
                },
                create: {
                    id: `${parcelamento.id}-${parcelaNumero}`,
                    parcelamentoId: parcelamento.id,
                    numero: parcelaNumero,
                    vencimento: new Date(parcelaVenc),
                    valor: parcelaValor,
                    situacao: parcelaSituacao,
                    pagoEm: parcelaPagoEm ? new Date(parcelaPagoEm) : undefined,
                    valorPago: parcelaValorPago || undefined,
                }
            })
        }

        imported += 1
    }

    return { message: `Parcelamentos processados: ${imported}` }
}
