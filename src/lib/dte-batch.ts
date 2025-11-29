import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import crypto from 'crypto'

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

function sanitizeText(text: string) {
    return text.replace(/\s+/g, ' ').trim()
}

function buildTxtLayout(messages: any[], generatedAt: Date): string {
    const header = [
        'HDR',
        'DTE-SN',
        format(generatedAt, 'yyyyMMddHHmmss'),
        'V1'
    ].join('|')

    const body = messages.map((msg, index) => {
        const checksum = crypto.createHash('sha256').update(msg.content || '').digest('hex')
        return [
            'MSG',
            index + 1,
            msg.company.cnpj,
            sanitizeText(msg.company.name),
            msg.type,
            format(msg.sentAt, 'yyyyMMdd'),
            sanitizeText(msg.subject),
            checksum.substring(0, 32), // reduzido para facilitar consumo
            sanitizeText(msg.content).substring(0, 2000) // limita tamanho por registro
        ].join('|')
    }).join('\n')

    const trailer = ['TRL', messages.length].join('|')

    return [header, body, trailer].filter(Boolean).join('\n')
}

function buildXmlLayout(messages: any[], generatedAt: Date): string {
    const records = messages.map((msg) => {
        const checksum = crypto.createHash('sha256').update(msg.content || '').digest('hex')
        return `
    <Mensagem>
      <CNPJ>${msg.company.cnpj}</CNPJ>
      <Empresa>${sanitizeText(msg.company.name)}</Empresa>
      <Tipo>${msg.type}</Tipo>
      <Assunto>${sanitizeText(msg.subject)}</Assunto>
      <DataEnvio>${format(msg.sentAt, 'yyyy-MM-dd')}</DataEnvio>
      <HashConteudo>${checksum}</HashConteudo>
      <Conteudo>${sanitizeText(msg.content)}</Conteudo>
    </Mensagem>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<LoteDTE versao="1.0" geradoEm="${format(generatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')}">
${records}
</LoteDTE>`
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

    const content = formatType === 'xml'
        ? buildXmlLayout(messages, generatedAt)
        : buildTxtLayout(messages, generatedAt)

    const filename = `DTE_LOTE_${format(generatedAt, 'yyyyMMdd_HHmmss')}.${formatType}`

    return {
        filename,
        content,
        count: messages.length
    }
}
