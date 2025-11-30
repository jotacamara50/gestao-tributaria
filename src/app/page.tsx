"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  LineChart as LineChartIcon,
  ReceiptText,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SerieValor = { competencia: string; valor: number }

type DashboardSN = {
  periodo: { meses: number; inicio: string }
  totais: {
    empresas: number
    mei: number
    receitaPrevista12m: number
    receitaDeclarada12m: number
    nfse12m: number
    iss12m?: number
    repasses12m?: number
    parcelamentosAtivos: number
    parcelasEmAtraso: number
    valorAtraso: number
    valorAReceber: number
    receitaPrevistaPeriodo?: number
    receitaDeclaradaPeriodo?: number
    nfsePeriodo?: number
    issPeriodo?: number
    repassesPeriodo?: number
    pagamentosEfetivosPeriodo?: number
    divergenciaBasePeriodo?: number
    inadimplenciaPeriodo?: number
    omissosAtuais?: number
    meiOmissosAtuais?: number
    parcelamentosValorAbertoAtual?: number
    parcelamentosValorAtrasoAtual?: number
  }
  series: {
    arrecadacaoPrevista: SerieValor[]
    receitaDeclarada?: SerieValor[]
    nfse: SerieValor[]
    iss: SerieValor[]
    repasses?: SerieValor[]
    entregas: SerieValor[]
    omissos: SerieValor[]
    omissosMei?: SerieValor[]
    inadimplencia: SerieValor[]
    parcelamentosAtraso?: SerieValor[]
    parcelamentosValorAtraso?: SerieValor[]
    parcelamentosValorAberto?: SerieValor[]
  }
  alertas: string[]
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat("pt-BR")

function formatCompetencia(comp?: string) {
  if (!comp) return ""
  const [year, month] = comp.split("-")
  if (!year || !month) return comp
  return `${month}/${year.slice(-2)}`
}

export default function Home() {
  const [data, setData] = useState<DashboardSN | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<"12m" | "5a">("5a")

  async function carregar(target = periodo) {
    setLoading(true)
    setError(null)
    try {
      const anos = target === "5a" ? 5 : 1
      const resp = await fetch(`/api/sn/dashboard?anos=${anos}`)
      const json = await resp.json()
      if (!resp.ok || json.error) {
        throw new Error(json.error || "Falha ao carregar dashboard")
      }
      setData(json)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao carregar dashboard"
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar(periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const periodoLabel = periodo === "5a" ? "ultimos 5 anos" : "ultimos 12 meses"
  const divergenciaBase =
    data?.totais.divergenciaBasePeriodo ??
    ((data?.totais.nfsePeriodo ?? data?.totais.nfse12m ?? 0) -
      (data?.totais.receitaDeclaradaPeriodo ?? data?.totais.receitaDeclarada12m ?? 0))

  const baseSeries = useMemo(() => {
    if (!data) return []
    const pgdasSerie = data.series.receitaDeclarada?.length
      ? data.series.receitaDeclarada
      : data.series.arrecadacaoPrevista
    const previstoSerie = data.series.arrecadacaoPrevista
    return (data.series.nfse || []).map((item, idx) => ({
      competencia: formatCompetencia(item.competencia),
      nfse: item.valor,
      pgdas: pgdasSerie?.[idx]?.valor ?? 0,
      previsto: previstoSerie?.[idx]?.valor ?? 0,
    }))
  }, [data])

  const issSeries = useMemo(() => {
    if (!data) return []
    return (data.series.iss || []).map((item, idx) => ({
      competencia: formatCompetencia(item.competencia),
      iss: item.valor,
      repasses: data.series.repasses?.[idx]?.valor ?? 0,
    }))
  }, [data])

  const entregaSeries = useMemo(() => {
    if (!data) return []
    return (data.series.entregas || []).map((item, idx) => ({
      competencia: formatCompetencia(item.competencia),
      entregas: item.valor,
      omissos: data.series.omissos?.[idx]?.valor ?? 0,
      omissosMei: data.series.omissosMei?.[idx]?.valor ?? 0,
    }))
  }, [data])

  const inadimplenciaSeries = useMemo(() => {
    if (!data) return []
    return (data.series.inadimplencia || []).map((item, idx) => ({
      competencia: formatCompetencia(item.competencia),
      inadimplencia: item.valor,
      valorAberto: data.series.parcelamentosValorAberto?.[idx]?.valor ?? 0,
      valorAtraso: data.series.parcelamentosValorAtraso?.[idx]?.valor ?? 0,
    }))
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando indicadores do SN...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">{error || "Erro ao carregar dados"}</p>
          <Button variant="outline" className="mt-3" onClick={() => carregar(periodo)}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const omissosAtuais = data.totais.omissosAtuais ?? 0
  const meiOmissosAtuais = data.totais.meiOmissosAtuais ?? 0

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Simples Nacional</h1>
          <p className="text-muted-foreground">
            Series e indicadores {periodoLabel} (PGDAS, NFSe, ISS, parcelamentos, MEI)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              size="sm"
              variant={periodo === "12m" ? "default" : "ghost"}
              onClick={() => setPeriodo("12m")}
            >
              12 meses
            </Button>
            <Button
              size="sm"
              variant={periodo === "5a" ? "default" : "ghost"}
              onClick={() => setPeriodo("5a")}
            >
              5 anos
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => carregar(periodo)} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/cruzamento">Ver cruzamentos</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
              PGDAS declarado
            </CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter.format(data.totais.receitaDeclaradaPeriodo ?? data.totais.receitaDeclarada12m)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {currencyFormatter.format(data.totais.receitaPrevistaPeriodo ?? data.totais.receitaPrevista12m)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              NFSe emitida
            </CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter.format(data.totais.nfsePeriodo ?? data.totais.nfse12m)}
            </div>
            <p className="text-xs text-muted-foreground">
              Diferenca PGDAS: {currencyFormatter.format(Math.abs(divergenciaBase))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-destructive" />
              Divergencia PGDAS x NFSe
            </CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${divergenciaBase >= 0 ? "text-destructive" : "text-emerald-600"}`}>
              {currencyFormatter.format(divergenciaBase)}
            </div>
            <p className="text-xs text-muted-foreground">
              {divergenciaBase >= 0 ? "NFSe acima do declarado" : "PGDAS acima das notas"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              ISS e repasses (DAF607)
            </CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter.format(data.totais.issPeriodo ?? data.totais.iss12m ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Repasses BB: {currencyFormatter.format(data.totais.repassesPeriodo ?? data.totais.repasses12m ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Inadimplencia estimada
            </CardTitle>
            <CardDescription>Guias pagas + repasses vs devido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter.format(data.totais.inadimplenciaPeriodo ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos identificados: {currencyFormatter.format(data.totais.pagamentosEfetivosPeriodo ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Parcelamentos
            </CardTitle>
            <CardDescription>Ativos e valores abertos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totais.parcelamentosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              Em aberto: {currencyFormatter.format(data.totais.parcelamentosValorAbertoAtual ?? data.totais.valorAReceber)}
            </p>
            <p className="text-xs text-muted-foreground">
              Em atraso: {currencyFormatter.format(data.totais.parcelamentosValorAtrasoAtual ?? data.totais.valorAtraso)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Empresas
            </CardTitle>
            <CardDescription>Total / MEI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numberFormatter.format(data.totais.empresas)}</div>
            <p className="text-xs text-muted-foreground">
              {numberFormatter.format(data.totais.mei)} MEI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Omissos PGDAS / MEI
            </CardTitle>
            <CardDescription>Competencia mais recente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numberFormatter.format(omissosAtuais)}</div>
            <p className="text-xs text-muted-foreground">
              MEI omissos: {numberFormatter.format(meiOmissosAtuais)}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.alertas.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Alertas e limites</CardTitle>
              <CardDescription>Conectados ao TR (sublimite, divergencias, inadimplencia)</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/cruzamento">Ver cruzamentos detalhados</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alertas.map((a, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Badge variant="destructive">Alerta</Badge>
                <span className="text-destructive">{a}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Base declarada x NFSe</CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={baseSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="nfse" name="NFSe" stroke="#6366f1" fill="#c7d2fe" />
                <Area type="monotone" dataKey="pgdas" name="PGDAS (receita)" stroke="#0ea5e9" fill="#bae6fd" />
                <Area type="monotone" dataKey="previsto" name="PGDAS (imposto devido)" stroke="#22c55e" fill="#bbf7d0" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>ISS pago x repasses BB</CardTitle>
            <CardDescription>{periodoLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={issSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="iss" name="ISS em guias" stroke="#2563eb" fill="#dbeafe" />
                <Area type="monotone" dataKey="repasses" name="Repasses DAF607" stroke="#ea580c" fill="#fed7aa" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Entregas x omissos</CardTitle>
            <CardDescription>PGDAS e MEI</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={entregaSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entregas" name="Entregas PGDAS" fill="#10b981" />
                <Bar dataKey="omissos" name="Omissos" fill="#ef4444" />
                <Bar dataKey="omissosMei" name="Omissos MEI" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Inadimplencia e parcelamentos</CardTitle>
            <CardDescription>Valores devidos x abertos</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={inadimplenciaSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="inadimplencia" name="Inadimplencia (valor)" stroke="#ef4444" fill="#fee2e2" />
                <Area type="monotone" dataKey="valorAberto" name="Parcelamentos abertos" stroke="#8b5cf6" fill="#ede9fe" />
                <Area type="monotone" dataKey="valorAtraso" name="Parcelamentos em atraso" stroke="#f97316" fill="#ffedd5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
