/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'FILE_UPLOAD' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const mapped = logs.map(log => {
      let details: any = {}
      try {
        details = log.details ? JSON.parse(log.details) : {}
      } catch {
        details = {}
      }

      const result = details.result || {}
      let records = result.count || result.records || 0
      if (!records && result.declaration) records = 1
      if (!records && result.invoice) records = 1

      return {
        id: log.id,
        filename: details.fileName || '-',
        type: log.resource || '-',
        date: log.createdAt,
        status: 'success',
        records
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Erro ao buscar histórico de importação:', error)
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}
