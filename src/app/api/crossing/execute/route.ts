import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { 
    executarTodosCruzamentos,
    executarCruzamentoEmLote,
    detectarOmissos,
    detectarInadimplentes,
    cruzamentoPgdasNfse,
    verificarSublimites,
    validarRetencoes
} from "@/lib/engine/crossing";

/**
 * POST /api/crossing/execute
 * Executa cruzamentos para uma empresa específica
 */
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { companyId, period, tipo } = body;

        if (!companyId || !period) {
            return NextResponse.json(
                { error: "companyId e period são obrigatórios" },
                { status: 400 }
            );
        }

        let resultado;

        switch (tipo) {
            case 'pgdas_nfse':
                resultado = await cruzamentoPgdasNfse(companyId, period);
                break;
            
            case 'sublimites':
                const [, year] = period.split('/');
                resultado = await verificarSublimites(companyId, parseInt(year));
                break;
            
            case 'retencoes':
                resultado = await validarRetencoes(companyId, period);
                break;
            
            case 'completo':
            default:
                resultado = await executarTodosCruzamentos(companyId, period);
                break;
        }

        return NextResponse.json(resultado);
    } catch (error) {
        console.error("Erro ao executar cruzamento:", error);
        return NextResponse.json(
            { error: "Erro ao executar cruzamento" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/crossing/batch?period=MM/YYYY
 * Executa cruzamentos em lote para todas as empresas
 */
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const action = searchParams.get('action');

        if (!period) {
            return NextResponse.json(
                { error: "period é obrigatório" },
                { status: 400 }
            );
        }

        if (action === 'omissos') {
            const omissos = await detectarOmissos(period);
            return NextResponse.json({
                total: omissos.length,
                empresas: omissos
            });
        }

        if (action === 'inadimplentes') {
            const inadimplentes = await detectarInadimplentes(period);
            return NextResponse.json({
                total: inadimplentes.length,
                empresas: inadimplentes
            });
        }

        // Executar em lote
        const resultado = await executarCruzamentoEmLote(period);
        
        return NextResponse.json(resultado);
    } catch (error) {
        console.error("Erro ao executar cruzamento em lote:", error);
        return NextResponse.json(
            { error: "Erro ao executar cruzamento em lote" },
            { status: 500 }
        );
    }
}
