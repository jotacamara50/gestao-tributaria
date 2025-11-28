import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Gestão Tributária",
  description: "Sistema Web para Operacionalização e Gestão de Informações Tributárias e Fiscais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full">
              <div className="flex items-center p-4 border-b">
                <SidebarTrigger />
                <h1 className="ml-4 text-lg font-semibold">Painel Administrativo</h1>
              </div>
              <div className="p-6">
                {children}
              </div>
            </main>
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
