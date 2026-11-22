import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Akses khusus admin' }, { status: 403 })
  }

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Pilih pengguna yang valid' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'user' },
    select: { id: true, username: true },
  })
  if (!user) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, user: { is: { role: 'user' } } },
    select: {
      id: true,
      type: true,
      amount: true,
      category: true,
      note: true,
      date: true,
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(transactions.map((transaction) => ({
    ...transaction,
    username: user.username,
  })))
}
