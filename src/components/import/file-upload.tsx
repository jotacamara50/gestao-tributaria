"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function FileUpload() {
    const router = useRouter()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileType, setFileType] = useState<string>("PGDAS")
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
            setError(null)
            setResult(null)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0])
            setError(null)
            setResult(null)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Selecione um arquivo primeiro")
            return
        }

        setUploading(true)
        setError(null)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('type', fileType)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao processar arquivo')
            }

            setResult(data)
            setSelectedFile(null)

            // Refresh the page after successful upload
            setTimeout(() => {
                router.refresh()
            }, 1500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload de Arquivos Fiscais</CardTitle>
                <CardDescription>
                    Arraste e solte ou selecione arquivos PGDAS, NFS-e ou DAF607
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Button
                        variant={fileType === "PGDAS" ? "default" : "outline"}
                        onClick={() => setFileType("PGDAS")}
                    >
                        PGDAS
                    </Button>
                    <Button
                        variant={fileType === "NFSE" ? "default" : "outline"}
                        onClick={() => setFileType("NFSE")}
                    >
                        NFS-e
                    </Button>
                    <Button
                        variant={fileType === "DAF607" ? "default" : "outline"}
                        onClick={() => setFileType("DAF607")}
                    >
                        DAF607
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
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">
                            {selectedFile ? selectedFile.name : "Clique ou arraste um arquivo"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Arquivos XML ou CSV (máx. 10MB)
                        </p>
                    </label>
                </div>

                {selectedFile && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm flex-1">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                        </span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {result && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{result.message}</span>
                    </div>
                )}

                <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="w-full"
                >
                    {uploading ? "Processando..." : "Processar Arquivo"}
                </Button>
            </CardContent>
        </Card>
    )
}
