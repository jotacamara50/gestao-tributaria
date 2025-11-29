/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse } from 'csv-parse/sync'

export interface DAF607Data {
    date: Date
    amount: number
    origin: string
    description?: string
    cnpj?: string
}

export function parseDAF607(csvContent: string): DAF607Data[] {
    // Tenta CSV/; antes de cair para CNAB/posicional
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ';',
        })

        if (Array.isArray(records) && records.length) {
            return records.map((record: any) => ({
                date: new Date(record.Data || record.data || record.DATE),
                amount: parseFloat(record.Valor || record.valor || record.VALUE || '0'),
                origin: 'DAF607',
                description: record.Descricao || record.descricao || record.DESCRIPTION,
                cnpj: (record.CNPJ || record.cnpj || '').replace(/\D/g, '') || undefined,
            }))
        }
    } catch {
        // continua para parser CNAB/posicional
    }

    const linhas = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const detalhes = linhas.filter(l => l.startsWith('1') || l.startsWith('3'))

    return detalhes.map((linha) => {
        // CNAB 240 BB: CNPJ costuma estar em 19-32, valor em 120-134 (2 casas decimais)
        const cnpj = linha.slice(18, 32).replace(/\D/g, '')
        const valorStr = linha.slice(119, 134) || '0'
        const amount = parseInt(valorStr, 10) / 100 || 0

        // Data tentativa: posições 151-158 (AAAAMMDD) ou use hoje
        const dataStr = linha.slice(150, 158)
        let date = new Date()
        if (dataStr && dataStr.length === 8) {
            const ano = parseInt(dataStr.slice(0, 4), 10)
            const mes = parseInt(dataStr.slice(4, 6), 10) - 1
            const dia = parseInt(dataStr.slice(6, 8), 10)
            date = new Date(ano, mes, dia)
        }

        return {
            date,
            amount,
            origin: 'DAF607',
            description: 'CNAB DAF607',
            cnpj: cnpj || undefined
        }
    })
}
