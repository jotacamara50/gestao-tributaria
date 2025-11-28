"use client"

import { useEffect, useState } from "react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { DashboardCharts } from "@/components/dashboard/charts"

interface DashboardData {
  totalCompanies: number
  activeDivergences: number
  projectedRevenue: number
  detectedDifference: number
  divergencesByMonth: { month: string; declared: number; real: number }[]
  riskDistribution: { name: string; value: number; fill: string }[]
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/companies')
        const companies = await response.json()

        // Calculate KPIs
        const totalCompanies = companies.length
        const activeDivergences = companies.reduce((sum: number, c: any) =>
          sum + (c.divergences?.length || 0), 0
        )

        const totalDeclared = companies.reduce((sum: number, c: any) =>
          sum + (c.declarations?.[0]?.revenue || 0), 0
        )

        const totalReal = companies.reduce((sum: number, c: any) => {
          const invoices = c.invoices || []
          return sum + invoices.reduce((s: number, inv: any) => s + inv.value, 0)
        }, 0)

        const detectedDifference = Math.abs(totalReal - totalDeclared)

        // Prepare chart data
        const divergencesByMonth = [
          { month: "Jan", declared: 45000, real: 52000 },
          { month: "Fev", declared: 52000, real: 61000 },
          { month: "Mar", declared: 49000, real: 58000 },
          { month: "Abr", declared: 63000, real: 75000 },
          { month: "Mai", declared: 58000, real: 67000 },
          { month: "Jun", declared: 71000, real: 85000 },
        ]

        const riskCounts = companies.reduce((acc: any, c: any) => {
          acc[c.riskLevel] = (acc[c.riskLevel] || 0) + 1
          return acc
        }, {})

        const riskDistribution = [
          { name: "Baixo Risco", value: riskCounts.Baixo || 0, fill: "#10b981" },
          { name: "Médio Risco", value: riskCounts.Médio || 0, fill: "#f59e0b" },
          { name: "Alto Risco", value: riskCounts.Alto || 0, fill: "#ef4444" },
        ]

        setData({
          totalCompanies,
          activeDivergences,
          projectedRevenue: totalReal,
          detectedDifference,
          divergencesByMonth,
          riskDistribution
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">Erro ao carregar dados</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do sistema de gestão tributária
        </p>
      </div>
      <KPICards
        totalCompanies={data.totalCompanies}
        activeDivergences={data.activeDivergences}
        projectedRevenue={data.projectedRevenue}
        detectedDifference={data.detectedDifference}
      />
      <DashboardCharts
        divergencesByMonth={data.divergencesByMonth}
        riskDistribution={data.riskDistribution}
      />
    </div>
  )
}
