'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Send, Eye, Filter, Download, FileText, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    gerarNotificacaoFiscal,
    gerarTermoFiscalizacao,
    gerarAutoInfracao
} from '@/lib/pdf-generator'

interface DTEMessage {
    id: string
    companyId: string
    type: string
    subject: string
    content: string
    sentAt: string
    readAt: string | null
    company: {
        id: string
        cnpj: string
        name: string
    }
    user: {
        id: string
        name: string
    }
}

interface Company {
    id: string
    cnpj: string
    name: string
    tradeName: string | null
}

const tiposDTE = [
    { value: 'notificacao', label: 'Notificação' },
    { value: 'intimacao', label: 'Intimação' },
    { value: 'aviso', label: 'Aviso de Vencimento' },
    { value: 'autoInfracao', label: 'Auto de Infração' },
    { value: 'lembrete', label: 'Lembrete' }
]

export default function DTEPage() {
    const [messages, setMessages] = useState<DTEMessage[]>([])
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroTipo, setFiltroTipo] = useState<string>('todos')
    const [filtroStatus, setFiltroStatus] = useState<string>('todos')
    const [selectedMessage, setSelectedMessage] = useState<DTEMessage | null>(null)
    const [showNovaModal, setShowNovaModal] = useState(false)
    
    // Form nova mensagem
    const [novaForm, setNovaForm] = useState({
        companyId: '',
        type: 'notificacao',
        prazo: '',
        valorDevido: '',
        periodo: '',
        motivo: ''
    })

    useEffect(() => {
        carregarDados()
    }, [])

    async function carregarDados() {
        try {
            setLoading(true)
            const [messagesRes, companiesRes] = await Promise.all([
                fetch('/api/dte/send'),
                fetch('/api/companies')
            ])

            if (messagesRes.ok) {
                const data = await messagesRes.json()
                setMessages(data)
            }

            if (companiesRes.ok) {
                const data = await companiesRes.json()
                setCompanies(data)
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    async function enviarDTE() {
        try {
            const params: any = {
                prazo: novaForm.prazo,
            }

            if (novaForm.valorDevido) params.valorDevido = parseFloat(novaForm.valorDevido)
            if (novaForm.periodo) params.periodo = novaForm.periodo
            if (novaForm.motivo) params.motivo = novaForm.motivo

            const response = await fetch('/api/dte/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: novaForm.companyId,
                    type: novaForm.type,
                    params
                })
            })

            if (response.ok) {
                alert('DTE enviada com sucesso!')
                setShowNovaModal(false)
                setNovaForm({
                    companyId: '',
                    type: 'notificacao',
                    prazo: '',
                    valorDevido: '',
                    periodo: '',
                    motivo: ''
                })
                carregarDados()
            } else {
                alert('Erro ao enviar DTE')
            }
        } catch (error) {
            console.error('Erro ao enviar DTE:', error)
            alert('Erro ao enviar DTE')
        }
    }

    async function marcarComoLida(messageId: string) {
        try {
            const response = await fetch(`/api/dte/${messageId}/read`, {
                method: 'PATCH'
            })

            if (response.ok) {
                carregarDados()
            }
        } catch (error) {
            console.error('Erro ao marcar como lida:', error)
        }
    }

    async function gerarPDF(message: DTEMessage) {
        const company = companies.find(c => c.id === message.companyId)
        if (!company) return

        let doc

        if (message.type === 'notificacao') {
            doc = gerarNotificacaoFiscal({
                numero: message.id.substring(0, 8).toUpperCase(),
                data: new Date(message.sentAt),
                contribuinte: {
                    cnpj: company.cnpj,
                    nome: company.name,
                    nomeFantasia: company.tradeName || undefined
                },
                assunto: message.subject,
                conteudo: message.content,
                prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
                fundamentacao: 'Lei Complementar nº 123/2006 e Lei Municipal nº XXX/2024'
            })
        } else if (message.type === 'autoInfracao') {
            doc = gerarAutoInfracao({
                numero: message.id.substring(0, 8).toUpperCase(),
                data: new Date(message.sentAt),
                contribuinte: {
                    cnpj: company.cnpj,
                    nome: company.name
                },
                infracoesConstatadas: [
                    {
                        artigo: 'Art. 123 da Lei Municipal',
                        descricao: 'Omissão de receitas',
                        valorMulta: 1000
                    }
                ],
                valorTotal: 1000,
                prazoDefesa: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                prazoRecurso: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            })
        } else {
            // Para outros tipos, gera um PDF simples com o conteúdo
            const jsPDF = (await import('jspdf')).default
            doc = new jsPDF()
            doc.setFontSize(16)
            doc.text(message.subject, 20, 20)
            doc.setFontSize(12)
            const lines = doc.splitTextToSize(message.content, 170)
            doc.text(lines, 20, 40)
        }

        doc.save(`DTE-${message.id.substring(0, 8)}.pdf`)
    }

    const messagesFiltradas = messages.filter(m => {
        if (filtroTipo !== 'todos' && m.type !== filtroTipo) return false
        if (filtroStatus === 'lidas' && !m.readAt) return false
        if (filtroStatus === 'nao-lidas' && m.readAt) return false
        return true
    })

    const estatisticas = {
        total: messages.length,
        enviadas: messages.length,
        lidas: messages.filter(m => m.readAt).length,
        pendentes: messages.filter(m => !m.readAt).length
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando mensagens DTE...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">DTE - Domicílio Tributário Eletrônico</h1>
                    <p className="text-gray-600 mt-1">
                        Gerenciamento de comunicações eletrônicas com contribuintes
                    </p>
                </div>
                <Dialog open={showNovaModal} onOpenChange={setShowNovaModal}>
                    <DialogTrigger asChild>
                        <Button>
                            <Send className="w-4 h-4 mr-2" />
                            Nova Mensagem DTE
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Enviar Nova Mensagem DTE</DialogTitle>
                            <DialogDescription>
                                Selecione o contribuinte e o tipo de mensagem que deseja enviar
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company">Contribuinte</Label>
                                    <Select
                                        value={novaForm.companyId}
                                        onValueChange={(value) => setNovaForm({ ...novaForm, companyId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map(company => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name} - {company.cnpj}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo de Mensagem</Label>
                                    <Select
                                        value={novaForm.type}
                                        onValueChange={(value) => setNovaForm({ ...novaForm, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiposDTE.map(tipo => (
                                                <SelectItem key={tipo.value} value={tipo.value}>
                                                    {tipo.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prazo">Prazo</Label>
                                    <Input
                                        id="prazo"
                                        type="date"
                                        value={novaForm.prazo}
                                        onChange={(e) => setNovaForm({ ...novaForm, prazo: e.target.value })}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="valorDevido">Valor Devido (R$)</Label>
                                    <Input
                                        id="valorDevido"
                                        type="number"
                                        step="0.01"
                                        value={novaForm.valorDevido}
                                        onChange={(e) => setNovaForm({ ...novaForm, valorDevido: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="periodo">Período</Label>
                                <Input
                                    id="periodo"
                                    placeholder="Ex: Janeiro/2024"
                                    value={novaForm.periodo}
                                    onChange={(e) => setNovaForm({ ...novaForm, periodo: e.target.value })}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="motivo">Motivo/Observações</Label>
                                <Input
                                    id="motivo"
                                    placeholder="Detalhes adicionais..."
                                    value={novaForm.motivo}
                                    onChange={(e) => setNovaForm({ ...novaForm, motivo: e.target.value })}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowNovaModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={enviarDTE} disabled={!novaForm.companyId}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Enviar DTE
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Mensagens</CardDescription>
                        <CardTitle className="text-3xl">{estatisticas.total}</CardTitle>
                    </CardHeader>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Enviadas</CardDescription>
                        <CardTitle className="text-3xl text-blue-600">{estatisticas.enviadas}</CardTitle>
                    </CardHeader>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Lidas</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{estatisticas.lidas}</CardTitle>
                    </CardHeader>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pendentes</CardDescription>
                        <CardTitle className="text-3xl text-orange-600">{estatisticas.pendentes}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filtros e Tabela */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Mensagens Enviadas</CardTitle>
                        <div className="flex gap-2">
                            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                                    {tiposDTE.map(tipo => (
                                        <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Status</SelectItem>
                                    <SelectItem value="lidas">Lidas</SelectItem>
                                    <SelectItem value="nao-lidas">Não Lidas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Contribuinte</TableHead>
                                <TableHead>Assunto</TableHead>
                                <TableHead>Enviado por</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messagesFiltradas.map(message => (
                                <TableRow key={message.id}>
                                    <TableCell className="font-mono text-sm">
                                        {format(new Date(message.sentAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {tiposDTE.find(t => t.value === message.type)?.label || message.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{message.company.name}</div>
                                            <div className="text-sm text-gray-500">{message.company.cnpj}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {message.subject}
                                    </TableCell>
                                    <TableCell>{message.user.name}</TableCell>
                                    <TableCell>
                                        {message.readAt ? (
                                            <Badge variant="default" className="bg-green-600">
                                                Lida em {format(new Date(message.readAt), 'dd/MM/yyyy', { locale: ptBR })}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Não lida
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedMessage(message)
                                                            if (!message.readAt) {
                                                                marcarComoLida(message.id)
                                                            }
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{message.subject}</DialogTitle>
                                                        <DialogDescription>
                                                            {tiposDTE.find(t => t.value === message.type)?.label} enviada em{' '}
                                                            {format(new Date(message.sentAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="mt-4 space-y-4">
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Contribuinte:</h4>
                                                            <p>{message.company.name}</p>
                                                            <p className="text-sm text-gray-600">CNPJ: {message.company.cnpj}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Conteúdo:</h4>
                                                            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line">
                                                                {message.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => gerarPDF(message)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {messagesFiltradas.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhuma mensagem encontrada</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
