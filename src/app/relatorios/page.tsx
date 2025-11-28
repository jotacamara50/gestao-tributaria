"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Download, Filter } from "lucide-react"

const reports = [
    {
        title: "Relatório de Divergências",
        description: "Lista completa de empresas com divergências entre PGDAS e NFS-e.",
        type: "Analítico",
    },
    {
        title: "Relatório de Não Declarantes",
        description: "Empresas ativas que não enviaram PGDAS no período.",
        type: "Operacional",
    },
    {
        title: "Relatório de Repasses (DAF607)",
        description: "Consolidado de repasses recebidos do Banco do Brasil.",
        type: "Financeiro",
    },
    {
        title: "Ranking de Risco Fiscal",
        description: "Empresas classificadas por score de risco e potencial de sonegação.",
        type: "Gerencial",
    },
    {
        title: "Evolução da Arrecadação",
        description: "Comparativo anual e mensal da arrecadação do Simples Nacional.",
        type: "Estatístico",
    },
]

export default function RelatoriosPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
                <p className="text-muted-foreground">
                    Gere relatórios detalhados para auditoria e acompanhamento.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reports.map((report, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                                <FileSpreadsheet className="h-8 w-8 text-primary/80" />
                                <span className="text-xs font-medium bg-muted px-2 py-1 rounded">{report.type}</span>
                            </div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <CardDescription>{report.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-auto pt-0">
                            <div className="flex gap-2">
                                <Button className="w-full" variant="outline">
                                    <Filter className="mr-2 h-4 w-4" /> Filtrar
                                </Button>
                                <Button className="w-full">
                                    <Download className="mr-2 h-4 w-4" /> Exportar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
