import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { id: companyId } = await context.params;

        // Buscar empresa com todas as relações
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                partners: {
                    orderBy: { startDate: 'desc' }
                },
                declarations: {
                    orderBy: { createdAt: 'desc' },
                    take: 24 // Últimos 24 meses
                },
                invoices: {
                    orderBy: { issueDate: 'desc' },
                    take: 100 // Últimas 100 notas
                },
                divergences: {
                    orderBy: { detectedAt: 'desc' }
                },
                enquadramentoHistory: {
                    orderBy: { startDate: 'desc' }
                },
                dteMessages: {
                    orderBy: { sentAt: 'desc' },
                    take: 50
                }
            }
        });

        if (!company) {
            return NextResponse.json(
                { error: "Empresa não encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(company);
    } catch (error) {
        console.error("Erro ao buscar detalhes da empresa:", error);
        return NextResponse.json(
            { error: "Erro ao buscar detalhes da empresa" },
            { status: 500 }
        );
    }
}
