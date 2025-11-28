"use client"

import { useParams } from "next/navigation"
import { companies, divergences } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, AlertTriangle, FileText, Activity, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function ContribuinteDetailsPage() {
    const params = useParams()
    const company = companies.find(c => c.id === params.id)
    const companyDivergences = divergences.filter(d => d.companyId === params.id)

    if (!company) {
        return <div>Contribuinte não encontrado</div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/contribuintes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
                    <p className="text-muted-foreground">
                        CNPJ: {company.cnpj} • {company.regime}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    {company.risk === "Alto" && <Badge variant="destructive" className="text-lg px-4 py-1">Risco Alto</Badge>}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Declarado (12 meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {company.revenue_declared.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Real (Cruzamento)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {company.revenue_real.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Baseado em NFS-e e Cartões
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Situação Cadastral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${company.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-bold">{company.status}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="divergencias" className="w-full">
                <TabsList>
                    <TabsTrigger value="divergencias">Divergências e Alertas</TabsTrigger>
                    <TabsTrigger value="historico">Histórico Fiscal</TabsTrigger>
                    <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
                </TabsList>
                <TabsContent value="divergencias" className="space-y-4">
                    {companyDivergences.length > 0 ? (
                        companyDivergences.map(div => (
                            <Card key={div.id} className="border-l-4 border-l-red-500">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-red-600">
                                                <AlertTriangle className="h-5 w-5" />
                                                {div.type}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                Detectado em: {div.date}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline">{div.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p>{div.description}</p>
                                    <p className="font-bold mt-2">Diferença apurada: R$ {div.value.toLocaleString()}</p>
                                    <div className="mt-4 flex gap-2">
                                        <Button size="sm">Notificar Contribuinte</Button>
                                        <Button size="sm" variant="outline">Ver Detalhes</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="pt-6 flex flex-col items-center justify-center text-muted-foreground h-40">
                                <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
                                <p>Nenhuma divergência encontrada.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="historico">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Declarações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Histórico detalhado mês a mês (PGDAS, DEFIS, etc.) seria exibido aqui.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="dados">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-semibold block">Razão Social</span>
                                    <span>{company.name}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block">CNPJ</span>
                                    <span>{company.cnpj}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block">CNAE Principal</span>
                                    <span>{company.cnae}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block">Endereço</span>
                                    <span>Rua das Flores, 123 - Centro</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

