import { prisma } from "@/lib/prisma"
import { auth } from "@/app/api/auth/[...nextauth]/route"

export interface AuditLogData {
    action: string
    resource: string
    details?: string
    ipAddress?: string
}

export async function createAuditLog(data: AuditLogData) {
    const session = await auth()

    return await prisma.auditLog.create({
        data: {
            userId: session?.user?.id,
            action: data.action,
            resource: data.resource,
            details: data.details,
            ipAddress: data.ipAddress
        }
    })
}

export async function logAction(
    action: string,
    resource: string,
    details?: any
) {
    const session = await auth()

    return await prisma.auditLog.create({
        data: {
            userId: session?.user?.id,
            action,
            resource,
            details: typeof details === 'string' ? details : JSON.stringify(details)
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
