"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
    ArrowLeft, 
    AlertTriangle, 
    TrendingUp,
    Calendar,
    DollarSign,
    Users,
    FileText,
    Building2,
    Phone,
    Mail,
    MapPin,
    Clock,
    CheckCircle,
    XCircle
} from "lucide-react"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CompanyData {
    id: string
    cnpj: string
    name: string
    tradeName: string | null
    cnae: string
    regime: string
    status: string
    riskLevel: string
    address: string | null
    phone: string | null
    email: string | null
    createdAt: string
    partners: Array<{
        id: string
        name: string
        cpf: string
        role: string
        startDate: string
        endDate: string | null
    }>
    declarations: Array<{
        id: string
        period: string
        type: string
        revenue: number
        taxDue: number
        createdAt: string
    }>
    invoices: Array<{
        id: string
        number: string
        issueDate: string
        value: number
        serviceCode: string | null
        tomadorCnpj: string | null
    }>
    divergences: Array<{
        id: string
        type: string
        description: string
        value: number
        status: string
        detectedAt: string
    }>
    enquadramentoHistory: Array<{
        id: string
        regime: string
        startDate: string
        endDate: string | null
        reason: string | null
    }>
    dteMessages: Array<{
        id: string
        type: string
        subject: string
        sentAt: string
        readAt: string | null
    }>
}

