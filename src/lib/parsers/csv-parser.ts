import { parse } from 'csv-parse/sync'

export interface DAF607Data {
    date: Date
    amount: number
    origin: string
    description?: string
}

export function parseDAF607(csvContent: string): DAF607Data[] {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
    })

    return records.map((record: any) => ({
        date: new Date(record.Data || record.data || record.DATE),
        amount: parseFloat(record.Valor || record.valor || record.VALUE || '0'),
        origin: 'DAF607',
        description: record.Descricao || record.descricao || record.DESCRIPTION,
    }))
}
