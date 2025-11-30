"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type SerieValor = { competencia: string; valor: number }

type Guia = {
  id: string
  numero: string
  periodo: string
  dataEmissao: string
  vencimento: string
  situacao: string
  valorTotal: number
  pagoEm?: string | null
  valorPago?: number | null
}

type Parcela = {
  id: string
  numero: number
  vencimento: string
  valor: number
  situacao: string
  pagoEm?: string | null
  valorPago?: number | null
}

type Parcelamento = {
  id: string
  numero: string
  situacao: string
  valorTotal: number
  quantidadeParcelas: number
  tipo?: string | null
  dataPedido: string
  dataSituacao?: string | null
  parcelas: Parcela[]
}

type Defis = {
  id: string
  exercicio: number
  recibo?: string | null
  codigoAutenticacao?: string | null
}

type Enq = { regime: string; isMei: boolean; startDate: string; endDate?: string | null; reason?: string | null }

type DetalheResp = {
  company: {
    id: string
    name: string
    cnpj: string
    regime: string
    isMei: boolean
    enquadramento: Enq[]
  }
  alertas: string[]
  series: {
    arrecadacaoPrevista: SerieValor[]
    receitaDeclarada: SerieValor[]
    nfse: SerieValor[]
    guiasEmitidas: SerieValor[]
    guiasPagas: SerieValor[]
    iss: SerieValor[]
  }
  guias: Guia[]
  parcelamentos: Parcelamento[]
  defis: Defis[]
  resumo: {
    receita12m: number
    parcelasEmAtraso: number
    valorParcelasAtraso: number
    valorParcelasAberto: number
  }
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

function sanitizeCnpj(raw: string) {
  return (raw || "").replace(/[^\d]/g, "")
}

export default function ContribuinteSNPage() {
  const [cnpj, setCnpj] = useState("")
  const [dados, setDados] = useState<DetalheResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    const digits = sanitizeCnpj(cnpj)
    if (digits.length !== 14) {
      setError("CNPJ inválido")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/sn/contribuinte/${digits}`)
      const data = await resp.json()
      if (!resp.ok || data.error) {
        throw new Error(data.error || "Falha ao buscar contribuinte")
      }
      setDados(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao buscar contribuinte"
      setError(message)
      setDados(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const param = url.searchParams.get("cnpj")
    if (param) {
      setCnpj(param)
      buscar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topSeries = (serie?: SerieValor[], n = 6) => (Array.isArray(serie) ? serie.slice(-n) : [])

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ficha do Contribuinte - Simples Nacional</h1>
          <p className="text-muted-foreground">Histórico e cruzamentos (últimos 5 anos)</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="grid gap-1">
            <label className="text-sm font-medium">CNPJ</label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="Digite o CNPJ" />
          </div>
          <Button onClick={buscar} disabled={loading || !cnpj}>Buscar</Button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {dados && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{dados.company.name}</CardTitle>
              <CardDescription>{dados.company.cnpj} • Regime: {dados.company.regime} {dados.company.isMei ? "• MEI" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 flex-wrap">
              {dados.alertas.map((a, i) => (
                <Badge key={i} variant="destructive">{a}</Badge>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Receita 12m</CardTitle>
                <CardDescription>Declarada (PGDAS)</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{currency.format(dados.resumo.receita12m || 0)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Parcelas em atraso</CardTitle>
                <CardDescription>Qtd / Valor</CardDescription>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {dados.resumo.parcelasEmAtraso} <span className="text-sm text-muted-foreground">({currency.format(dados.resumo.valorParcelasAtraso || 0)})</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Parcelas em aberto</CardTitle>
                <CardDescription>Valor total</CardDescription>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {currency.format(dados.resumo.valorParcelasAberto || 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Guias emitidas (últ. comp.)</CardTitle>
                <CardDescription>Emitidas / Pagas</CardDescription>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {currency.format(dados.series.guiasEmitidas.slice(-1)[0]?.valor || 0)}
                <div className="text-sm text-muted-foreground">
                  Pagas: {currency.format(dados.series.guiasPagas.slice(-1)[0]?.valor || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Séries recentes</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-2">PGDAS x NFSe</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comp</TableHead>
                      <TableHead className="text-right">PGDAS</TableHead>
                      <TableHead className="text-right">NFSe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSeries(dados.series.arrecadacaoPrevista).map((s, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{s.competencia}</TableCell>
                        <TableCell className="text-right">{currency.format(s.valor || 0)}</TableCell>
                        <TableCell className="text-right">{currency.format(dados.series.nfse[idx]?.valor || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Guias emitidas/pagas</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comp</TableHead>
                      <TableHead className="text-right">Emitidas</TableHead>
                      <TableHead className="text-right">Pagas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSeries(dados.series.guiasEmitidas).map((s, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{s.competencia}</TableCell>
                        <TableCell className="text-right">{currency.format(s.valor || 0)}</TableCell>
                        <TableCell className="text-right">{currency.format(dados.series.guiasPagas[idx]?.valor || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">ISS em guias</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comp</TableHead>
                      <TableHead className="text-right">ISS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSeries(dados.series.iss).map((s, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{s.competencia}</TableCell>
                        <TableCell className="text-right">{currency.format(s.valor || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcelamentos</CardTitle>
              <CardDescription>Composição e parcelas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dados.parcelamentos.length === 0 && <div className="text-sm text-muted-foreground">Nenhum parcelamento</div>}
              {dados.parcelamentos.map((p) => (
                <div key={p.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <div className="font-semibold">Parcelamento {p.numero}</div>
                    <Badge variant={p.situacao.toLowerCase() === "ativo" ? "default" : "secondary"}>{p.situacao}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Valor total: {currency.format(p.valorTotal)} • Parc.: {p.quantidadeParcelas} • Pedido: {new Date(p.dataPedido).toLocaleDateString("pt-BR")}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.parcelas.map((pa) => (
                        <TableRow key={pa.id}>
                          <TableCell>{pa.numero}</TableCell>
                          <TableCell>{new Date(pa.vencimento).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{pa.situacao}</TableCell>
                          <TableCell className="text-right">
                            {currency.format(pa.valor)} {pa.pagoEm ? <span className="text-xs text-muted-foreground">(pago)</span> : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guias</CardTitle>
              <CardDescription>Emissões e pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.guias.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.numero}</TableCell>
                      <TableCell>{g.periodo}</TableCell>
                      <TableCell>{new Date(g.vencimento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{g.situacao}</TableCell>
                      <TableCell className="text-right">{currency.format(g.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DEFIS</CardTitle>
              <CardDescription>Últimos exercícios</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercício</TableHead>
                    <TableHead>Recibo</TableHead>
                    <TableHead>Cód. Autenticação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.defis.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.exercicio}</TableCell>
                      <TableCell>{d.recibo || "-"}</TableCell>
                      <TableCell>{d.codigoAutenticacao || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
