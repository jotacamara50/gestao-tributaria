/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Filter, FileDown, Paperclip, PlusCircle, RefreshCcw } from "lucide-react"

type FiscalAttachment = {
  id: string
  name: string
  mimeType?: string | null
  size?: number | null
}

type FiscalHistory = {
  id: string
  type: string
  note: string
  createdAt: string
}

type FiscalAction = {
  id: string
  number: string
  type: string
  subject: string
  description?: string | null
  status: string
  openedAt: string
  company: { id: string; name: string; cnpj: string }
  attachments: FiscalAttachment[]
  history: FiscalHistory[]
}

const defaultTypes = ["Fiscalizacao", "Intimacao", "Auto de infracao", "Monitoramento"]

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export default function FiscalizacaoPage() {
  const [cnpjFiltro, setCnpjFiltro] = useState("")
  const [type, setType] = useState(defaultTypes[0])
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [cnpjNovo, setCnpjNovo] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [actions, setActions] = useState<FiscalAction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadActions()
  }, [])

  async function loadActions() {
    setLoading(true)
    try {
      const query = cnpjFiltro ? `?cnpj=${encodeURIComponent(cnpjFiltro)}` : ""
      const resp = await fetch(`/api/fiscal/actions${query}`)
      if (resp.ok) {
        const data = await resp.json()
        setActions(data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!subject || !cnpjNovo) return
    setLoading(true)
    try {
      const attachmentsPayload = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          mimeType: f.type,
          size: f.size,
          contentBase64: await fileToBase64(f)
        }))
      )

      const resp = await fetch("/api/fiscal/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: cnpjNovo,
          type,
          subject,
          description,
          attachments: attachmentsPayload
        })
      })
      if (resp.ok) {
        setSubject("")
        setDescription("")
        setFiles([])
        await loadActions()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNote(actionId: string) {
    const note = prompt("Digite a nota ou andamento:")
    if (!note) return
    await fetch(`/api/fiscal/actions/${actionId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, type: "ANOTACAO" })
    })
    await loadActions()
  }

  async function handleAttach(actionId: string) {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.onchange = async () => {
      const selected = Array.from(input.files || [])
      if (!selected.length) return
      const payload = await Promise.all(
        selected.map(async (f) => ({
          name: f.name,
          mimeType: f.type,
          size: f.size,
          contentBase64: await fileToBase64(f)
        }))
      )
      await fetch(`/api/fiscal/actions/${actionId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      await loadActions()
    }
    input.click()
  }

  async function handleReport(actionId: string, number: string) {
    const resp = await fetch(`/api/fiscal/actions/${actionId}/report`)
    if (!resp.ok) return
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-fiscal-${number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ações de Fiscalização</h2>
          <p className="text-muted-foreground">
            Registre ações fiscais, anexe documentos, mantenha histórico por CNPJ e emita relatório individual.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadActions} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Registro de Acao Fiscal</CardTitle>
          <CardDescription>Associe a um CNPJ e anexe documentos relevantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpjNovo} onChange={(e) => setCnpjNovo(e.target.value)} placeholder="Somente numeros" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select className="w-full border rounded-md px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
                {defaultTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Fiscalizacao PGDAS/NFSe mes 10/2024" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descricao</Label>
            <textarea
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo da acao fiscal"
            />
          </div>
          <div className="flex items-center gap-3">
            <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <span className="text-sm text-muted-foreground">{files.length} arquivo(s) pronto(s)</span>}
            <Button onClick={handleCreate} disabled={loading || !subject || !cnpjNovo}>
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar acao
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acoes fiscais</CardTitle>
          <CardDescription>Filtre por CNPJ e acompanhe andamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label>Filtro por CNPJ</Label>
              <Input value={cnpjFiltro} onChange={(e) => setCnpjFiltro(e.target.value)} placeholder="Somente numeros" />
            </div>
            <Button onClick={loadActions} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" /> Aplicar
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.number}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{a.company.name}</div>
                    <div className="text-xs text-muted-foreground">{a.company.cnpj}</div>
                  </TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell>{new Date(a.openedAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {a.attachments.map(att => (
                        <div key={att.id} className="text-xs flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> {att.name}
                        </div>
                      ))}
                      {!a.attachments.length && <span className="text-xs text-muted-foreground">Nenhum</span>}
                    </div>
                  </TableCell>
                  <TableCell className="space-y-2">
                    <Button size="sm" variant="outline" onClick={() => handleAddNote(a.id)}>Adicionar nota</Button>
                    <Button size="sm" variant="outline" onClick={() => handleAttach(a.id)}>
                      <Paperclip className="mr-1 h-4 w-4" /> Anexar
                    </Button>
                    <Button size="sm" onClick={() => handleReport(a.id, a.number)}>
                      <FileDown className="mr-1 h-4 w-4" /> Relatorio
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!actions.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
