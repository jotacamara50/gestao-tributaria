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

const historyData = [
    {
        id: 1,
        filename: "PGDAS-D_2025-10.xml",
        type: "PGDAS-D",
        date: "28/11/2025 10:30",
        status: "success",
        records: 1240,
    },
    {
        id: 2,
        filename: "NFS-e_Lote_4592.xml",
        type: "NFS-e",
        date: "28/11/2025 09:15",
        status: "processing",
        records: 0,
    },
    {
        id: 3,
        filename: "DAF607_Repasse_BB.csv",
        type: "DAF607",
        date: "27/11/2025 16:45",
        status: "error",
        records: 0,
    },
    {
        id: 4,
        filename: "Base_CNPJ_Receita.csv",
        type: "Cadastral",
        date: "25/11/2025 08:00",
        status: "success",
        records: 15400,
    },
]

export function ImportHistory() {
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
                </TableBody>
            </Table>
        </div>
    )
}
