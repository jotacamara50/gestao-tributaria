"use client"

import { useEffect, useState } from "react"
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
import { Plus, Eye, Upload } from "lucide-react"

type Ticket = {
    id: string
    protocol: string
    subject: string
    category: "Parada total" | "Comprometido" | "Duvidas/Relatorios"
    priority: "Alta" | "Media" | "Baixa"
    description: string
    requester: string
    companyId?: string | null
    company?: { id: string; name: string } | null
    openedAt: string
    status: "Aberto" | "Em Andamento" | "Resolvido"
    slaHours: number
    attachmentName?: string
}

const initialTickets: Ticket[] = []

function computeDue(opened: Date, slaHours: number) {
    return new Date(opened.getTime() + slaHours * 60 * 60 * 1000)
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
    const [selected, setSelected] = useState<Ticket | null>(null)
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [subject, setSubject] = useState("")
    const [category, setCategory] = useState<Ticket["category"]>("Parada total")
    const [priority, setPriority] = useState<Ticket["priority"]>("Alta")
    const [description, setDescription] = useState("")
    const [requester, setRequester] = useState("")
    const [company, setCompany] = useState<string>("")
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined)

    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])

    useEffect(() => {
        loadTickets()
        loadCompanies()
    }, [])

    async function loadTickets() {
        setLoading(true)
        try {
            const resp = await fetch("/api/support")
            if (resp.ok) {
                const data = await resp.json()
                setTickets(data)
            }
        } finally {
            setLoading(false)
        }
    }

    async function loadCompanies() {
        try {
            const resp = await fetch("/api/companies")
            if (resp.ok) {
                const data = await resp.json()
                setCompanies(data)
                if (!company && data.length) {
                    setCompany(data[0].id)
                }
            }
        } catch {
            // ignore
        }
    }

    function slaHoursFor(categoryValue: Ticket["category"]) {
        if (categoryValue === "Parada total") return 4 // solucao 4h
        if (categoryValue === "Comprometido") return 4
        return 24
    }

    async function addTicket() {
        if (!subject || !requester || !description) return
        const slaHours = slaHoursFor(category)
        const payload = {
            subject,
            category,
            priority,
            description,
            requester,
            companyId: company || null,
            slaHours,
            attachmentName,
        }
        const resp = await fetch("/api/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        if (resp.ok) {
            const saved: Ticket = await resp.json()
            setTickets([saved, ...tickets])
            setSubject("")
            setCategory("Parada total")
            setPriority("Alta")
            setDescription("")
            setRequester("")
            setAttachmentName(undefined)
            setOpen(false)
            toast({
                title: "Chamado criado",
                description: `${saved.protocol} registrado com sucesso.`
            })
        }
    }

    function openDetails(ticket: Ticket) {
        setSelected(ticket)
    }

    function markResolved() {
        if (!selected) return
        fetch(`/api/support/${selected.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Resolvido" })
        }).then(async (resp) => {
            if (resp.ok) {
                const updated = await resp.json()
                setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            }
            setSelected(null)
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
                        Portal de abertura e acompanhamento por protocolo.
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
                                            {companies.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
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
                                Protocolo gerado no envio
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
                            <TableHead className="text-right">Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => {
                            const opened = new Date(ticket.openedAt)
                            const due = computeDue(opened, ticket.slaHours)
                            const slaInfo = formatDuration(due)
                            return (
                                <TableRow key={ticket.id} className="cursor-pointer" onClick={() => openDetails(ticket)}>
                                    <TableCell className="font-mono">{ticket.protocol}</TableCell>
                                    <TableCell>{ticket.subject}</TableCell>
                                    <TableCell>{ticket.category}</TableCell>
                                    <TableCell>{ticket.requester}</TableCell>
                                    <TableCell>{ticket.company?.name || "-"}</TableCell>
                                    <TableCell>{opened.toLocaleDateString("pt-BR")}</TableCell>
                                    <TableCell>{priorityColor(ticket.priority)}</TableCell>
                                    <TableCell>{badgeForStatus(ticket.status)}</TableCell>
                                    <TableCell>
                                        <Badge variant={slaInfo.variant}>{slaInfo.label}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" title="Ver andamento do chamado" onClick={(e) => { e.stopPropagation(); openDetails(ticket) }}>
                                            <Eye className="h-4 w-4" />
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

            {selected && (
                <Dialog open={!!selected} onOpenChange={(val) => !val && setSelected(null)}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Detalhes do chamado</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="font-semibold">Protocolo</span>
                                <span className="font-mono">{selected.protocol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Assunto</span>
                                <span>{selected.subject}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Natureza</span>
                                <span>{selected.category}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Prioridade</span>
                                <span>{selected.priority}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Solicitante</span>
                                <span>{selected.requester}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Empresa</span>
                                <span>{selected.company?.name || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Status</span>
                                <span>{selected.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Abertura</span>
                                <span>{new Date(selected.openedAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="font-semibold">Descricao</span>
                                <p className="text-muted-foreground whitespace-pre-line">{selected.description}</p>
                            </div>
                            {selected.attachmentName && (
                                <div className="flex justify-between">
                                    <span>Anexo</span>
                                    <span>{selected.attachmentName}</span>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="justify-between">
                            <Button variant="secondary" onClick={() => setSelected(null)}>Fechar</Button>
                            {selected.status !== "Resolvido" && (
                                <Button onClick={markResolved}>Marcar como resolvido</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
