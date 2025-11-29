import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(cpf: string) {
  const digits = (cpf || "").replace(/\D/g, "").padStart(11, "0").slice(-11)
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "***.$2.$3-**")
}
