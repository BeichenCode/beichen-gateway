'use client'

import { ThemeProvider } from 'next-themes'
import AuthForm from '@/components/auth/auth-form'

export default function RegisterPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthForm mode="register" />
    </ThemeProvider>
  )
}
