"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

const divergenceData = [
    { name: "Jan", declarado: 4000, real: 2400 },
    { name: "Fev", declarado: 3000, real: 1398 },
    { name: "Mar", declarado: 2000, real: 9800 },
    { name: "Abr", declarado: 2780, real: 3908 },
    { name: "Mai", declarado: 1890, real: 4800 },
    { name: "Jun", declarado: 2390, real: 3800 },
]

const riskData = [
    { name: "Alto Risco", value: 400, color: "#ef4444" },
    { name: "Médio Risco", value: 300, color: "#f59e0b" },
    { name: "Baixo Risco", value: 300, color: "#22c55e" },
    { name: "Sem Pendências", value: 200, color: "#3b82f6" },
]

export function DashboardCharts() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Divergências: Declarado vs Real (Últimos 6 meses)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={divergenceData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="declarado" name="Declarado (PGDAS)" fill="#adfa1d" radius={[4, 4, 0, 0]} />
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
                                data={riskData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {riskData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
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
