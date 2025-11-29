"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { formatCPF } from "@/lib/utils"

type UserRow = {
    id: string
    name: string
    email: string
    cpf: string
    matricula?: string | null
    cargo?: string | null
    localTrabalho?: string | null
    phone?: string | null
    role: string
    profiles?: string | null
    active: boolean
}

export default function UsuariosPage() {
    const { toast } = useToast()
    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({
        id: "",
        name: "",
        email: "",
        cpf: "",
        matricula: "",
        cargo: "",
        localTrabalho: "",
        phone: "",
        role: "AUDITOR",
        profiles: "AUDITOR",
        password: "",
        active: true
    })

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        setLoading(true)
        try {
            const resp = await fetch("/api/users")
            if (resp.ok) {
                setUsers(await resp.json())
            }
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setForm({
            id: "",
            name: "",
            email: "",
            cpf: "",
            matricula: "",
            cargo: "",
            localTrabalho: "",
            phone: "",
            role: "AUDITOR",
            profiles: "AUDITOR",
            password: "",
            active: true
        })
    }

    function openCreate() {
        resetForm()
        setOpen(true)
    }

    function openEdit(user: UserRow) {
        setForm({
            id: user.id,
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            matricula: user.matricula || "",
            cargo: user.cargo || "",
            localTrabalho: user.localTrabalho || "",
            phone: user.phone || "",
            role: user.role,
            profiles: user.profiles || user.role,
            password: "",
            active: user.active
        })
        setOpen(true)
    }

    async function saveUser() {
        if (!form.name || !form.email || !form.cpf) return
        if (!form.id && !form.password) return

        if (form.id) {
            const resp = await fetch(`/api/users/${form.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    matricula: form.matricula,
                    cargo: form.cargo,
                    localTrabalho: form.localTrabalho,
                    phone: form.phone,
                    role: form.role,
                    profiles: form.profiles,
                    active: form.active
                })
            })
            if (resp.ok) {
                const updated = await resp.json()
                setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
                toast({ title: "Usuario atualizado" })
            }
        } else {
            const resp = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    cpf: form.cpf,
                    matricula: form.matricula,
                    cargo: form.cargo,
                    localTrabalho: form.localTrabalho,
                    phone: form.phone,
                    role: form.role,
                    profiles: form.profiles,
                    password: form.password,
                    active: form.active
                })
            })
            if (resp.ok) {
                const created = await resp.json()
                setUsers((prev) => [created, ...prev])
                toast({ title: "Usuario criado" })
            }
        }
        setOpen(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestao de Usuarios</h2>
                    <p className="text-muted-foreground text-sm">Cadastro com CPF, matricula, cargo, perfis e ativacao.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Novo usuario
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Usuarios</CardTitle>
                    <CardDescription>Controle de perfis e ativacao.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Matricula</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead>Perfis</TableHead>
                                <TableHead>Ativo</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell className="font-mono">{formatCPF(u.cpf)}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.matricula}</TableCell>
                                    <TableCell>{u.cargo}</TableCell>
                                    <TableCell>{u.profiles || u.role}</TableCell>
                                    <TableCell>
                                        <Switch checked={u.active} onCheckedChange={(checked) => openEdit({ ...u, active: checked })} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Editar</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!users.length && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum usuario</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{form.id ? "Editar usuario" : "Novo usuario"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Nome completo</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>CPF</Label>
                                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} disabled={!!form.id} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!form.id} />
                            </div>
                            <div className="space-y-1">
                                <Label>Telefone</Label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Matricula</Label>
                                <Input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Cargo/Função</Label>
                                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Local de Trabalho</Label>
                            <Input value={form.localTrabalho} onChange={(e) => setForm({ ...form, localTrabalho: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Perfil (role)</Label>
                                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, profiles: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                                        <SelectItem value="AUDITOR">AUDITOR</SelectItem>
                                        <SelectItem value="GESTOR">GESTOR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Ativo</Label>
                                <div className="flex items-center gap-2">
                                    <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
                                    <span className="text-sm text-muted-foreground">{form.active ? "Ativo" : "Inativo"}</span>
                                </div>
                            </div>
                        </div>
                        {!form.id && (
                            <div className="space-y-1">
                                <Label>Senha (para POC)</Label>
                                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={saveUser} disabled={!form.name || !form.email || !form.cpf || (!form.id && !form.password)}>
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
