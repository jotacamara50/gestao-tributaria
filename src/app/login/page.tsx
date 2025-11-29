"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [otp, setOtp] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [mfaRequired, setMfaRequired] = useState(searchParams.get("error") === "MFA_REQUIRED")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                otp,
                redirect: false
            }) as any

            if (result?.error) {
                if (result.error === "MFA_REQUIRED") {
                    setMfaRequired(true)
                    setError("Confirme o codigo MFA antes de continuar.")
                } else if (result.error === "INVALID_OTP") {
                    setMfaRequired(true)
                    setError("Codigo MFA invalido ou expirado.")
                } else {
                    setError("Credenciais invalidas")
                }
                setLoading(false)
                return
            }

            if (result?.ok) {
                router.push("/")
            } else {
                setLoading(false)
            }
        } catch (error) {
            setError("Erro ao fazer login")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                        <PieChart className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Sistema de Gestao Tributaria</CardTitle>
                        <CardDescription>
                            Faca login para acessar o sistema
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@prefeitura.gov.br"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="otp">Codigo MFA</Label>
                                <span className="text-xs text-muted-foreground">
                                    {mfaRequired ? "Obrigatorio" : "Opcional (2FA)"}
                                </span>
                            </div>
                            <Input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="6 digitos do autenticador"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={loading}
                                required={mfaRequired}
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                        <div className="text-xs text-center text-muted-foreground mt-4">
                            <p>Credenciais de teste:</p>
                            <p className="font-mono">admin@prefeitura.gov.br / admin123</p>
                            <p className="font-mono">OTP: usar app TOTP ou codigo de emergencia se configurado</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
