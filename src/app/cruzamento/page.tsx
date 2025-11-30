"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type SerieValor = { competencia: string; valor: number }

type DashboardResp = {
  totais: {
    empresas: number
    mei: number
    receitaPrevista12m: number
    receitaDeclarada12m: number
    nfse12m: number
    parcelamentosAtivos: number
    parcelasEmAtraso: number
    valorAtraso: number
    valorAReceber: number
  }
  alertas: string[]
}

type CrossingResp = {
  omissos: Array<{ cnpj: string; name: string; competencias: string[] }>
  divergenciasBase: Array<{ cnpj: string; name: string; competencia: string; diferenca: number }>
  retencao: Array<{ cnpj: string; name: string; competencia: string; diferenca: number }>
  isencaoIrregular: Array<{ cnpj: string; name: string; competencia: string; notas: number }>
  outroMunicipio: Array<{ cnpj: string; name: string; competencia: string; notas: number }>
  sublimite36: Array<{ cnpj: string; name: string; receita12m: number }>
  limite48: Array<{ cnpj: string; name: string; receita12m: number }>
  inadimplentes: Array<{ cnpj: string; name: string; competencia: string; devido: number; pago: number; diferenca: number }>
  repassesSerie: SerieValor[]
  declararamSemNFSe: Array<{ cnpj: string; name: string; competencia: string; receitaDeclarada: number }>
  declararamComNFSe: Array<{ cnpj: string; name: string; competencia: string; receitaDeclarada: number; baseNFSe: number; diferenca: number }>
  nfsePorItem: Array<{ competencia: string; itemServico: string; quantidade: number; baseCalculo: number; issEstimado: number }>
  nfsePorCnae: Array<{ competencia: string; cnae: string; quantidade: number; baseCalculo: number; issEstimado: number }>
  nfseTomadas: Array<{ competencia: string; tomadorCnpj: string; quantidade: number; baseCalculo: number }>
  repassesFaixa: Array<{ faixa: string; valor: number }>
  repassesOrigem: Array<{ origem: string; valor: number }>
}

type ParcelResp = {
  resumo: { empresasParcelamento: number; empresasParcelamentoAtraso: number }
  empresasAtraso?: Array<{ cnpj: string; name: string; parcelas: number; valor: number }>
  series: { valorAtraso: SerieValor[]; valorAberto: SerieValor[] }
}

type MeiResp = {
  resumo: { empresasMei: number }
  series: { omissos: SerieValor[] }
}

type RiscoResp = {
  resumo: { critico: number; alto: number; medio: number; baixo: number }
  empresas: Array<{ cnpj: string; name: string; risco: string; divergencia: number; omissos: number }>
}

type IssResp = {
  series: { issLocal: SerieValor[]; issFora: SerieValor[] }
  retencaoDivergente: Array<{ cnpj: string; name: string; competencia: string; diferenca: number }>
  issOutroMunicipio: Array<{ cnpj: string; name: string; competencia: string; valor: number }>
}

type DefisResp = {
  resumo: Array<{ exercicio: number; empresas: number; socios: number; rendimentoSocios: number }>
}

