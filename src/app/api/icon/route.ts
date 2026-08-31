import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Favicon default (SVG sederhana) jika logo sekolah belum diupload
const DEFAULT_SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
  <rect width="30" height="30" rx="6" fill="#16a34a"/>
  <path d="M8 9 L15 20 L22 9" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

function base64ToBuffer(base64: string): Buffer | null {
  try {
    // Data URL format: data:image/png;base64,XXXX
    const match = base64.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return Buffer.from(match[2], 'base64')
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const settings = await db.schoolSettings.findFirst()

    // Jika ada logo sekolah, sajikan sebagai favicon
    if (settings?.logo) {
      const buf = base64ToBuffer(settings.logo)
      if (buf) {
        // Deteksi content type dari data URL
        const match = settings.logo.match(/^data:([^;]+);base64,/)
        const contentType = match?.[1] || 'image/png'
        return new NextResponse(buf, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }
    }

    // Fallback: SVG default
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch {
    // Jika DB error, tetap return SVG default agar favicon tidak 404
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }
}
