import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Akses khusus admin' }, { status: 403 })
  }

  const { id } = await params
  if (id === currentUser.userId) {
    return NextResponse.json({ error: 'Role akun sendiri tidak dapat diubah' }, { status: 400 })
  }

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('role' in body)) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const role = body.role
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ error: 'Role harus user atau admin' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id },
        select: { id: true, username: true, role: true, createdAt: true },
      })
      if (!target) return { status: 'not-found' as const }

      if (target.role === 'admin' && role === 'user') {
        const adminCount = await transaction.user.count({ where: { role: 'admin' } })
        if (adminCount <= 1) return { status: 'last-admin' as const }
      }

      const user = await transaction.user.update({
        where: { id },
        data: { role },
        select: { id: true, username: true, role: true, createdAt: true },
      })
      return { status: 'updated' as const, user }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.status === 'not-found') {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }
    if (result.status === 'last-admin') {
      return NextResponse.json({ error: 'Minimal harus ada satu admin' }, { status: 409 })
    }

    return NextResponse.json(result.user)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Perubahan role bertabrakan. Coba lagi.' }, { status: 409 })
    }
    console.error('Update user role error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui role pengguna' }, { status: 500 })
  }
}
