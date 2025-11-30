"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function FileUpload() {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileType, setFileType] = useState<string>("PGDAS")
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      setSelectedFiles(Array.from(e.target.files))
      setError(null)
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      setSelectedFiles(Array.from(e.dataTransfer.files))
      setError(null)
      setResult(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setError("Selecione ao menos um arquivo")
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      let success = 0
      const erros: string[] = []
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", fileType)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        if (!response.ok) {
          erros.push(`${file.name}: ${data.error || "Erro ao processar arquivo"}`)
        } else {
          success += 1
        }
      }

      setResult({ message: `Arquivos importados: ${success}/${selectedFiles.length}`, erros })
      setSelectedFiles([])

      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao processar arquivo"
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Arquivos Fiscais</CardTitle>
        <CardDescription>
          Arraste e solte ou selecione arquivos PGDAS, NFSe, DEFIS, DAS-D, Parcelamentos/Guias ou DAF607
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant={fileType === "PGDAS" ? "default" : "outline"} onClick={() => setFileType("PGDAS")}>
            PGDAS
          </Button>
          <Button variant={fileType === "NFSE" ? "default" : "outline"} onClick={() => setFileType("NFSE")}>
            NFS-e
          </Button>
          <Button variant={fileType === "DAF607" ? "default" : "outline"} onClick={() => setFileType("DAF607")}>
            DAF607
          </Button>
          <Button variant={fileType === "DEFIS" ? "default" : "outline"} onClick={() => setFileType("DEFIS")}>
            DEFIS
          </Button>
          <Button variant={fileType === "DASD" ? "default" : "outline"} onClick={() => setFileType("DASD")}>
            DAS-D
          </Button>
          <Button
            variant={fileType === "PARCELAMENTO" ? "default" : "outline"}
            onClick={() => setFileType("PARCELAMENTO")}
          >
            Parcelamentos
          </Button>
          <Button variant={fileType === "GUIA" ? "default" : "outline"} onClick={() => setFileType("GUIA")}>
            Guias
          </Button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept=".xml,.csv,.txt"
            multiple
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {selectedFiles.length ? `${selectedFiles.length} arquivo(s) selecionado(s)` : "Clique ou arraste arquivos"}
            </p>
            <p className="text-sm text-muted-foreground">Arquivos XML ou CSV (máx. 10MB)</p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-1">
            {selectedFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4" />
                <span className="text-sm flex-1 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-1 p-3 bg-green-50 text-green-700 rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{String(result.message || "")}</span>
            </div>
            {Array.isArray(result.erros) && result.erros.length > 0 && (
              <span className="text-xs text-destructive">Erros: {result.erros.join("; ")}</span>
            )}
          </div>
        )}

        <Button onClick={handleUpload} disabled={!selectedFiles.length || uploading} className="w-full">
          {uploading ? "Processando..." : "Processar Arquivo"}
        </Button>
      </CardContent>
    </Card>
  )
}
