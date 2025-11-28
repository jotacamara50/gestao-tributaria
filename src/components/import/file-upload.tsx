"use client"

import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export function FileUpload() {
    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        // Mock upload logic would go here
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Nova Importação</CardTitle>
                <CardDescription>
                    Arraste arquivos PGDAS, DEFIS, DAF607 ou XML de Notas Fiscais aqui.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Arraste e solte arquivos aqui</h3>
                    <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar do computador</p>
                    <Button>Selecionar Arquivos</Button>
                    <p className="text-xs text-muted-foreground mt-4">
                        Suporta: .xml, .csv, .xls, .pdf (max 50MB)
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
