import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// HAPUS TRANSAKSI
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  
  // Pastikan transaksi ini milik user yang lagi login
  const found = await prisma.transaction.findFirst({
    where: { id, userId: auth.userId },
  })
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}