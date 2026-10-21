'use client'

import { ThemeProvider } from 'next-themes'
import AuthForm from '@/components/auth/auth-form'
import ConsoleWarmup from '@/components/console-warmup'

export default function LoginPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthForm mode="login" />
      {/* Task 111: 登录页空闲期预拉控制台 chunk, 进入后台加载动画近零 */}
      <ConsoleWarmup />
    </ThemeProvider>
  )
}
