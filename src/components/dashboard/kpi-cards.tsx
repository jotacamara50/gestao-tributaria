import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"

interface KPICardsProps {
    totalCompanies: number
    activeDivergences: number
    projectedRevenue: number
    detectedDifference: number
}

export function KPICards({
    totalCompanies,
    activeDivergences,
    projectedRevenue,
    detectedDifference
}: KPICardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Empresas Monitoradas
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalCompanies}</div>
                    <p className="text-xs text-muted-foreground">
                        Total cadastradas
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Divergências Detectadas
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeDivergences}</div>
                    <p className="text-xs text-muted-foreground">
                        Pendentes de análise
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Ar recadação Projetada
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        R$ {(projectedRevenue / 1000000).toFixed(2)}M
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Baseado em NFS-e emitidas
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Diferença Apurada
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        R$ {(detectedDifference / 1000).toFixed(0)}k
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Potencial de recuperação
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
