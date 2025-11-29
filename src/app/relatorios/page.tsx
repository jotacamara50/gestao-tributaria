/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Filter, AlertTriangle } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type OmissosItem = {
  companyId: string
  cnpj: string
  razaoSocial: string
  periodo: string
  valorNfse?: number
}

type InadimplenteItem = {
  companyId: string
  cnpj: string
  razaoSocial: string
  valor: number
  periodo: string
}

type RetencaoItem = {
  companyId: string
  cnpj: string
  razaoSocial: string
  descricao: string
  valor: number
  periodo: string
}

type LimiteItem = {
  companyId: string
  cnpj: string
  razaoSocial: string
  tipo: string
  excesso: number
  ano: number
}

type DivergenteItem = {
  companyId: string
  cnpj: string
  razaoSocial: string
  tipo: string
  descricao: string
  valor: number
  gravidade: string
  periodo: string
}

type RepasseBBItem = {
  id: string
  date: string
  amount: number
  origin?: string | null
  description?: string | null
  companyId?: string
  cnpj?: string
  razaoSocial?: string
}

type HistoricoItem = {
  period: string
  receitaDeclarada: number
  impostoDeclarado: number
  nfse: number
  repasses: number
}

type Settings = {
  logoUrl?: string | null
  cityName?: string | null
  address?: string | null
}

