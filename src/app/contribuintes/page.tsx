"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye } from "lucide-react"
import { companies } from "@/lib/data"
import Link from "next/link"

export default function ContribuintesPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cadastro Fiscal</h2>
                    <p className="text-muted-foreground">
                        Gerencie os contribuintes e visualize sua situação cadastral.
                    </p>
                </div>
                <Button>
                    <Filter className="mr-2 h-4 w-4" /> Filtros Avançados
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por Razão Social, CNPJ ou CNAE..."
                        className="pl-8 md:w-[300px] lg:w-[400px]"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Razão Social</TableHead>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>CNAE Principal</TableHead>
                            <TableHead>Regime</TableHead>
                            <TableHead>Risco</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies.map((company) => (
                            <TableRow key={company.id}>
                                <TableCell className="font-medium">{company.name}</TableCell>
                                <TableCell>{company.cnpj}</TableCell>
                                <TableCell>{company.cnae}</TableCell>
                                <TableCell>{company.regime}</TableCell>
                                <TableCell>
                                    {company.risk === "Alto" && <Badge variant="destructive">Alto</Badge>}
                                    {company.risk === "Médio" && <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Médio</Badge>}
                                    {company.risk === "Baixo" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Baixo</Badge>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${company.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {company.status}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/contribuintes/${company.id}`}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
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
