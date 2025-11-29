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
    const [saving, setSaving] = useState(false)
    const [confirmDeactivate, setConfirmDeactivate] = useState<{ id: string; active: boolean } | null>(null)
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
    const [passwordStrength, setPasswordStrength] = useState<"fraca" | "media" | "forte" | "">("")
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        setLoading(true)
        try {
            const resp = await fetch("/api/users")
            if (resp.ok) {
                setUsers(await resp.json())
            } else {
                toast({ title: "Erro ao carregar usuarios", variant: "destructive" })
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

    function measureStrength(pw: string): "fraca" | "media" | "forte" | "" {
        if (!pw) return ""
        const hasLetter = /[A-Za-z]/.test(pw)
        const hasNumber = /\d/.test(pw)
        if (pw.length >= 8 && hasLetter && hasNumber) return "forte"
        if (pw.length >= 6) return "media"
        return "fraca"
    }

    async function saveUser() {
        if (!form.name || !form.email || !form.cpf) return
        if (!form.id && !form.password) return
        setSaving(true)
        if (form.id) {
            if (!form.id.trim()) {
                toast({ title: "Erro ao atualizar", description: "ID do usuario ausente", variant: "destructive" })
                setSaving(false)
                return
            }
            try {
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
                } else {
                    const errText = await resp.text().catch(() => "")
                    toast({ title: "Erro ao atualizar", description: errText || "Falha ao salvar", variant: "destructive" })
                    setSaving(false)
                    return
                }
            } catch (error) {
                toast({ title: "Erro ao atualizar", description: "Falha de rede", variant: "destructive" })
                setSaving(false)
                return
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
            } else {
                const err = await resp.json().catch(() => ({}))
                toast({ title: "Erro ao criar usuario", description: err?.error || "Falha ao salvar", variant: "destructive" })
                setSaving(false)
                return
            }
        }
        setOpen(false)
        setSaving(false)
        loadUsers()
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
                                        <Switch
                                            checked={u.active}
                                            onCheckedChange={(checked) => setConfirmDeactivate({ id: u.id, active: checked })}
                                        />
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
                                <Label>Senha</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setForm({ ...form, password: value })
                                            setPasswordStrength(measureStrength(value))
                                        }}
                                    />
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Switch checked={showPassword} onCheckedChange={setShowPassword} />
                                        <span>Mostrar</span>
                                    </div>
                                </div>
                                {passwordStrength && (
                                    <div className="text-xs">
                                        {passwordStrength === "fraca" && <span className="text-red-600">Fraca (1-5 caracteres)</span>}
                                        {passwordStrength === "media" && <span className="text-amber-600">Media (6-7 caracteres)</span>}
                                        {passwordStrength === "forte" && <span className="text-green-600">Forte (8+ letras e numeros)</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={saveUser} disabled={saving || !form.name || !form.email || !form.cpf || (!form.id && !form.password)}>
                            {saving ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeactivate} onOpenChange={(val) => { if (!val) setConfirmDeactivate(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar alteracao</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">Tem certeza? O usuario perdera acesso imediatamente.</p>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setConfirmDeactivate(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            const target = users.find(u => u.id === confirmDeactivate?.id)
                            if (!target) {
                                setConfirmDeactivate(null)
                                return
                            }
                            fetch(`/api/users/${target.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ...target, active: confirmDeactivate?.active })
                            }).then(async (resp) => {
                                if (resp.ok) {
                                    const updated = await resp.json()
                                    setUsers((prev) => prev.map(u => u.id === updated.id ? updated : u))
                                    toast({ title: updated.active ? "Usuario reativado" : "Usuario desativado" })
                                }
                                setConfirmDeactivate(null)
                            })
                        }}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
