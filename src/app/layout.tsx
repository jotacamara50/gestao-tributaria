import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppShell } from "@/components/app-shell"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Gestao Tributaria",
  description: "Sistema Web para Operacionalizacao e Gestao de Informacoes Tributarias e Fiscais",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
