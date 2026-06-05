import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT update user
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    // If username is being changed, check for duplicates
    if (body.username && body.username !== existing.username) {
      const duplicate = await db.user.findUnique({ where: { username: body.username } })
      if (duplicate) {
        return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.username !== undefined) updateData.username = body.username.trim()
    if (body.password !== undefined) updateData.password = body.password.trim()
    if (body.role !== undefined) updateData.role = body.role
    if (body.active !== undefined) updateData.active = body.active

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 })
  }
}

// DELETE user
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 })
  }
}
