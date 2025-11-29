import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

type DTEMessageRecord = {
    cnpj: string
    sentAt: Date
    codigo: string
    tipoRegistro: string
}

const codigoPorTipo: Record<string, string> = {
    intimacao: '0015',
    autoInfracao: '0018',
    notificacao: '0010',
    aviso: '0009',
    lembrete: '0008'
}

function pad(value: string, size: number, filler = ' ') {
    if (value.length >= size) return value.slice(0, size)
    return value + filler.repeat(size - value.length)
}

export class DTELayoutGenerator {
    static buildRegistro(message: DTEMessageRecord) {
        // Layout simples posicional: tipo(3) + cnpj(14) + data(8) + codMsg(4)
        const tipo = pad(message.tipoRegistro, 3, '0')
        const cnpj = pad(message.cnpj.replace(/\D/g, ''), 14, '0')
        const data = format(message.sentAt, 'yyyyMMdd')
        const cod = pad(message.codigo, 4, '0')
        return `${tipo}${cnpj}${data}${cod}`
    }
}

export type BatchFormat = 'txt' | 'xml'

export interface DTEBatchOptions {
    format?: BatchFormat
    companyId?: string
    startDate?: Date
    endDate?: Date
    unreadOnly?: boolean
    limit?: number
}

interface BatchResult {
    filename: string
    content: string
    count: number
}

export async function generateDTEBatch(options: DTEBatchOptions = {}): Promise<BatchResult> {
    const formatType: BatchFormat = options.format || 'txt'
    const generatedAt = new Date()

    const where: any = {}
    if (options.companyId) where.companyId = options.companyId
    if (options.startDate || options.endDate) {
        where.sentAt = {}
        if (options.startDate) where.sentAt.gte = options.startDate
        if (options.endDate) where.sentAt.lte = options.endDate
    }
    if (options.unreadOnly) where.readAt = null

    const messages = await prisma.dTEMessage.findMany({
        where,
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    cnpj: true
                }
            }
        },
        orderBy: { sentAt: 'desc' },
        take: options.limit || 500
    })

    const registros = messages.map((msg) => {
        const codigo = codigoPorTipo[msg.type] || '0000'
        return DTELayoutGenerator.buildRegistro({
            cnpj: msg.company.cnpj,
            sentAt: msg.sentAt,
            codigo,
            tipoRegistro: '001' // header/tipo mensagem
        })
    })

    let content = ''
    if (formatType === 'xml') {
        const items = registros.map(r => `<Registro>${r}</Registro>`).join('\n')
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<LoteDTE geradoEm="${format(generatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')}">\n${items}\n</LoteDTE>`
    } else {
        content = registros.join('\n')
    }

    const filename = `DTE_LOTE_${format(generatedAt, 'yyyyMMdd_HHmmss')}.${formatType}`

    return {
        filename,
        content,
        count: messages.length
    }
}
