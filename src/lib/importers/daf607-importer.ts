import { prisma } from '@/lib/prisma'
import { parseDAF607 } from '@/lib/parsers/csv-parser'

export async function importDAF607(fileContent: string) {
    const parsed = parseDAF607(fileContent)

    if (!parsed.length) {
        throw new Error('Arquivo DAF607 vazio ou inválido')
    }

    const sanitized = parsed.filter(item => {
        const dateOk = item.date instanceof Date && !Number.isNaN(item.date.getTime())
        const amountOk = !Number.isNaN(item.amount)
        return dateOk && amountOk
    })

    const repasses = await prisma.repasse.createMany({
        data: sanitized.map(item => ({
            date: item.date,
            amount: item.amount,
            origin: item.origin || 'DAF607',
            description: item.description ?? (item.cnpj ? `Repasse ${item.cnpj}` : undefined)
        }))
    })

    return {
        count: repasses.count,
        parsedCount: sanitized.length,
        skipped: parsed.length - sanitized.length,
        message: `${repasses.count} repasses importados`
    }
}
