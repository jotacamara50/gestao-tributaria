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
}

type ParcelResp = {
  resumo: { empresasParcelamento: number; empresasParcelamentoAtraso: number }
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

  async function carregar() {
    try {
      setLoading(true)
      setError(null)
      const urls = [
        fetch("/api/sn/dashboard").then((r) => r.json()),
        fetch("/api/sn/crossings").then((r) => r.json()),
        fetch("/api/sn/parcelamentos").then((r) => r.json()),
        fetch("/api/sn/mei").then((r) => r.json()),
        fetch("/api/sn/riscos").then((r) => r.json()),
        fetch("/api/sn/iss").then((r) => r.json()),
        fetch("/api/sn/defis").then((r) => r.json()),
        fetch("/api/sn/guias").then((r) => r.json()),
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
  }, [])

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cobertura Simples Nacional</h1>
          <p className="text-muted-foreground">Visões e cruzamentos dos últimos 5 anos</p>
        </div>
        <Button variant="outline" onClick={carregar}>Atualizar</Button>
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
            <CardTitle>Parcelamentos</CardTitle>
            <CardDescription>Empresas com acordo e em atraso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Total com parcelamento: {parc?.resumo.empresasParcelamento ?? 0}</div>
            <div>Com atraso: {parc?.resumo.empresasParcelamentoAtraso ?? 0}</div>
            <div>Valor em atraso (últ. mês): {currency.format(parc?.series.valorAtraso.slice(-1)[0]?.valor || 0)}</div>
            <div>Valor em aberto (últ. mês): {currency.format(parc?.series.valorAberto.slice(-1)[0]?.valor || 0)}</div>
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
              <Badge>Medio: {riscos?.resumo.medio ?? 0}</Badge>
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
