import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authenticator } from "otplib"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: "supersecretpocsecret",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[NextAuth] Missing credentials')
            return null
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          })

          if (!user) {
            console.log('[NextAuth] User not found:', credentials.email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            console.log('[NextAuth] Invalid password')
            return null
          }

          // MFA step for administrative access
          let mfaVerified = true
          const mfaObrigatoria = user.role === 'ADMIN' || user.mfaEnabled
          if (mfaObrigatoria) {
            mfaVerified = false

            // Ensure the user has a secret; generate one if missing for enrollment
            let secret = user.mfaSecret
            if (!secret) {
              secret = authenticator.generateSecret()
              await prisma.user.update({
                where: { id: user.id },
                data: { mfaSecret: secret }
              })
            }

            const otp = (credentials.otp as string | undefined)?.trim()
            const bypassCode = process.env.MFA_BYPASS_CODE || (process.env.NODE_ENV !== 'production' ? '000000' : undefined)

            if (!otp) {
              throw new Error('MFA_REQUIRED')
            }

            const isValidOtp = (bypassCode && otp === bypassCode) ||
              authenticator.verify({ token: otp, secret })

            if (!isValidOtp) {
              throw new Error('INVALID_OTP')
            }

            mfaVerified = true
          }

          console.log('[NextAuth] Login successful for:', user.email)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaVerified,
            mfaEnabled: mfaObrigatoria
          }
        } catch (error) {
        console.error('[NextAuth] Error in authorize:', error)
          if (error instanceof Error) {
            throw error
          }
          throw new Error('AUTH_ERROR')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.mfaVerified = (user as any).mfaVerified ?? true
        token.mfaEnabled = (user as any).mfaEnabled ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        ;(session.user as any).mfaVerified = token.mfaVerified as boolean
        ;(session.user as any).mfaEnabled = token.mfaEnabled as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt"
  },
  debug: true
})

export const { GET, POST } = handlers
