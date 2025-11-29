"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function CreateCompanyDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    
    const [formData, setFormData] = useState({
        cnpj: "",
        name: "",
        tradeName: "",
        cnae: "",
        secondaryCnaes: "",
        regime: "Simples Nacional",
        status: "Ativo",
        address: "",
        phone: "",
        email: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const response = await fetch('/api/companies/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao cadastrar')
            }

            setOpen(false)
            setFormData({
                cnpj: "",
                name: "",
                tradeName: "",
                cnae: "",
                secondaryCnaes: "",
                regime: "Simples Nacional",
                status: "Ativo",
                address: "",
                phone: "",
                email: "",
            })
            router.refresh()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao cadastrar'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const formatCNPJ = (value: string) => {
        const numbers = value.replace(/\D/g, '')
        return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Contribuinte
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cadastrar Novo Contribuinte</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do contribuinte para cadastro no sistema
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ *</Label>
                            <Input
                                id="cnpj"
                                value={formData.cnpj}
                                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                                placeholder="00.000.000/0000-00"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnae">CNAE Principal *</Label>
                            <Input
                                id="cnae"
                                value={formData.cnae}
                                onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                                placeholder="0000-0/00"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Razão Social *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tradeName">Nome Fantasia</Label>
                        <Input
                            id="tradeName"
                            value={formData.tradeName}
                            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="secondaryCnaes">CNAEs Secundários</Label>
                        <Input
                            id="secondaryCnaes"
                            value={formData.secondaryCnaes}
                            onChange={(e) => setFormData({ ...formData, secondaryCnaes: e.target.value })}
                            placeholder="Separados por vírgula"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="regime">Regime Tributário</Label>
                            <Select
                                value={formData.regime}
                                onValueChange={(value) => setFormData({ ...formData, regime: value })}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                                    <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                                    <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                                    <SelectItem value="MEI">MEI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ativo">Ativo</SelectItem>
                                    <SelectItem value="Inativo">Inativo</SelectItem>
                                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                                    <SelectItem value="Baixado">Baixado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(00) 0000-0000"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Cadastrando..." : "Cadastrar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
