import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Akun tidak aktif. Hubungi administrator.' }, { status: 403 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
