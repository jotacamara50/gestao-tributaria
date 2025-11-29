"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, RefreshCw } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useRouter } from "next/navigation"

export default function CruzamentoPage() {
    const router = useRouter()
    const [running, setRunning] = useState(false)
    type CrossingResult = { count?: number; message?: string }
    const [result, setResult] = useState<CrossingResult | null>(null)

    const handleRunChecks = async () => {
        setRunning(true)
        try {
            const response = await fetch('/api/crossing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})  // Run for all companies
            })

            const data = await response.json()
            setResult(data)

            // Refresh after a delay to show updated divergences
            setTimeout(() => {
                router.refresh()
            }, 2000)
        } catch (error) {
            console.error('Failed to run crossing checks:', error)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cruzamento Fiscal</h2>
                    <p className="text-muted-foreground">
                        Detecção automática de inconsistências fiscais
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => router.refresh()} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button onClick={handleRunChecks} disabled={running}>
                        <Play className="h-4 w-4 mr-2" />
                        {running ? "Processando..." : "Executar Cruzamentos"}
                    </Button>
                </div>
            </div>

            {result && (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                        <p className="text-green-700">
                            ✓ Cruzamentos executados com sucesso para {result.count} empresas
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total de Divergências</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Aguardando dados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Valor a Recuperar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Aguardando dados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Assertividade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Aguardando dados</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Divergências Detectadas</CardTitle>
                    <CardDescription>
                        Inconsistências encontradas através do cruzamento de dados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Razão Social</TableHead>
                                <TableHead>Tipo de Divergência</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    Execute os cruzamentos para visualizar divergências
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
