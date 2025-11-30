/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

type DTEMessageRecord = {
    cnpj: string
    sentAt: Date
    codigo: string
    content: string
}

const codigoPorTipo: Record<string, string> = {
    intimacao: '0015', // Modelo oficial de intimacao
    autoInfracao: '0018', // Modelo oficial de auto de infracao
    notificacao: '0019', // Modelo oficial de notificacao
    aviso: '0032', // Avisos genericos / lembretes
    lembrete: '0032'
}

function padExact(value: string, size: number, filler = ' ') {
    const len = Buffer.from(value, 'ascii').length
    if (len >= size) return value.slice(0, size)
    return value + filler.repeat(size - len)
}

function padLeft(value: string, size: number, filler = '0') {
    const len = Buffer.from(value, 'ascii').length
    if (len >= size) return value.slice(len - size)
    return filler.repeat(size - len) + value
}

function sanitizeContent(text: string) {
    const normalized = text
        .replace(/[\t\r\n]+/g, ' ') // remove quebras e tabs
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^\x20-\x7E]/g, '') // limita a ASCII imprimivel
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ') // remove pontuacao e caracteres especiais
        .replace(/\s+/g, ' ') // colapsa espacos
        .trim()
    return normalized
}

const LINE_SIZE = 100

function buildHeader(date: Date, total: number) {
    const base = `HDRDTE${format(date, 'yyyyMMdd')}${padLeft(total.toString(), 5, '0')}`
    return padExact(base, LINE_SIZE, ' ')
}

function buildTrailer(total: number) {
    const base = `TRAILER${padLeft(total.toString(), 7, '0')}`
    return padExact(base, LINE_SIZE, ' ')
}

export class DTELayoutGenerator {
    static buildRegistro(message: DTEMessageRecord) {
        // Layout posicional oficial DTE-SN (linha por mensagem):
        // codigoMensagem(4) + cnpj(14) + dataEnvio(8 AAAAMMDD) + conteudo(74)
        const codigo = padExact(message.codigo, 4, '0')
        const cnpj = padExact(message.cnpj.replace(/\D/g, ''), 14, '0')
        const data = format(message.sentAt, 'yyyyMMdd')
        const conteudo = padExact(sanitizeContent(message.content), 74, ' ')
        const base = `${codigo}${cnpj}${data}${conteudo}`
        return padExact(base, LINE_SIZE, ' ')
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
            content: msg.content || msg.subject || ''
        })
    })

    // Header e trailer posicionais (sem pipes)
    const header = buildHeader(generatedAt, messages.length)
    const trailer = buildTrailer(messages.length)

    let content = ''
    if (formatType === 'xml') {
        const items = registros.map(r => `<Registro>${r}</Registro>`).join('\n')
        content = `<?xml version="1.0" encoding="UTF-8"?>\n<LoteDTE geradoEm="${format(generatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')}">\n  <Header>${header}</Header>\n${items}\n  <Trailer>${trailer}</Trailer>\n</LoteDTE>`
    } else {
        content = [header, ...registros, trailer].join('\n')
    }

    const filename = `DTE_LOTE_${format(generatedAt, 'yyyyMMdd_HHmmss')}.${formatType}`

    return {
        filename,
        content,
        count: messages.length
    }
}
