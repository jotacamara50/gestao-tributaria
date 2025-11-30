/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'FILE_UPLOAD' },
      orderBy: { createdAt: 'desc' },
      take: 500
    })

    const mapped = logs.map(log => {
      let details: any = {}
      try {
        details = log.details ? JSON.parse(log.details) : {}
      } catch {
        details = {}
      }

      const result = details.result || {}
      let records = result.count || result.records || result.parsedCount || 0
      if (!records && result.declaration) records = 1
      if (!records && result.invoice) records = 1
      const status = result.error ? 'error' : 'success'

      return {
        id: log.id,
        filename: details.fileName || '-',
        type: log.resource || '-',
        date: log.createdAt,
        status,
        records
      }
    })

    const uniqMap = new Map<string, typeof mapped[0]>()
    for (const item of mapped) {
      const key = `${item.filename}_${item.type}`
      if (!uniqMap.has(key)) {
        uniqMap.set(key, item)
      }
    }

    return NextResponse.json(Array.from(uniqMap.values()).slice(0, 100))
  } catch (error) {
    console.error('Erro ao buscar histórico de importação:', error)
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}
