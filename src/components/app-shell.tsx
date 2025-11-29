"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideShell = pathname?.startsWith("/portal") || pathname?.startsWith("/login")

  if (hideShell) {
    return (
      <main className="w-full">
        <div className="p-6">
          {children}
        </div>
      </main>
    )
  }

  return (
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
  )
}
