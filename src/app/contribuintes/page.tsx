"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Search, Filter, Eye } from "lucide-react"
import Link from "next/link"
import { CreateCompanyDialog } from "@/components/contribuintes/create-company-dialog"

interface Company {
    id: string
    cnpj: string
    name: string
    cnae: string
    regime: string
    status: string
    riskLevel: string
    divergences: any[]
}

export default function ContribuintesPage() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        async function fetchCompanies() {
            try {
                const response = await fetch('/api/companies')
                const data = await response.json()
                setCompanies(data)
                setFilteredCompanies(data)
            } catch (error) {
                console.error('Failed to fetch companies:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCompanies()
    }, [])

    useEffect(() => {
        if (searchTerm) {
            const filtered = companies.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.cnpj.includes(searchTerm)
            )
            setFilteredCompanies(filtered)
        } else {
            setFilteredCompanies(companies)
        }
    }, [searchTerm, companies])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Carregando empresas...</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cadastro Fiscal</h2>
                    <p className="text-muted-foreground">
                        Gerenciamento de contribuintes do município
                    </p>
                </div>
                <CreateCompanyDialog />
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou CNPJ..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="h-4 w-4 mr-2" />
                            Filtros
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Razão Social</TableHead>
                                <TableHead>CNAE</TableHead>
                                <TableHead>Regime</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Risco</TableHead>
                                <TableHead>Divergências</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCompanies.map((company) => (
                                <TableRow key={company.id}>
                                    <TableCell className="font-mono text-sm">{company.cnpj}</TableCell>
                                    <TableCell className="font-medium">{company.name}</TableCell>
                                    <TableCell>{company.cnae}</TableCell>
                                    <TableCell>{company.regime}</TableCell>
                                    <TableCell>
                                        <Badge variant={company.status === "Ativo" ? "default" : "secondary"}>
                                            {company.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                company.riskLevel === "Alto"
                                                    ? "destructive"
                                                    : company.riskLevel === "Médio"
                                                        ? "default"
                                                        : "secondary"
                                            }
                                        >
                                            {company.riskLevel}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {company.divergences?.length > 0 ? (
                                            <Badge variant="destructive">{company.divergences.length}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
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

                    {filteredCompanies.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhuma empresa encontrada
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
