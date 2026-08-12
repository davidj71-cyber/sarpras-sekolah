import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default admin credentials — auto-seed if missing
const DEFAULT_ADMIN = {
  name: 'Administrator',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
}

// Ensure admin user exists (auto-seed). Runs once per cold start.
let adminSeeded = false
async function ensureAdminExists() {
  if (adminSeeded) return
  try {
    const existing = await db.user.findUnique({ where: { username: DEFAULT_ADMIN.username } })
    if (!existing) {
      await db.user.create({ data: DEFAULT_ADMIN })
      console.log('[auth] Default admin user seeded: admin / admin123')
    }
    adminSeeded = true
  } catch (error) {
    // Jangan throw — biarkan login gagal dengan 401 jika seed gagal
    console.error('[auth] Failed to seed admin:', error)
  }
}

// Retry DB operation with exponential backoff (untuk SQLite lock issues)
async function withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      // Retry hanya untuk error yang biasanya transient (lock, connection)
      const msg = error instanceof Error ? error.message : String(error)
      const isTransient =
        msg.includes(' SQLITE_BUSY') ||
        msg.includes('SQLITE_LOCKED') ||
        msg.includes('connection') ||
        msg.includes('Can\'t reach database server')
      if (!isTransient || attempt === retries) throw error
      // Wait 100ms, 200ms, ...
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
    }
  }
  throw lastError
}

// No-cache headers untuk mencegah browser/gateway cache response error lama
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function POST(request: Request) {
  try {
    // Parse JSON body safely — a missing or malformed body is a client
    // error (400), not a server error (500).
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Format permintaan tidak valid. Silakan coba lagi.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { username, password } = (body ?? {}) as {
      username?: unknown
      password?: unknown
    }

    // Pastikan body adalah object dengan field username & password
    if (
      typeof body !== 'object' ||
      body === null ||
      !('username' in body) ||
      !('password' in body)
    ) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password.trim()
    ) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const cleanUsername = username.trim()

    // Pastikan admin default ada sebelum mencoba login
    if (cleanUsername === DEFAULT_ADMIN.username) {
      await ensureAdminExists()
    }

    // Query user dengan retry untuk transient DB errors
    const user = await withRetry(() =>
      db.user.findUnique({ where: { username: cleanUsername } })
    )

    if (!user || user.password !== password.trim()) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Akun tidak aktif. Hubungi administrator.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    // Log error asli lengkap untuk debugging
    console.error('Auth error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Auth error detail:', errMsg)

    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba beberapa saat lagi.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