export default function ContribuinteDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [company, setCompany] = useState<CompanyData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadCompanyDetails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id])

    const loadCompanyDetails = async () => {
        try {
            const response = await fetch(`/api/companies/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setCompany(data)
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando dados...</p>
                </div>
            </div>
        )
    }

    if (!company) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold mb-2">Contribuinte não encontrado</h2>
                <Button onClick={() => router.push('/contribuintes')}>
                    Voltar para lista
                </Button>
            </div>
        )
    }

    // Calcular estatísticas
    const totalFaturamento = company.declarations.reduce((sum, d) => sum + d.revenue, 0)
    const totalImpostos = company.declarations.reduce((sum, d) => sum + d.taxDue, 0)
    const totalNFSe = company.invoices.reduce((sum, i) => sum + i.value, 0)
    const divergenciasPendentes = company.divergences.filter(d => d.status === 'Pendente').length

    // Dados para gráficos
    const declarationsChart = company.declarations
        .sort((a, b) => a.period.localeCompare(b.period))
        .slice(-12)
        .map(d => ({
            periodo: d.period,
            receita: d.revenue,
            imposto: d.taxDue
        }))

    const getRiskBadge = (risk: string) => {
        const variants: Record<string, { variant: "default" | "destructive" | "secondary", className?: string }> = {
            'Crítico': { variant: 'destructive' },
            'Alto': { variant: 'destructive' },
            'Médio': { variant: 'default', className: 'bg-orange-500' },
            'Baixo': { variant: 'secondary' }
        }
        const config = variants[risk] || { variant: 'secondary' }
        return <Badge variant={config.variant} className={config.className}>{risk}</Badge>
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Cabeçalho */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/contribuintes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                    <p className="text-muted-foreground">
                        CNPJ: {company.cnpj} • {company.regime}
                    </p>
                </div>
                <div className="flex gap-2">
                    {getRiskBadge(company.riskLevel)}
                    <Badge variant={company.status === 'Ativo' ? 'default' : 'secondary'}>
                        {company.status}
                    </Badge>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Faturamento Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">{company.declarations.length} declarações</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Total NFSe
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            R$ {totalNFSe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">{company.invoices.length} notas emitidas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            ISS Devido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            R$ {totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {totalFaturamento > 0 ? ((totalImpostos / totalFaturamento) * 100).toFixed(2) : '0.00'}% do faturamento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            Divergências
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{divergenciasPendentes}</div>
                        <p className="text-xs text-muted-foreground">
                            {company.divergences.length} total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="resumo" className="space-y-4">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                    <TabsTrigger value="declaracoes">Declarações</TabsTrigger>
                    <TabsTrigger value="nfse">NFSe</TabsTrigger>
                    <TabsTrigger value="socios">Sócios</TabsTrigger>
                    <TabsTrigger value="divergencias">Divergências</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                    <TabsTrigger value="dte">DTE</TabsTrigger>
                </TabsList>

                {/* Aba Resumo */}
                <TabsContent value="resumo" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Dados Cadastrais */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Dados Cadastrais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium">Razão Social</p>
                                    <p className="text-sm text-muted-foreground">{company.name}</p>
                                </div>
                                {company.tradeName && (
                                    <div>
                                        <p className="text-sm font-medium">Nome Fantasia</p>
                                        <p className="text-sm text-muted-foreground">{company.tradeName}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium">CNAE</p>
                                    <p className="text-sm text-muted-foreground">{company.cnae}</p>
                                </div>
                                {company.address && (
                                    <div className="flex gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <p className="text-sm text-muted-foreground">{company.address}</p>
                                    </div>
                                )}
                                {company.phone && (
                                    <div className="flex gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <p className="text-sm text-muted-foreground">{company.phone}</p>
                                    </div>
                                )}
                                {company.email && (
                                    <div className="flex gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <p className="text-sm text-muted-foreground">{company.email}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Gráfico de Evolução */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Evolução de Receita (12 meses)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {declarationsChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={declarationsChart}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="periodo" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip 
                                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="receita" stroke="#8884d8" name="Receita" />
                                            <Line type="monotone" dataKey="imposto" stroke="#82ca9d" name="ISS" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        Sem dados de declarações
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sócios */}
                    {company.partners.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Quadro Societário ({company.partners.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {company.partners.slice(0, 5).map(partner => (
                                        <div key={partner.id} className="flex justify-between items-center p-3 border rounded">
                                            <div>
                                                <p className="font-medium">{partner.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    CPF: {partner.cpf} • {partner.role}
                                                </p>
                                            </div>
                                            <Badge variant={partner.endDate ? "secondary" : "default"}>
                                                {partner.endDate ? 'Inativo' : 'Ativo'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Aba Declarações */}
                <TabsContent value="declaracoes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Declarações PGDAS-D</CardTitle>
                            <CardDescription>{company.declarations.length} declarações encontradas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-right">Receita</TableHead>
                                        <TableHead className="text-right">ISS Devido</TableHead>
                                        <TableHead>Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {company.declarations.map(decl => (
                                        <TableRow key={decl.id}>
                                            <TableCell className="font-medium">{decl.period}</TableCell>
                                            <TableCell>{decl.type}</TableCell>
                                            <TableCell className="text-right">
                                                R$ {decl.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                R$ {decl.taxDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(decl.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {company.declarations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                Nenhuma declaração encontrada
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba NFSe */}
                <TabsContent value="nfse" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notas Fiscais de Serviço Eletrônicas</CardTitle>
                            <CardDescription>{company.invoices.length} notas emitidas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Número</TableHead>
                                        <TableHead>Data Emissão</TableHead>
                                        <TableHead>Tomador</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Código Serviço</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {company.invoices.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-medium">{inv.number}</TableCell>
                                            <TableCell>
                                                {new Date(inv.issueDate).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>{inv.tomadorCnpj || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>{inv.serviceCode || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {company.invoices.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba Sócios */}
                <TabsContent value="socios">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quadro Societário Completo</CardTitle>
                            <CardDescription>{company.partners.length} sócios cadastrados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Função</TableHead>
                                        <TableHead>Entrada</TableHead>
                                        <TableHead>Saída</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {company.partners.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-medium">{partner.name}</TableCell>
                                            <TableCell>{partner.cpf}</TableCell>
                                            <TableCell>{partner.role}</TableCell>
                                            <TableCell>
                                                {new Date(partner.startDate).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>
                                                {partner.endDate ? new Date(partner.endDate).toLocaleDateString('pt-BR') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={partner.endDate ? "secondary" : "default"}>
                                                    {partner.endDate ? 'Inativo' : 'Ativo'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {company.partners.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Nenhum sócio cadastrado
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba Divergências */}
                <TabsContent value="divergencias">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Divergências Fiscais
                            </CardTitle>
                            <CardDescription>
                                {divergenciasPendentes} pendentes de {company.divergences.length} total
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {company.divergences.map(div => (
                                    <div key={div.id} className="p-4 border rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="destructive">{div.type}</Badge>
                                                    <Badge variant={div.status === 'Pendente' ? 'default' : 'secondary'}>
                                                        {div.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm">{div.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-destructive">
                                                    R$ {div.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(div.detectedAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {company.divergences.length === 0 && (
                                    <div className="text-center py-8">
                                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                                        <p className="text-muted-foreground">Nenhuma divergência encontrada</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba Histórico */}
                <TabsContent value="historico">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Enquadramento</CardTitle>
                            <CardDescription>Mudanças de regime tributário</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {company.enquadramentoHistory.map((hist) => (
                                    <div key={hist.id} className="flex gap-4 p-3 border rounded">
                                        <div className="flex-shrink-0">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Calendar className="h-4 w-4 text-primary" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{hist.regime}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(hist.startDate).toLocaleDateString('pt-BR')} 
                                                {hist.endDate && ` até ${new Date(hist.endDate).toLocaleDateString('pt-BR')}`}
                                            </p>
                                            {hist.reason && (
                                                <p className="text-sm text-muted-foreground mt-1">{hist.reason}</p>
                                            )}
                                        </div>
                                        <Badge variant={!hist.endDate ? "default" : "secondary"}>
                                            {!hist.endDate ? 'Atual' : 'Histórico'}
                                        </Badge>
                                    </div>
                                ))}
                                {company.enquadramentoHistory.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhum histórico de enquadramento
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aba DTE */}
                <TabsContent value="dte">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mensagens DTE-SN</CardTitle>
                            <CardDescription>
                                Comunicações eletrônicas com o contribuinte
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {company.dteMessages.map(msg => (
                                    <div key={msg.id} className="flex gap-4 p-3 border rounded">
                                        <div className="flex-shrink-0">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${msg.readAt ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                                <Mail className={`h-4 w-4 ${msg.readAt ? 'text-green-600' : 'text-yellow-600'}`} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium">{msg.subject}</p>
                                                <Badge variant="outline">{msg.type}</Badge>
                                            </div>
                                            <div className="flex gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Enviada: {new Date(msg.sentAt).toLocaleString('pt-BR')}
                                                </span>
                                                {msg.readAt && (
                                                    <span className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Lida: {new Date(msg.readAt).toLocaleString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {company.dteMessages.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhuma mensagem enviada
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

