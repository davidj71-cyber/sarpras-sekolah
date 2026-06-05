import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Return users with passwords visible for admin
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data pengguna' }, { status: 500 })
  }
}

// POST create user
export async function POST(request: Request) {
  try {
    const { name, username, password, role } = await request.json()

    if (!name?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Nama, username, dan password wajib diisi' }, { status: 400 })
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        role: role || 'staff',
        active: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 })
  }
}
