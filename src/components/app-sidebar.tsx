"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Upload,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  LifeBuoy,
  Settings,
  LogOut,
  PieChart,
  Mail,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"

const data = {
  user: {
    name: "Fiscal Admin",
    email: "admin@prefeitura.gov.br",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Importacao",
      url: "/importacao",
      icon: Upload,
    },
    {
      title: "Cadastro Fiscal",
      url: "/contribuintes",
      icon: Building2,
    },
    {
      title: "Cruzamento",
      url: "/cruzamento",
      icon: AlertTriangle,
    },
    {
      title: "DTE-SN",
      url: "/dte",
      icon: Mail,
    },
    {
      title: "Relatorios",
      url: "/relatorios",
      icon: FileSpreadsheet,
    },
    {
      title: "Fiscalizacao",
      url: "/fiscalizacao",
      icon: AlertTriangle,
    },
    {
      title: "Usuarios",
      url: "/usuarios",
      icon: Building2,
      role: "ADMIN",
    },
    {
      title: "Configuracoes",
      url: "/configuracoes",
      icon: Settings,
    },
    {
      title: "Suporte",
      url: "/suporte",
      icon: LifeBuoy,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [userName, setUserName] = React.useState<string>(data.user.name)
  const [userEmail, setUserEmail] = React.useState<string>(data.user.email)

  React.useEffect(() => {
    // best effort: role might be set on window for client-side menu filtering
    if (typeof window !== "undefined" && (window as any).__USER_ROLE) {
      setUserRole((window as any).__USER_ROLE)
    }
    async function loadRole() {
      try {
        const resp = await fetch("/api/auth/session")
        if (resp.ok) {
          const data = await resp.json()
          const role = data?.user?.role || null
          setUserName(data?.user?.name || "Usuario")
          setUserEmail(data?.user?.email || "")
          setUserRole(role)
          if (typeof window !== "undefined") {
            ;(window as any).__USER_ROLE = role
          }
        }
      } catch {
        // ignore
      }
    }
    loadRole()
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <PieChart className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Gestao Tributaria</span>
                  <span className="truncate text-xs">Prefeitura Municipal</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.navMain
            .filter((item) => {
              if (!item.role) return true
              if (userRole === "ADMIN") return true
              return item.role === userRole
            })
            .map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton size="lg" asChild tooltip={item.title}>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={async (e) => {
                e.preventDefault()
                try {
                  await signOut({ callbackUrl: "/login", redirect: true })
                } catch {
                  // ignore
                } finally {
                  if (typeof window !== "undefined") {
                    ;(window as any).__USER_ROLE = null
                  }
                }
              }}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={data.user.avatar} alt={userName} />
                <AvatarFallback className="rounded-lg">FA</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs">{userEmail}</span>
              </div>
              <LogOut className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