type GuiasResp = {
  series: { emitidas: SerieValor[]; pagas: SerieValor[]; iss: SerieValor[] }
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

export default function CruzamentoSNPage() {
  const [dash, setDash] = useState<DashboardResp | null>(null)
  const [cross, setCross] = useState<CrossingResp | null>(null)
  const [parc, setParc] = useState<ParcelResp | null>(null)
  const [mei, setMei] = useState<MeiResp | null>(null)
  const [riscos, setRiscos] = useState<RiscoResp | null>(null)
  const [iss, setIss] = useState<IssResp | null>(null)
  const [defis, setDefis] = useState<DefisResp | null>(null)
  const [guias, setGuias] = useState<GuiasResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<"12m" | "5a">("5a")

  async function carregar() {
    try {
      setLoading(true)
      setError(null)
      const anos = periodo === "5a" ? 5 : 1
      const urls = [
        fetch(`/api/sn/dashboard?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/crossings?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/parcelamentos?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/mei?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/riscos?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/iss?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/defis?anos=${anos}`).then((r) => r.json()),
        fetch(`/api/sn/guias?anos=${anos}`).then((r) => r.json()),
      ]
      const [
        dashData,
        crossData,
        parcelData,
        meiData,
        riscoData,
        issData,
        defisData,
        guiasData,
      ] = await Promise.all(urls)

      if (dashData.error) throw new Error(dashData.error)
      setDash(dashData)
      setCross(crossData)
      setParc(parcelData)
      setMei(meiData)
      setRiscos(riscoData)
      setIss(issData)
      setDefis(defisData)
      setGuias(guiasData)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar cruzamentos"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  if (loading) {
    return <div className="p-6">Carregando visões do Simples Nacional...</div>
  }
  if (error) {
    return (
      <div className="p-6 text-red-600">
        Erro: {error} <Button variant="outline" onClick={carregar} className="ml-2">Tentar novamente</Button>
      </div>
    )
  }

  const top = <T,>(arr: T[] | undefined, n = 5): T[] => (Array.isArray(arr) ? arr.slice(0, n) : [])
  const periodoLabel = periodo === "5a" ? "últimos 5 anos" : "últimos 12 meses"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Cobertura Simples Nacional</h1>
          <p className="text-muted-foreground">Visões e cruzamentos dos {periodoLabel}</p>
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
          <Button variant="outline" onClick={carregar}>Atualizar</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Total / MEI</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {dash?.totais.empresas ?? 0} <span className="text-sm text-muted-foreground">({dash?.totais.mei ?? 0} MEI)</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Receita PGDAS (12m)</CardTitle>
            <CardDescription>Prevista / Declarada</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {currency.format(dash?.totais.receitaPrevista12m || 0)}
            <div className="text-sm text-muted-foreground">Declarada: {currency.format(dash?.totais.receitaDeclarada12m || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>NFSe (12m)</CardTitle>
            <CardDescription>Base de comparação</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {currency.format(dash?.totais.nfse12m || 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Parcelamentos</CardTitle>
            <CardDescription>Ativos / atraso</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold space-y-1">
            <div>Ativos: {dash?.totais.parcelamentosAtivos ?? 0}</div>
            <div>Parcelas atraso: {dash?.totais.parcelasEmAtraso ?? 0}</div>
            <div className="text-sm text-muted-foreground">
              Valor atraso: {currency.format(dash?.totais.valorAtraso || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Inadimplentes (DAF607)</CardTitle>
            <CardDescription>Repasses vs PGDAS</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold space-y-1">
            <div>Total competências: {cross?.inadimplentes?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">
              Últ. comp.: {currency.format(cross?.inadimplentes?.slice(-1)[0]?.diferenca || 0)} em aberto
            </div>
          </CardContent>
        </Card>
      </div>

      {dash?.alertas?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Alertas Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.alertas.map((a, i) => (
              <div key={i} className="text-sm text-destructive">{a}</div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Omissos (sem PGDAS e com NFSe)</CardTitle>
            <CardDescription>Top 5 empresas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Competências</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.omissos).map((o, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{o.name}<div className="text-xs text-muted-foreground">{o.cnpj}</div></TableCell>
                    <TableCell className="text-xs">{o.competencias.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Divergência de base (NFSe &gt; PGDAS)</CardTitle>
            <CardDescription>Top 5 competências</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.divergenciasBase?.sort((a, b) => b.diferenca - a.diferenca)).map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{d.name}<div className="text-xs text-muted-foreground">{d.cnpj}</div></TableCell>
                    <TableCell>{d.competencia}</TableCell>
                    <TableCell className="text-right text-destructive">{currency.format(d.diferenca || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Declararam PGDAS e não emitiram NFSe</CardTitle>
            <CardDescription>Receita declarada sem notas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.declararamSemNFSe).map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{d.name}<div className="text-xs text-muted-foreground">{d.cnpj}</div></TableCell>
                    <TableCell>{d.competencia}</TableCell>
                    <TableCell className="text-right">{currency.format(d.receitaDeclarada || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.declararamSemNFSe?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">Sem registros.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Declararam PGDAS e emitiram NFSe</CardTitle>
            <CardDescription>Diferença entre declarado x notas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Dif.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.declararamComNFSe?.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))).map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{d.name}<div className="text-xs text-muted-foreground">{d.cnpj}</div></TableCell>
                    <TableCell>{d.competencia}</TableCell>
                    <TableCell className="text-right">{currency.format(d.diferenca || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.declararamComNFSe?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">Sem registros.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retenção ISS divergente</CardTitle>
            <CardDescription>Notas com ISS retido diferente do declarado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Dif.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(iss?.retencaoDivergente?.sort((a, b) => b.diferenca - a.diferenca)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.cnpj}</div></TableCell>
                    <TableCell>{r.competencia}</TableCell>
                    <TableCell className="text-right text-destructive">{currency.format(r.diferenca || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ISS fora do município</CardTitle>
            <CardDescription>Notas com prestação em outro município</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(iss?.issOutroMunicipio?.sort((a, b) => b.valor - a.valor)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.cnpj}</div></TableCell>
                    <TableCell>{r.competencia}</TableCell>
                    <TableCell className="text-right text-destructive">{currency.format(r.valor || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inadimplência (PGDAS x DAF607)</CardTitle>
            <CardDescription>Diferenças por competência</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Dif.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.inadimplentes?.sort((a, b) => b.diferenca - a.diferenca)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.cnpj}</div></TableCell>
                    <TableCell>{r.competencia}</TableCell>
                    <TableCell className="text-right text-destructive">{currency.format(r.diferenca || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Repasses DAF607</CardTitle>
            <CardDescription>Série consolidada</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comp</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.repassesSerie?.slice().reverse()).map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{s.competencia}</TableCell>
                    <TableCell className="text-right">{currency.format(s.valor || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repasses por faixa de valor</CardTitle>
            <CardDescription>Classificação dos repasses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.repassesFaixa?.sort((a, b) => b.valor - a.valor)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.faixa}</TableCell>
                    <TableCell className="text-right">{currency.format(r.valor || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.repassesFaixa?.length && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">Sem repasses no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Repasses por origem</CardTitle>
            <CardDescription>Origem/identificador</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.repassesOrigem?.sort((a, b) => b.valor - a.valor)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.origem}</TableCell>
                    <TableCell className="text-right">{currency.format(r.valor || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.repassesOrigem?.length && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">Sem repasses no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NFSe por Item de Serviço</CardTitle>
          <CardDescription>Base e ISS estimado por competência</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comp</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">ISS Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top(cross?.nfsePorItem?.sort((a, b) => b.baseCalculo - a.baseCalculo), 10).map((n, idx) => (
                <TableRow key={idx}>
                  <TableCell>{n.competencia}</TableCell>
                  <TableCell>{n.itemServico}</TableCell>
                  <TableCell>{n.quantidade}</TableCell>
                  <TableCell className="text-right">{currency.format(n.baseCalculo || 0)}</TableCell>
                  <TableCell className="text-right">{currency.format(n.issEstimado || 0)}</TableCell>
                </TableRow>
              ))}
              {!cross?.nfsePorItem?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Sem notas no período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>NFSe por CNAE/Item</CardTitle>
            <CardDescription>Base e ISS estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comp</TableHead>
                  <TableHead>CNAE</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">ISS Est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.nfsePorCnae?.sort((a, b) => b.baseCalculo - a.baseCalculo), 10).map((n, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{n.competencia}</TableCell>
                    <TableCell>{n.cnae}</TableCell>
                    <TableCell>{n.quantidade}</TableCell>
                    <TableCell className="text-right">{currency.format(n.baseCalculo || 0)}</TableCell>
                    <TableCell className="text-right">{currency.format(n.issEstimado || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.nfsePorCnae?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">Sem notas no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>NFSe tomadas (tomador)</CardTitle>
            <CardDescription>Notas por CNPJ tomador</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comp</TableHead>
                  <TableHead>Tomador</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.nfseTomadas?.sort((a, b) => b.baseCalculo - a.baseCalculo), 10).map((n, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{n.competencia}</TableCell>
                    <TableCell>{n.tomadorCnpj}</TableCell>
                    <TableCell>{n.quantidade}</TableCell>
                    <TableCell className="text-right">{currency.format(n.baseCalculo || 0)}</TableCell>
                  </TableRow>
                ))}
                {!cross?.nfseTomadas?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">Sem notas no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parcelamentos</CardTitle>
            <CardDescription>Empresas com acordo e em atraso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Total com parcelamento: {parc?.resumo.empresasParcelamento ?? 0}</div>
            <div>Com atraso: {parc?.resumo.empresasParcelamentoAtraso ?? 0}</div>
            <div>Valor em atraso (últ. mês): {currency.format(parc?.series.valorAtraso.slice(-1)[0]?.valor || 0)}</div>
            <div>Valor em aberto (últ. mês): {currency.format(parc?.series.valorAberto.slice(-1)[0]?.valor || 0)}</div>
            <div className="pt-2">
              <div className="font-semibold text-sm mb-1">Empresas com parcelas em atraso</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top(parc?.empresasAtraso).map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{e.name}<div className="text-xs text-muted-foreground">{e.cnpj}</div></TableCell>
                      <TableCell>{e.parcelas}</TableCell>
                      <TableCell className="text-right">{currency.format(e.valor || 0)}</TableCell>
                    </TableRow>
                  ))}
                  {!parc?.empresasAtraso?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-sm">Sem parcelas em atraso.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MEI</CardTitle>
            <CardDescription>Entregas e omissos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Empresas MEI: {mei?.resumo.empresasMei ?? 0}</div>
            <div>Omissos (últ. mês): {mei?.series.omissos.slice(-1)[0]?.valor ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risco fiscal</CardTitle>
            <CardDescription>Classificação por divergência/omissão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="destructive">Crítico: {riscos?.resumo.critico ?? 0}</Badge>
              <Badge variant="secondary">Alto: {riscos?.resumo.alto ?? 0}</Badge>
              <Badge>Médio: {riscos?.resumo.medio ?? 0}</Badge>
              <Badge variant="outline">Baixo: {riscos?.resumo.baixo ?? 0}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead className="text-right">Diverg.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(riscos?.empresas?.sort((a, b) => b.divergencia - a.divergencia)).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.cnpj}</div></TableCell>
                    <TableCell>{r.risco}</TableCell>
                    <TableCell className="text-right text-destructive">{currency.format(r.divergencia || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>DEFIS (últimos anos)</CardTitle>
            <CardDescription>Resumo por exercício</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercício</TableHead>
                  <TableHead>Empresas</TableHead>
                  <TableHead>Sócios</TableHead>
                  <TableHead className="text-right">Rend. Sócios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(defis?.resumo, 10).map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{d.exercicio}</TableCell>
                    <TableCell>{d.empresas}</TableCell>
                    <TableCell>{d.socios}</TableCell>
                    <TableCell className="text-right">{currency.format(d.rendimentoSocios || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Isenção/Imunidade e Sub/Desenquadramento</CardTitle>
          <CardDescription>Casos identificados em cruzamentos</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold mb-2">Isenção/Imunidade sem autorização</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comp</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top(cross?.isencaoIrregular).map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{i.name}<div className="text-xs text-muted-foreground">{i.cnpj}</div></TableCell>
                    <TableCell>{i.competencia}</TableCell>
                    <TableCell>{currency.format(i.notas || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Sublimite/Desenquadramento</h4>
            <div className="space-y-2">
              <div>Acima de 4.8M: {cross?.limite48?.length || 0}</div>
              <div>Acima de 3.6M: {cross?.sublimite36?.length || 0}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Receita 12m</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top(cross?.limite48 || [], 5).map((l, idx) => (
                    <TableRow key={`l${idx}`}>
                      <TableCell>{l.name}<div className="text-xs text-muted-foreground">{l.cnpj}</div></TableCell>
                      <TableCell>{currency.format(l.receita12m || 0)}</TableCell>
                    </TableRow>
                  ))}
                  {top(cross?.sublimite36 || [], 5).map((l, idx) => (
                    <TableRow key={`s${idx}`}>
                      <TableCell>{l.name}<div className="text-xs text-muted-foreground">{l.cnpj}</div></TableCell>
                      <TableCell>{currency.format(l.receita12m || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
