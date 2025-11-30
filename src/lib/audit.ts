/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export interface AuditLogData {
    action: string
    resource: string
    details?: string
    before?: unknown
    after?: unknown
    ipAddress?: string
}

async function resolveUserId() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return null
    const exists = await prisma.user.count({ where: { id: userId } })
    return exists ? userId : null
}

export async function createAuditLog(data: AuditLogData) {
    const userId = await resolveUserId()

    return await prisma.auditLog.create({
        data: {
            userId,
            action: data.action,
            resource: data.resource,
            details: data.details,
            ipAddress: data.ipAddress,
            dataBefore: data.before ? JSON.stringify(data.before) : undefined,
            dataAfter: data.after ? JSON.stringify(data.after) : undefined
        }
    })
}

export async function logAction(
    action: string,
    resource: string,
    details?: any,
    before?: unknown,
    after?: unknown
) {
    const userId = await resolveUserId()

    return await prisma.auditLog.create({
        data: {
            userId,
            action,
            resource,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            dataBefore: before ? JSON.stringify(before) : undefined,
            dataAfter: after ? JSON.stringify(after) : undefined
        }
    })
}

// Helper to get audit logs with filters
export async function getAuditLogs(filters?: {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
}) {
    return await prisma.auditLog.findMany({
        where: {
            userId: filters?.userId,
            action: filters?.action,
            resource: filters?.resource,
            createdAt: {
                gte: filters?.startDate,
                lte: filters?.endDate
            }
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: filters?.limit || 100
    })
}
