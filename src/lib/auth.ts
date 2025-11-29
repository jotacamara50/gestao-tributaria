/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export async function requireAuth() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const mfaVerified = (session.user as any)?.mfaVerified
    const mfaEnabled = (session.user as any)?.mfaEnabled

    if (mfaEnabled && !mfaVerified) {
        redirect("/login?error=MFA_REQUIRED")
    }

    return session
}

export async function requireRole(role: string) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const mfaVerified = (session.user as any)?.mfaVerified
    const mfaEnabled = (session.user as any)?.mfaEnabled

    if (mfaEnabled && !mfaVerified) {
        redirect("/login?error=MFA_REQUIRED")
    }

    if (session.user?.role !== role && session.user?.role !== "ADMIN") {
        redirect("/")
    }

    return session
}
