import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const auth = await getCurrentUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: auth.userId },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const auth = await getCurrentUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, amount, category, note, date } = body

  if (!['income', 'expense', 'transfer'].includes(type)) {
    return NextResponse.json({ error: 'Type tidak valid' }, { status: 400 })
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Amount harus angka > 0' }, { status: 400 })
  }
  if (type === 'transfer' && category !== 'tabungan') {
    return NextResponse.json({ error: 'Kategori transfer tidak valid' }, { status: 400 })
  }

  const trx = await prisma.transaction.create({
    data: {
      userId: auth.userId,
      type, amount, category, note,
      date: date ? new Date(date) : new Date(),
    },
  })
  return NextResponse.json(trx, { status: 201 })
}