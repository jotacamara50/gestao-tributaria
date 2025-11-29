"use client"

import { useMemo, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, MessageSquare, Upload } from "lucide-react"

type Ticket = {
    id: string
    subject: string
    category: "Parada total" | "Comprometido" | "Duvidas/Relatorios"
    priority: "Alta" | "Media" | "Baixa"
    description: string
    requester: string
    company: string
    date: string
    openedAt: string
    status: "Aberto" | "Em Andamento" | "Resolvido"
    slaHours: number
    attachmentName?: string
}

const initialTickets: Ticket[] = []

function computeDue(slaHours: number) {
    const opened = new Date()
    const due = new Date(opened.getTime() + slaHours * 60 * 60 * 1000)
    return { opened, due }
}

function formatDuration(due: Date) {
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    if (diffMs <= 0) return { label: "Vencido", variant: "destructive" as const }
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const label = `Vence em ${hours}h ${minutes.toString().padStart(2, "0")}m`
    const variant: "destructive" | "outline" = diffMs < 1000 * 60 * 60 ? "destructive" : "outline"
    return { label, variant }
}

export default function SuportePage() {
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [subject, setSubject] = useState("")
    const [category, setCategory] = useState<Ticket["category"]>("Parada total")
    const [priority, setPriority] = useState<Ticket["priority"]>("Alta")
    const [description, setDescription] = useState("")
    const [requester, setRequester] = useState("")
    const [company, setCompany] = useState("Alfa Tecnologia LTDA")
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined)

    const nextId = useMemo(() => {
        const seq = tickets.length + 1
        const now = new Date()
        const year = now.getFullYear()
        const month = `${now.getMonth() + 1}`.padStart(2, "0")
        return `SUP-${year}-${month}-${seq.toString().padStart(3, "0")}`
    }, [tickets.length])

    function slaHoursFor(categoryValue: Ticket["category"]) {
        if (categoryValue === "Parada total") return 4 // solucao 4h
        if (categoryValue === "Comprometido") return 4
        return 24
    }

    function addTicket() {
        if (!subject || !requester || !description) return
        const slaHours = slaHoursFor(category)
        const { opened, due } = computeDue(slaHours)
        const newTicket: Ticket = {
            id: nextId,
            subject,
            category,
            priority,
            description,
            requester,
            company,
            date: opened.toLocaleDateString("pt-BR"),
            openedAt: opened.toISOString(),
            status: "Aberto",
            slaHours,
            attachmentName,
        }
        setTickets([newTicket, ...tickets])
        setSubject("")
        setCategory("Parada total")
        setPriority("Alta")
        setDescription("")
        setRequester("")
        setCompany("Alfa Tecnologia LTDA")
        setAttachmentName(undefined)
        setOpen(false)
        toast({
            title: "Chamado criado",
            description: `${newTicket.id} registrado com sucesso.`
        })
    }

    function badgeForStatus(status: Ticket["status"]) {
        if (status === "Aberto") return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Aberto</Badge>
        if (status === "Em Andamento") return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Em Andamento</Badge>
        return <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Resolvido</Badge>
    }

    function priorityColor(priorityValue: Ticket["priority"]) {
        if (priorityValue === "Alta") return <span className="text-red-600 font-medium">Alta</span>
        if (priorityValue === "Media") return <span className="text-amber-600 font-medium">Media</span>
        return <span className="text-green-600 font-medium">Baixa</span>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Suporte e Chamados</h2>
                    <p className="text-muted-foreground">
                        Portal de abertura e acompanhamento por protocolo, conforme TR 4.4.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Novo Chamado
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Registrar chamado</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3">
                            <div className="grid gap-1">
                                <Label>Assunto</Label>
                                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Erro na importacao PGDAS" />
                            </div>
                            <div className="grid gap-1">
                                <Label>Natureza / Categoria</Label>
                                <Select value={category} onValueChange={(v) => setCategory(v as Ticket["category"])}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Parada total">Parada total (N1)</SelectItem>
                                        <SelectItem value="Comprometido">Comprometido (N2)</SelectItem>
                                        <SelectItem value="Duvidas/Relatorios">Duvidas/Relatorios (N3)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1">
                                    <Label>Prioridade</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as Ticket["priority"])}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Alta">Alta</SelectItem>
                                            <SelectItem value="Media">Media</SelectItem>
                                            <SelectItem value="Baixa">Baixa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1">
                                    <Label>Empresa</Label>
                                    <Select value={company} onValueChange={(v) => setCompany(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Alfa Tecnologia LTDA">Alfa Tecnologia LTDA</SelectItem>
                                            <SelectItem value="Beta Servicos Municipais">Beta Servicos Municipais</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <Label>Solicitante</Label>
                                <Input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nome do fiscal" />
                            </div>
                            <div className="grid gap-1">
                                <Label>Descricao</Label>
                                <textarea
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes do erro ou solicitacao"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label>Anexo (opcional)</Label>
                                <Input
                                    type="file"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        setAttachmentName(file ? file.name : undefined)
                                    }}
                                />
                                {attachmentName && <span className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="h-3 w-3" /> {attachmentName}</span>}
                            </div>
                        </div>
                        <DialogFooter className="mt-2">
                            <div className="text-xs text-muted-foreground mr-auto">
                                Protocolo gerado: {nextId}
                            </div>
                            <Button onClick={addTicket} disabled={!subject || !requester || !description}>
                                Registrar chamado
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Protocolo</TableHead>
                            <TableHead>Assunto</TableHead>
                            <TableHead>Natureza</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => {
                            const opened = new Date(ticket.openedAt)
                            const due = new Date(opened.getTime() + ticket.slaHours * 60 * 60 * 1000)
                            const slaInfo = formatDuration(due)
                            return (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-mono">{ticket.id}</TableCell>
                                    <TableCell>{ticket.subject}</TableCell>
                                    <TableCell>{ticket.category}</TableCell>
                                    <TableCell>{ticket.requester}</TableCell>
                                    <TableCell>{ticket.company}</TableCell>
                                    <TableCell>{ticket.date}</TableCell>
                                    <TableCell>{priorityColor(ticket.priority)}</TableCell>
                                    <TableCell>{badgeForStatus(ticket.status)}</TableCell>
                                    <TableCell>
                                        <Badge variant={slaInfo.variant}>{slaInfo.label}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <MessageSquare className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {!tickets.length && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center text-muted-foreground">Nenhum chamado</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