function todayPeriod() {
  const d = new Date()
  const mm = `${d.getMonth() + 1}`.padStart(2, "0")
  return `${mm}/${d.getFullYear()}`
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState(todayPeriod())
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [minDebito, setMinDebito] = useState("0")
  const [settings, setSettings] = useState<Settings>({})

  const [omissos, setOmissos] = useState<OmissosItem[]>([])
  const [inadimplentes, setInadimplentes] = useState<InadimplenteItem[]>([])
  const [retencoes, setRetencoes] = useState<RetencaoItem[]>([])
  const [limites, setLimites] = useState<LimiteItem[]>([])
  const [divergentes, setDivergentes] = useState<DivergenteItem[]>([])
  const [repasses, setRepasses] = useState<RepasseBBItem[]>([])
  const [repassesMin, setRepassesMin] = useState("")
  const [repassesMax, setRepassesMax] = useState("")
  const [repassesOrigem, setRepassesOrigem] = useState("")
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [historicoMeta, setHistoricoMeta] = useState<{ cnpj?: string; razaoSocial?: string }>({})
  const [cnpjFiltro, setCnpjFiltro] = useState("")
  const [historicoCnpj, setHistoricoCnpj] = useState("")
  const [historicoMeses, setHistoricoMeses] = useState("12")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then(async (r) => {
      if (r.ok) setSettings(await r.json())
    }).catch(() => {})
  }, [])

  const branding = useMemo(() => ({
    logoUrl: settings.logoUrl || undefined,
    cityName: settings.cityName || undefined,
    address: settings.address || undefined
  }), [settings])

  async function loadOmissos() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/reports/omissos?period=${encodeURIComponent(periodo)}`)
      if (resp.ok) {
        const data = await resp.json()
        setOmissos(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadInadimplentes() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/reports/inadimplentes?period=${encodeURIComponent(periodo)}&min=${minDebito || "0"}`)
      if (resp.ok) setInadimplentes(await resp.json())
    } finally { setLoading(false) }
  }

  async function loadRetencoes() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/reports/retencoes?period=${encodeURIComponent(periodo)}`)
      if (resp.ok) setRetencoes(await resp.json())
    } finally { setLoading(false) }
  }

  async function loadLimites() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/reports/limites?ano=${encodeURIComponent(ano)}`)
      if (resp.ok) setLimites(await resp.json())
    } finally { setLoading(false) }
  }

  async function loadDivergentes() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/reports/divergentes?period=${encodeURIComponent(periodo)}`)
      if (resp.ok) setDivergentes(await resp.json())
    } finally { setLoading(false) }
  }

  async function loadRepasses() {
    setLoading(true)
    try {
      const query = new URLSearchParams({ period: periodo })
      if (cnpjFiltro) query.append("cnpj", cnpjFiltro)
      if (repassesMin) query.append("min", repassesMin)
      if (repassesMax) query.append("max", repassesMax)
      if (repassesOrigem) query.append("origin", repassesOrigem)
      const resp = await fetch(`/api/reports/repasses-bb?${query.toString()}`)
      if (resp.ok) setRepasses(await resp.json())
    } finally { setLoading(false) }
  }

  async function loadHistorico() {
    if (!historicoCnpj) return
    setLoading(true)
    try {
      const query = new URLSearchParams({
        cnpj: historicoCnpj,
        months: historicoMeses || "12"
      })
      const resp = await fetch(`/api/reports/historico?${query.toString()}`)
      if (resp.ok) {
        const data = await resp.json()
        setHistorico(data.historico || [])
        setHistoricoMeta({ cnpj: data.cnpj, razaoSocial: data.razaoSocial })
      }
    } finally { setLoading(false) }
  }

  function exportCSV(headers: string[], rows: (string | number)[], filename: string) {
    const content = [headers.join(";"), ...rows.map((r: any) => Array.isArray(r) ? r.join(";") : r)].join("\n")
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportExcel(headers: string[], rows: (string | number)[], filename: string) {
    // CSV lido pelo Excel
    exportCSV(headers, rows, filename.endsWith(".csv") ? filename : `${filename}.csv`)
  }

  function exportPDF(columns: string[], body: any[], filename: string, title: string, orientation: "p" | "l" = "p") {
    const doc = new jsPDF(orientation, "pt")
    if (branding.logoUrl) {
      try {
        const format = branding.logoUrl.includes("image/png") ? "PNG" : "JPEG"
        doc.addImage(branding.logoUrl, format, 40, 30, 60, 60)
      } catch {}
    }
    doc.setFontSize(16)
    doc.text(title, 120, 50)
    doc.setFontSize(10)
    doc.text(branding.cityName || "Prefeitura Municipal", 120, 65)
    if (branding.address) doc.text(branding.address, 120, 78)

    autoTable(doc, {
      startY: 110,
      head: [columns],
      body,
      styles: { fontSize: 9 }
    })
    doc.save(filename)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatorios Oficiais</h2>
          <p className="text-muted-foreground">
            Geracao com filtros, exportacao PDF/CSV/Excel e cabecalho com brasao.
          </p>
        </div>
        {loading && <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />}
      </div>

      <Tabs defaultValue="omissos">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="omissos">Omissos</TabsTrigger>
          <TabsTrigger value="inadimplentes">Inadimplentes</TabsTrigger>
          <TabsTrigger value="retencoes">Retencoes/Aliquotas</TabsTrigger>
          <TabsTrigger value="limites">Sublimites</TabsTrigger>
          <TabsTrigger value="divergentes">Divergentes</TabsTrigger>
          <TabsTrigger value="repasses">Arrecadacao DAF607</TabsTrigger>
          <TabsTrigger value="historico">Historico Contribuinte</TabsTrigger>
        </TabsList>

        <TabsContent value="omissos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Relatorio de Omissos
              </CardTitle>
              <CardDescription>Empresas ativas sem PGDAS no periodo; cruza emissao de NFSe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Periodo (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <Button onClick={loadOmissos}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razao Social","Periodo","NFSe no periodo"],
                  omissos.map(o => [o.cnpj, o.razaoSocial, o.periodo, o.valorNfse ? o.valorNfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00']),
                  "relatorio_omissos.csv"
                )} disabled={!omissos.length}>
                  CSV
                </Button>
                <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razao Social","Periodo","NFSe no periodo"],
                  omissos.map(o => [o.cnpj, o.razaoSocial, o.periodo, o.valorNfse ? o.valorNfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00']),
                  "relatorio_omissos.pdf",
                  "Relatorio de Omissos",
                  "l"
                )} disabled={!omissos.length}>
                  PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>NFSe no periodo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {omissos.map((o) => (
                    <TableRow key={o.companyId}>
                      <TableCell className="font-mono">{o.cnpj}</TableCell>
                      <TableCell>{o.razaoSocial}</TableCell>
                      <TableCell>{o.periodo}</TableCell>
                      <TableCell>R$ {(o.valorNfse || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  {!omissos.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inadimplentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Relatorio de Inadimplentes
              </CardTitle>
              <CardDescription>Quem declarou imposto e nao pagou (cruzamento DAF607).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2">
                  <Label>Periodo (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor minimo do debito (R$)</Label>
                  <Input type="number" value={minDebito} onChange={(e) => setMinDebito(e.target.value)} />
                </div>
                <Button onClick={loadInadimplentes}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razao Social","Valor","Periodo"],
                  inadimplentes.map(i => [i.cnpj, i.razaoSocial, i.valor.toFixed(2), i.periodo]),
                  "relatorio_inadimplentes.csv"
                )} disabled={!inadimplentes.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razao Social","Valor","Periodo"],
                  inadimplentes.map(i => [i.cnpj, i.razaoSocial, i.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), i.periodo]),
                  "relatorio_inadimplentes.pdf",
                  "Relatorio de Inadimplentes",
                  "l"
                )} disabled={!inadimplentes.length}>
      PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                    <TableHead>Valor Devido</TableHead>
                    <TableHead>Periodo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inadimplentes.map((i) => (
                    <TableRow key={i.companyId}>
                      <TableCell className="font-mono">{i.cnpj}</TableCell>
                      <TableCell>{i.razaoSocial}</TableCell>
                      <TableCell>R$ {i.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{i.periodo}</TableCell>
                    </TableRow>
                  ))}
                  {!inadimplentes.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retencoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Relatorio de Retencoes / Aliquotas
              </CardTitle>
              <CardDescription>Divergencia entre aliquota retida na NFS-e e a devida no PGDAS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Periodo (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <Button onClick={loadRetencoes}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razao Social","Descricao","Valor","Periodo"],
                  retencoes.map(r => [r.cnpj, r.razaoSocial, r.descricao, r.valor.toFixed(2), r.periodo]),
                  "relatorio_retencoes.csv"
                )} disabled={!retencoes.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razao Social","Descricao","Valor","Periodo"],
                  retencoes.map(r => [r.cnpj, r.razaoSocial, r.descricao, r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), r.periodo]),
                  "relatorio_retencoes.pdf",
                  "Relatorio de Retencoes e Aliquotas",
                  "l"
                )} disabled={!retencoes.length}>
      PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Periodo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retencoes.map((r) => (
                    <TableRow key={`${r.companyId}-${r.periodo}-${r.descricao}`}>
                      <TableCell className="font-mono">{r.cnpj}</TableCell>
                      <TableCell>{r.razaoSocial}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{r.descricao}</TableCell>
                      <TableCell>R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{r.periodo}</TableCell>
                    </TableRow>
                  ))}
                  {!retencoes.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Monitoramento de Sublimites
              </CardTitle>
              <CardDescription>Empresas que excederam R$ 3,6M ou R$ 4,8M no ano.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, idx) => {
                        const year = new Date().getFullYear() - idx
                        return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadLimites}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razao Social","Tipo","Excesso","Ano"],
                  limites.map(l => [l.cnpj, l.razaoSocial, l.tipo, l.excesso.toFixed(2), l.ano]),
                  "relatorio_limites.csv"
                )} disabled={!limites.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razao Social","Tipo","Excesso","Ano"],
                  limites.map(l => [l.cnpj, l.razaoSocial, l.tipo, l.excesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), l.ano]),
                  "relatorio_limites.pdf",
                  "Monitoramento de Sublimites",
                  "l"
                )} disabled={!limites.length}>
      PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Excesso</TableHead>
                    <TableHead>Ano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limites.map((l) => (
                    <TableRow key={`${l.companyId}-${l.tipo}`}>
                      <TableCell className="font-mono">{l.cnpj}</TableCell>
                      <TableCell>{l.razaoSocial}</TableCell>
                      <TableCell>{l.tipo}</TableCell>
                      <TableCell>R$ {l.excesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{l.ano}</TableCell>
                    </TableRow>
                  ))}
                  {!limites.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="divergentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Relatorio de Divergencias
              </CardTitle>
              <CardDescription>Receita declarada vs NFSe, repasses e sublimites.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2">
                  <Label>Periodo (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <Button onClick={loadDivergentes}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportExcel(
                  ["CNPJ","Razao Social","Tipo","Gravidade","Valor","Periodo","Descricao"],
                  divergentes.map(d => [d.cnpj, d.razaoSocial, d.tipo, d.gravidade, d.valor.toFixed(2), d.periodo, `"${d.descricao}"`]),
                  "relatorio_divergentes.csv"
                )} disabled={!divergentes.length}>
                  CSV/Excel
                </Button>
                <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razao Social","Tipo","Gravidade","Valor","Periodo","Descricao"],
                  divergentes.map(d => [d.cnpj, d.razaoSocial, d.tipo, d.gravidade, d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), d.periodo, d.descricao]),
                  "relatorio_divergentes.pdf",
                  "Relatorio de Divergencias",
                  "l"
                )} disabled={!divergentes.length}>
                  PDF
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Descricao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divergentes.map((d) => (
                    <TableRow key={`${d.companyId}-${d.tipo}-${d.periodo}`}>
                      <TableCell className="font-mono">{d.cnpj}</TableCell>
                      <TableCell>{d.razaoSocial}</TableCell>
                      <TableCell>{d.tipo}</TableCell>
                      <TableCell>{d.gravidade}</TableCell>
                      <TableCell>R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{d.periodo}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{d.descricao}</TableCell>
                    </TableRow>
                  ))}
                  {!divergentes.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repasses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Arrecadacao DAF607
              </CardTitle>
              <CardDescription>Consulta por faixa de valor e origem (SIAFI, Parcelamento, etc.).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2">
                  <Label>Periodo (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Filtro CNPJ (opcional)</Label>
                  <Input value={cnpjFiltro} onChange={(e) => setCnpjFiltro(e.target.value)} placeholder="Somente numeros" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Minimo (R$)</Label>
                  <Input type="number" value={repassesMin} onChange={(e) => setRepassesMin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor Maximo (R$)</Label>
                  <Input type="number" value={repassesMax} onChange={(e) => setRepassesMax(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Input value={repassesOrigem} onChange={(e) => setRepassesOrigem(e.target.value)} placeholder="Ex: SIAFI, Parcelamento" />
                </div>
                <Button onClick={loadRepasses}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportExcel(
                  ["Data","Valor","Origem","Descricao","CNPJ","Razao Social"],
                  repasses.map(r => [
                    new Date(r.date).toLocaleDateString('pt-BR'),
                    r.amount.toFixed(2),
                    r.origin || '',
                    r.description || '',
                    r.cnpj || '',
                    r.razaoSocial || ''
                  ]),
                  "repasses_bb.csv"
                )} disabled={!repasses.length}>
                  CSV/Excel
                </Button>
                <Button variant="outline" onClick={() => exportPDF(
                  ["Data","Valor","Origem","Descricao","CNPJ","Razao Social"],
                  repasses.map(r => [
                    new Date(r.date).toLocaleDateString('pt-BR'),
                    r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    r.origin || '',
                    r.description || '',
                    r.cnpj || '',
                    r.razaoSocial || ''
                  ]),
                  "repasses_bb.pdf",
                  "Repasses Banco do Brasil",
                  "l"
                )} disabled={!repasses.length}>
                  PDF
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razao Social</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repasses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{r.origin}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.description}</TableCell>
                      <TableCell className="font-mono">{r.cnpj || '-'}</TableCell>
                      <TableCell>{r.razaoSocial || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!repasses.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Historico por Contribuinte
              </CardTitle>
              <CardDescription>Serie por mes: PGDAS declarado, NFSe emitida e repasses DAF607.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={historicoCnpj} onChange={(e) => setHistoricoCnpj(e.target.value)} placeholder="Somente numeros" />
                </div>
                <div className="space-y-2">
                  <Label>Meses</Label>
                  <Select value={historicoMeses} onValueChange={setHistoricoMeses}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['6','12','18','24'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadHistorico} disabled={!historicoCnpj}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportExcel(
                  ["Periodo","Receita Declarada","Imposto Declarado","NFSe","Repasses"],
                  historico.map(h => [h.period, h.receitaDeclarada.toFixed(2), h.impostoDeclarado.toFixed(2), h.nfse.toFixed(2), h.repasses.toFixed(2)]),
                  "historico_contribuinte.csv"
                )} disabled={!historico.length}>
                  CSV/Excel
                </Button>
                <Button variant="outline" onClick={() => exportPDF(
                  ["Periodo","Receita Declarada","Imposto Declarado","NFSe","Repasses"],
                  historico.map(h => [h.period, h.receitaDeclarada.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), h.impostoDeclarado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), h.nfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), h.repasses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]),
                  "historico_contribuinte.pdf",
                  "Historico por Contribuinte",
                  "l"
                )} disabled={!historico.length}>
                  PDF
                </Button>
              </div>
              {historicoMeta.cnpj && (
                <div className="text-sm text-muted-foreground">
                  {historicoMeta.razaoSocial} - {historicoMeta.cnpj}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Receita Declarada</TableHead>
                    <TableHead>Imposto Declarado</TableHead>
                    <TableHead>NFSe</TableHead>
                    <TableHead>Repasses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((h) => (
                    <TableRow key={h.period}>
                      <TableCell>{h.period}</TableCell>
                      <TableCell>R$ {h.receitaDeclarada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>R$ {h.impostoDeclarado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>R$ {h.nfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>R$ {h.repasses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  {!historico.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
