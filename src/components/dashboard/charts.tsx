"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"
import { AlertTriangle } from "lucide-react"

type DivergenciaMes = { month: string; declared: number; real: number }
type RiscoDist = { name: string; value: number; fill: string }

export function DashboardCharts() {
    const [divergencesByMonth, setDivergencesByMonth] = useState<DivergenciaMes[]>([])
    const [riskDistribution, setRiskDistribution] = useState<RiscoDist[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const resp = await fetch('/api/dashboard/stats')
                if (resp.ok) {
                    const data = await resp.json()
                    const chart = data.evolucaoOmissao?.map((item: any) => ({
                        month: item.mes || '',
                        declared: item.omissos || 0,
                        real: item.taxa || 0
                    })) || []
                    setDivergencesByMonth(chart)

                    const risco = data.distribuicaoPorAnexo?.map((item: any) => ({
                        name: item.regime || item.anexo || '',
                        value: item.quantidade || 0,
                        fill: "#0ea5e9"
                    })) || []
                    setRiskDistribution(risco)
                } else {
                    setError('Falha ao carregar gráficos')
                }
            } catch (err) {
                setError('Falha ao carregar gráficos')
            }
        }
        load()
    }, [])

    if (error) {
        return (
            <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> {error}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Divergências: Declarado vs Real (últimos meses)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={divergencesByMonth}>
                            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="declared" name="Declarado (PGDAS)" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="real" name="Real (NFS-e + Cruzamento)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Distribuição de Risco Fiscal</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={riskDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {riskDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill || "#0ea5e9"} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
