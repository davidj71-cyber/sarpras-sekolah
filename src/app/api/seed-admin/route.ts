import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST seed default admin account
export async function POST() {
  try {
    // Check if admin already exists
    const existing = await db.user.findUnique({ where: { username: 'admin' } })
    if (existing) {
      return NextResponse.json({ message: 'Admin sudah ada', user: existing })
    }

    const admin = await db.user.create({
      data: {
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        active: true,
      },
    })

    return NextResponse.json({ message: 'Admin berhasil dibuat', user: admin }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat admin default' }, { status: 500 })
  }
}
