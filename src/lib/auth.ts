import { auth } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export async function requireAuth() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return session
}

export async function requireRole(role: string) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    if (session.user?.role !== role && session.user?.role !== "ADMIN") {
        redirect("/")
    }

    return session
}
