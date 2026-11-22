import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const instant = false

async function DashboardSessionGate({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const auth = await getCurrentUser()
  if (!auth) {
    redirect('/login')
  }

  return children
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 dark:bg-slate-950" />}>
      <DashboardSessionGate>{children}</DashboardSessionGate>
    </Suspense>
  )
}