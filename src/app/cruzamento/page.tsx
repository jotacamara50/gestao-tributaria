"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react"
import { divergences, companies } from "@/lib/data"
import Link from "next/link"

export default function CruzamentoPage() {
    // Enrich divergences with company names
    const enrichedDivergences = divergences.map(div => {
        const company = companies.find(c => c.id === div.companyId)
        return { ...div, companyName: company ? company.name : "Desconhecido" }
    })

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Cruzamento de Dados</h2>
                <p className="text-muted-foreground">
                    Análise automática de divergências entre PGDAS, NFS-e e outras fontes.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total de Divergências</h3>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold">342</div>
                    <p className="text-xs text-muted-foreground">Em aberto</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Valor Total Apurado</h3>
                        <span className="text-2xl font-bold">R$ 850k</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Potencial de recuperação</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Acurácia do Cruzamento</h3>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">98.5%</div>
                    <p className="text-xs text-muted-foreground">Baseado em validações manuais</p>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contribuinte</TableHead>
                            <TableHead>Tipo de Divergência</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data Detecção</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrichedDivergences.map((div) => (
                            <TableRow key={div.id}>
                                <TableCell className="font-medium">{div.companyName}</TableCell>
                                <TableCell>{div.type}</TableCell>
                                <TableCell>R$ {div.value.toLocaleString()}</TableCell>
                                <TableCell>{div.date}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                        {div.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/contribuintes/${div.companyId}`}>
                                            Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
