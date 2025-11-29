"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react"
import { useEffect, useState } from "react"

type ImportItem = {
    id: string
    filename: string
    type: string
    date: string
    status: 'success' | 'error' | 'processing'
    records: number
}

export function ImportHistory() {
    const [historyData, setHistoryData] = useState<ImportItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadHistory() {
            try {
                const resp = await fetch('/api/import-history')
                if (resp.ok) {
                    const data = await resp.json()
                    const mapped: ImportItem[] = data.map((item: any) => ({
                        id: item.id,
                        filename: item.filename,
                        type: item.type,
                        date: new Date(item.date).toLocaleString('pt-BR'),
                        status: item.status || 'success',
                        records: item.records || 0
                    }))
                    setHistoryData(mapped)
                }
            } catch (err) {
                console.error('Erro ao carregar histórico de importação', err)
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [])

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historyData.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {item.filename}
                            </TableCell>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>
                                {item.status === "success" && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                        <CheckCircle className="h-3 w-3" /> Processado
                                    </Badge>
                                )}
                                {item.status === "processing" && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                        <Clock className="h-3 w-3 animate-spin" /> Processando
                                    </Badge>
                                )}
                                {item.status === "error" && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                                        <XCircle className="h-3 w-3" /> Erro
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {item.status === "processing" || item.status === "error" ? "-" : item.records.toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                    {(!historyData.length && !loading) && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                Nenhum histórico de importação.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
