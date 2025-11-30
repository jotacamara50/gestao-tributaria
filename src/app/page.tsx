"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts"
import { BarChart3, ReceiptText, Banknote, AlertTriangle, Building2, ShieldAlert } from "lucide-react"

interface DashboardStats {
  resumo: {
    totalPgdasMes: number
    totalNfseMes: number
    totalRepassesMes: number
    divergenciaTotal: number
    empresasDivergentes: number
    risco: {
      critico: number
      alto: number
      medio: number
      baixo: number
    }
  }
  comparativoPgdasNfse: Array<{ periodo: string; pgdas: number; nfse: number }>
  divergenciasPorMes: Array<{ periodo: string; valor: number }>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Erro ao carregar estatisticas:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">Erro ao carregar dados do dashboard</p>
        </div>
      </div>
    )
  }

  const riscoResumo = [
    { label: "Critico", value: stats.resumo.risco.critico, color: "text-red-600" },
    { label: "Alto", value: stats.resumo.risco.alto, color: "text-orange-500" },
    { label: "Medio", value: stats.resumo.risco.medio, color: "text-amber-500" },
    { label: "Baixo", value: stats.resumo.risco.baixo, color: "text-emerald-600" },
  ]

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Divergencias</h1>
        <p className="text-muted-foreground">Visao simplificada das principais divergencias</p>
      </div>

      {/* Primeira linha - cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
              Receita declarada (PGDAS)
            </CardTitle>
            <CardDescription>Total PGDAS do mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(stats.resumo.totalPgdasMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Receita emitida (NFSe)
            </CardTitle>
            <CardDescription>Total NFSe do mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(stats.resumo.totalNfseMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Repasses BB
            </CardTitle>
            <CardDescription>Total repasses DAF607</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(stats.resumo.totalRepassesMes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Divergencia total
            </CardTitle>
            <CardDescription>Pendencias em aberto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {currencyFormatter.format(stats.resumo.divergenciaTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Empresas divergentes
            </CardTitle>
            <CardDescription>Quantidade com pendencias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resumo.empresasDivergentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Distribuicao de risco
            </CardTitle>
            <CardDescription>Critico / Alto / Medio / Baixo</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {riscoResumo.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha - grafico PGDAS x NFSe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            PGDAS x NFSe
          </CardTitle>
          <CardDescription>Comparativo dos ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.comparativoPgdasNfse.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={stats.comparativoPgdasNfse}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number) => currencyFormatter.format(value)}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Legend />
                <Bar dataKey="pgdas" name="PGDAS" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nfse" name="NFSe" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
          )}
        </CardContent>
      </Card>

      {/* Terceira linha - divergencias por periodo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Divergencias por periodo
          </CardTitle>
          <CardDescription>Linha de divergencias por mes</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.divergenciasPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={stats.divergenciasPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                <Legend />
                <Line type="monotone" dataKey="valor" name="Divergencias" stroke="#e11d48" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem divergencias registradas</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
