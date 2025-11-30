import { FileUpload } from "@/components/import/file-upload"
import { ImportHistory } from "@/components/import/import-history"

export default function ImportPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Central de Importações</h2>
                <p className="text-muted-foreground">
                    Importe arquivos fiscais para alimentar a base de dados e realizar cruzamentos.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <FileUpload />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Instruções</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        <li>PGDAS: XML padrão da Receita Federal (últimos 60 meses).</li>
                        <li>NFSe: CSV/XML com município de prestação, ISS retido, alíquota e valor retido.</li>
                        <li>DAS-D: CSV com CNPJ e competência entregue.</li>
                        <li>DEFIS: CSV/XML com exercícios, recibos e sócios.</li>
                        <li>Parcelamentos/Guias: CSV com parcelas/valores/situação e tributos da guia.</li>
                        <li>Planilhas de repasse (DAF607) devem ser CSV ou Excel.</li>
                        <li>O sistema valida automaticamente a integridade dos arquivos.</li>
                        <li>Arquivos maiores que 50MB devem ser compactados (.zip).</li>
                    </ul>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Histórico de Importações</h3>
                <ImportHistory />
            </div>
        </div>
    )
}
