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

    if (!sanitized.length) {
        throw new Error('Arquivo DAF607 vazio ou inválido')
    }

    // Deduplicar por chave natural (data + valor + cnpj/origem)
    const minDate = sanitized.reduce((d, item) => (item.date < d ? item.date : d), sanitized[0].date)
    const maxDate = sanitized.reduce((d, item) => (item.date > d ? item.date : d), sanitized[0].date)
    const existentes = await prisma.repasse.findMany({
        where: { date: { gte: minDate, lte: maxDate } },
        select: { date: true, amount: true, origin: true, description: true }
    })

    const key = (date: Date, amount: number, cnpj?: string | null, origin?: string | null) => {
        const d = date.toISOString().slice(0, 10)
        const c = (cnpj || origin || '').replace(/\D/g, '')
        return `${d}|${amount.toFixed(2)}|${c}`
    }

    const existentesKeys = new Set(
        existentes.map(e => key(e.date, e.amount, (e.origin || e.description || '').replace(/\D/g, ''), e.origin))
    )

    const novos = sanitized.filter(item => {
        const k = key(item.date, item.amount, item.cnpj, item.origin)
        return !existentesKeys.has(k)
    })

    const repasses = novos.length
        ? await prisma.repasse.createMany({
            data: novos.map(item => ({
                date: item.date,
                amount: item.amount,
                origin: item.origin || (item.cnpj ? `DAF607 ${item.cnpj}` : 'DAF607'),
                description: item.description ?? (item.cnpj ? `Repasse ${item.cnpj}` : undefined)
            }))
        })
        : { count: 0 }

    return {
        count: repasses.count,
        parsedCount: sanitized.length,
        skipped: parsed.length - sanitized.length + (sanitized.length - novos.length),
        message: `${repasses.count} repasses importados (deduplicados ${sanitized.length - novos.length})`
    }
}
