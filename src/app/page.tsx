"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts'
import { 
  TrendingUp, Users, AlertTriangle, DollarSign, 
  FileWarning, CheckCircle 
} from "lucide-react"

interface DashboardStats {
  resumo: {
    empresasAtivas: number
    totalArrecadado: number
    totalReceita: number
    omissos: number
    taxaOmissao: number
    inadimplentes: number
    taxaInadimplencia: number
    divergenciasPendentes: number
    valorDivergencias: number
  }
  arrecadacaoMensal: Array<{ periodo: string; receita: number; imposto: number }>
  top10Contribuintes: Array<{ cnpj: string; nome: string; receita: number; imposto: number; regime: string }>
  distribuicaoPorAnexo: Array<{ regime: string; quantidade: number }>
  evolucaoOmissao: Array<{ mes: string; taxa: number; omissos: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c']

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
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

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão geral da gestão tributária municipal
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Empresas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resumo.empresasAtivas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.resumo.omissos} omissos ({stats.resumo.taxaOmissao}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Arrecadação (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.resumo.totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita: R$ {stats.resumo.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              Inadimplentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.resumo.inadimplentes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.resumo.taxaInadimplencia}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Divergências Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.resumo.divergenciasPendentes}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.resumo.valorDivergencias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Arrecadação Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução de Arrecadação (12 meses)
            </CardTitle>
            <CardDescription>Receita declarada vs ISS devido</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.arrecadacaoMensal.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.arrecadacaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="receita" stroke="#8884d8" name="Receita" strokeWidth={2} />
                  <Line type="monotone" dataKey="imposto" stroke="#82ca9d" name="ISS Devido" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados de arrecadação</p>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Contribuintes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 10 Contribuintes
            </CardTitle>
            <CardDescription>Maiores arrecadadores (12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top10Contribuintes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.top10Contribuintes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="cnpj" type="category" width={100} fontSize={10} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    labelFormatter={(label) => `CNPJ: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="imposto" fill="#8884d8" name="ISS Arrecadado" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados de contribuintes</p>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Anexo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Regime</CardTitle>
            <CardDescription>Empresas ativas por anexo do Simples Nacional</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.distribuicaoPorAnexo.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.distribuicaoPorAnexo}
                    dataKey="quantidade"
                    nameKey="regime"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {stats.distribuicaoPorAnexo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados de distribuição</p>
            )}
          </CardContent>
        </Card>

        {/* Evolução de Omissão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Evolução de Omissão
            </CardTitle>
            <CardDescription>Taxa de empresas omissas (últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.evolucaoOmissao.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.evolucaoOmissao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'taxa') return `${value}%`
                      return value
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="taxa" 
                    stroke="#ff8042" 
                    fill="#ff8042" 
                    fillOpacity={0.6}
                    name="Taxa de Omissão (%)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="omissos" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Qtd Omissos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados de omissão</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
