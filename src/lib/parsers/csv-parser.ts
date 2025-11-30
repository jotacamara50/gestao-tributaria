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
    // Tenta CSV (delimitador ; ou ,) antes de cair para CNAB/posicional
    try {
        const firstLine = csvContent.split(/\r?\n/)[0] || ''
        const delimiter = firstLine.includes(';') ? ';' : ','
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter,
            relax_column_count: true,
        })

        if (Array.isArray(records) && records.length) {
            return records.map((record: any) => ({
                date: parseCompetencia(record.Competencia || record.competencia || record.Data || record.data || record.DATE),
                amount: parseFloat((record.Valor || record.valor || record.VALUE || '').toString().replace(/\./g, '').replace(',', '.')) || 0,
                origin: 'DAF607',
                description: record.Descricao || record.descricao || record.DESCRIPTION,
                cnpj: (record.CNPJ || record.cnpj || record.cnpjTomador || '').replace(/\D/g, '') || undefined,
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
            origin: cnpj ? `DAF607 ${cnpj}` : 'DAF607',
            description: `CNAB DAF607${cnpj ? ' ' + cnpj : ''}`,
            cnpj: cnpj || undefined
        }
    })
}

function parseCompetencia(raw?: string): Date {
    if (!raw) return new Date(NaN)
    const clean = raw.toString().trim()
    // formatos: AAAAMM, AAAA-MM, DD/MM/AAAA
    if (/^\d{6}$/.test(clean)) {
        const year = parseInt(clean.slice(0, 4), 10)
        const month = parseInt(clean.slice(4, 6), 10) - 1
        return new Date(year, month, 1)
    }
    if (/^\d{4}-\d{2}$/.test(clean)) {
        const [y, m] = clean.split('-')
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split('/').map((v) => parseInt(v, 10))
        return new Date(y, m - 1, d)
    }
    const date = new Date(clean)
    return date
}
