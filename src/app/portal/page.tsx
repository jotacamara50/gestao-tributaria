"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const STORAGE_KEY = "portal_cnpj"

function sanitizeCnpjInput(raw: string) {
  if (!raw) return ""
  return String(raw).replace(/[^\d./-]/g, "")
}

type Message = {
  id: string
  type: string
  subject: string
  content: string
  sentAt: string
  readAt?: string | null
}

export default function PortalPage() {
  const [cnpj, setCnpj] = useState("")
  const [company, setCompany] = useState<{ id: string; name: string; cnpj: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // carregar CNPJ salvo e reconsultar automaticamente
  useEffect(() => {
    const savedRaw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : ""
    const saved = sanitizeCnpjInput(savedRaw || "")
    if (saved) {
      setCnpj(saved)
      buscar(saved, { silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buscar(cnpjParam?: string, opts?: { silent?: boolean }) {
    const cnpjQuery = sanitizeCnpjInput(cnpjParam !== undefined ? cnpjParam : cnpj)
    if (!cnpjQuery) return
    setLoading(true)
    setError(null)
    try {
      if (!opts?.silent && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, cnpjQuery)
      }
      const resp = await fetch(`/api/portal/messages?cnpj=${encodeURIComponent(cnpjQuery)}`)
      const data = await resp.json()
      if (!resp.ok) {
        setError(data?.error || "Erro ao buscar")
        setCompany(null)
        setMessages([])
        return
      }
      setCompany(data.company)
      setMessages(data.messages || [])
    } catch {
      setError("Falha ao conectar")
    } finally {
      setLoading(false)
    }
  }

  async function marcarLido(id: string) {
    try {
      const resp = await fetch(`/api/portal/messages/${id}/read`, { method: "PATCH" })
      if (!resp.ok) {
        setError("Falha ao registrar ciencia")
        return
      }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, readAt: new Date().toISOString() } : m)))
      // refetch do backend para garantir persistencia e status sincronizado
      await buscar(cnpj, { silent: true })
    } catch {
      setError("Falha ao registrar ciencia")
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Ambiente do Contribuinte</CardTitle>
          <CardDescription>Acesse notificacoes e mensagens enviadas pelo municipio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">CNPJ</label>
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(sanitizeCnpjInput(e.target.value))}
              placeholder="Digite o CNPJ"
            />
          </div>
          <Button onClick={() => buscar()} disabled={loading || !cnpj}>
            Entrar
          </Button>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {company && <div className="text-sm text-muted-foreground">{company.name} - {company.cnpj}</div>}
        </CardContent>
      </Card>

      {company && (
        <Card>
          <CardHeader>
            <CardTitle>Notificacoes</CardTitle>
            <CardDescription>Mensagens do DTE enviadas para sua empresa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="border rounded-md p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{m.subject}</div>
                  <Badge variant={m.readAt ? "secondary" : "destructive"}>{m.readAt ? "Lida" : "Nova"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Enviada em {new Date(m.sentAt).toLocaleString("pt-BR")}
                </div>
                <Separator />
                <div className="text-sm whitespace-pre-line">{m.content}</div>
                {!m.readAt && (
                  <Button size="sm" onClick={() => marcarLido(m.id)}>
                    Dar ciente
                  </Button>
                )}
              </div>
            ))}
            {!messages.length && <div className="text-sm text-muted-foreground">Nenhuma mensagem.</div>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
