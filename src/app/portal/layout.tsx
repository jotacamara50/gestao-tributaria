import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Portal do Contribuinte",
  description: "Consulta de mensagens e notificacoes para empresas"
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          <div className="max-w-5xl mx-auto py-8 px-4">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  )
}
