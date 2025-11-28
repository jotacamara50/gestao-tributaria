"use client"

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
import { Plus, MessageSquare } from "lucide-react"

const tickets = [
    {
        id: "TK-2025-001",
        subject: "Erro na importação do arquivo PGDAS",
        requester: "Fiscal João",
        date: "28/11/2025",
        status: "Aberto",
        priority: "Alta",
    },
    {
        id: "TK-2025-002",
        subject: "Dúvida sobre cálculo de divergência",
        requester: "Fiscal Maria",
        date: "27/11/2025",
        status: "Em Andamento",
        priority: "Média",
    },
    {
        id: "TK-2025-003",
        subject: "Solicitação de novo usuário",
        requester: "Coordenação",
        date: "26/11/2025",
        status: "Resolvido",
        priority: "Baixa",
    },
]

export default function SuportePage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Suporte e Chamados</h2>
                    <p className="text-muted-foreground">
                        Central de atendimento ao usuário do sistema.
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Novo Chamado
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Protocolo</TableHead>
                            <TableHead>Assunto</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-medium">{ticket.id}</TableCell>
                                <TableCell>{ticket.subject}</TableCell>
                                <TableCell>{ticket.requester}</TableCell>
                                <TableCell>{ticket.date}</TableCell>
                                <TableCell>
                                    {ticket.priority === "Alta" && <span className="text-red-600 font-medium">Alta</span>}
                                    {ticket.priority === "Média" && <span className="text-amber-600 font-medium">Média</span>}
                                    {ticket.priority === "Baixa" && <span className="text-green-600 font-medium">Baixa</span>}
                                </TableCell>
                                <TableCell>
                                    {ticket.status === "Aberto" && <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Aberto</Badge>}
                                    {ticket.status === "Em Andamento" && <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Em Andamento</Badge>}
                                    {ticket.status === "Resolvido" && <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Resolvido</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
