"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"

type DashboardResumo = {
  empresasAtivas: number
  divergenciasPendentes: number
  totalReceita: number
  valorDivergencias: number
}

export function KPICards() {
  const [resumo, setResumo] = useState<DashboardResumo>({
    empresasAtivas: 0,
    divergenciasPendentes: 0,
    totalReceita: 0,
    valorDivergencias: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const resp = await fetch('/api/dashboard/stats')
        if (resp.ok) {
          const data = await resp.json()
          setResumo({
            empresasAtivas: data.resumo.empresasAtivas || 0,
            divergenciasPendentes: data.resumo.divergenciasPendentes || 0,
            totalReceita: data.resumo.totalReceita || 0,
            valorDivergencias: data.resumo.valorDivergencias || 0
          })
        }
      } catch (err) {
        console.error('Erro ao carregar KPIs do dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

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
          <div className="text-2xl font-bold">
            {loading ? '...' : resumo.empresasAtivas}
          </div>
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
          <div className="text-2xl font-bold">
            {loading ? '...' : resumo.divergenciasPendentes}
          </div>
          <p className="text-xs text-muted-foreground">
            Pendentes de análise
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receita Declarada (12m)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : `R$ ${resumo.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </div>
          <p className="text-xs text-muted-foreground">
            Baseada nos arquivos PGDAS importados
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
            {loading ? '...' : `R$ ${resumo.valorDivergencias.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          </div>
          <p className="text-xs text-muted-foreground">
            Potencial de recuperação
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
