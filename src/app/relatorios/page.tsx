"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Download, Filter, AlertTriangle } from "lucide-react"
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

type Settings = {
  logoUrl?: string | null
  cityName?: string | null
  address?: string | null
}

const meses = [
  "01","02","03","04","05","06","07","08","09","10","11","12"
]

function todayPeriod() {
  const d = new Date()
  const mm = `${d.getMonth() + 1}`.padStart(2, "0")
  return `${mm}/${d.getFullYear()}`
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState(todayPeriod())
  const [periodoFim, setPeriodoFim] = useState(todayPeriod())
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [minDebito, setMinDebito] = useState("0")
  const [settings, setSettings] = useState<Settings>({})

  const [omissos, setOmissos] = useState<OmissosItem[]>([])
  const [inadimplentes, setInadimplentes] = useState<InadimplenteItem[]>([])
  const [retencoes, setRetencoes] = useState<RetencaoItem[]>([])
  const [limites, setLimites] = useState<LimiteItem[]>([])
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
          <h2 className="text-3xl font-bold tracking-tight">Relatórios Oficiais</h2>
          <p className="text-muted-foreground">
            Geração com filtros, exportação PDF/CSV e cabeçalho com brasão.
          </p>
        </div>
        {loading && <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />}
      </div>

      <Tabs defaultValue="omissos">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="omissos">Omissos</TabsTrigger>
          <TabsTrigger value="inadimplentes">Inadimplentes</TabsTrigger>
          <TabsTrigger value="retencoes">Retenções/Alíquotas</TabsTrigger>
          <TabsTrigger value="limites">Sublimites</TabsTrigger>
        </TabsList>

        <TabsContent value="omissos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Relatório de Omissos
              </CardTitle>
              <CardDescription>Empresas ativas sem PGDAS no período; cruza emissão de NFSe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Período (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <Button onClick={loadOmissos}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razão Social","Período","NFSe no período"],
                  omissos.map(o => [o.cnpj, o.razaoSocial, o.periodo, o.valorNfse ? o.valorNfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00']),
                  "relatorio_omissos.csv"
                )} disabled={!omissos.length}>
                  CSV
                </Button>
                <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razão Social","Período","NFSe no período"],
                  omissos.map(o => [o.cnpj, o.razaoSocial, o.periodo, o.valorNfse ? o.valorNfse.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00']),
                  "relatorio_omissos.pdf",
                  "Relatório de Omissos",
                  "l"
                )} disabled={!omissos.length}>
                  PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>NFSe no período</TableHead>
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
                <FileSpreadsheet className="h-5 w-5" /> Relatório de Inadimplentes
              </CardTitle>
              <CardDescription>Quem declarou imposto e não pagou (cruzamento DAF607).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="space-y-2">
                  <Label>Período (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor mínimo do débito (R$)</Label>
                  <Input type="number" value={minDebito} onChange={(e) => setMinDebito(e.target.value)} />
                </div>
                <Button onClick={loadInadimplentes}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razão Social","Valor","Período"],
                  inadimplentes.map(i => [i.cnpj, i.razaoSocial, i.valor.toFixed(2), i.periodo]),
                  "relatorio_inadimplentes.csv"
                )} disabled={!inadimplentes.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razão Social","Valor","Período"],
                  inadimplentes.map(i => [i.cnpj, i.razaoSocial, i.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), i.periodo]),
                  "relatorio_inadimplentes.pdf",
                  "Relatório de Inadimplentes",
                  "l"
                )} disabled={!inadimplentes.length}>
      PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Valor Devido</TableHead>
                    <TableHead>Período</TableHead>
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
                <FileSpreadsheet className="h-5 w-5" /> Relatório de Retenções / Alíquotas
              </CardTitle>
              <CardDescription>Divergência entre alíquota retida na NFS-e e a devida no PGDAS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Período (MM/AAAA)</Label>
                  <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <Button onClick={loadRetencoes}>
                  <Filter className="mr-2 h-4 w-4" /> Gerar
                </Button>
                <Button variant="outline" onClick={() => exportCSV(
                  ["CNPJ","Razão Social","Descrição","Valor","Período"],
                  retencoes.map(r => [r.cnpj, r.razaoSocial, r.descricao, r.valor.toFixed(2), r.periodo]),
                  "relatorio_retencoes.csv"
                )} disabled={!retencoes.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razão Social","Descrição","Valor","Período"],
                  retencoes.map(r => [r.cnpj, r.razaoSocial, r.descricao, r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), r.periodo]),
                  "relatorio_retencoes.pdf",
                  "Relatório de Retenções e Alíquotas",
                  "l"
                )} disabled={!retencoes.length}>
      PDF
    </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Período</TableHead>
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
                  ["CNPJ","Razão Social","Tipo","Excesso","Ano"],
                  limites.map(l => [l.cnpj, l.razaoSocial, l.tipo, l.excesso.toFixed(2), l.ano]),
                  "relatorio_limites.csv"
                )} disabled={!limites.length}>
                  CSV
                </Button>
    <Button variant="outline" onClick={() => exportPDF(
                  ["CNPJ","Razão Social","Tipo","Excesso","Ano"],
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
                    <TableHead>Razão Social</TableHead>
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
      </Tabs>
    </div>
  )
}
