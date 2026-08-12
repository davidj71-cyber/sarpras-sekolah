import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Health check endpoint — untuk verifikasi server & database berfungsi
// Tidak di-cache, selalu return status real-time
export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  const start = Date.now()

  try {
    // Test database connection
    const userCount = await db.user.count()
    const settingsCount = await db.schoolSettings.count()

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'next.js',
        database: 'connected',
        stats: {
          users: userCount,
          settings: settingsCount,
        },
        responseTimeMs: Date.now() - start,
      },
      { headers }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs: Date.now() - start,
      },
      { status: 503, headers }
    )
  }
}
