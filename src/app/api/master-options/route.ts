import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/master-options?category=satuan
// Returns list of option values for a given category (sorted alphabetically).
// If no category provided, returns all options grouped is fine but typically filtered.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}
    const options = await db.masterOption.findMany({
      where,
      orderBy: [{ category: 'asc' }, { value: 'asc' }],
    })

    return NextResponse.json({ success: true, data: options })
  } catch (error) {
    console.error('GET /api/master-options error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal memuat daftar opsi' },
      { status: 500 }
    )
  }
}

// POST /api/master-options
// Body: { category: string, value: string }
// Creates a new master option. If it already exists (unique constraint), returns existing.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const category = String(body.category || '').trim()
    const value = String(body.value || '').trim()

    if (!category || !value) {
      return NextResponse.json(
        { success: false, error: 'category dan value wajib diisi' },
        { status: 400 }
      )
    }

    // Try to create; if unique constraint violated, fetch existing
    let option
    try {
      option = await db.masterOption.create({
        data: { category, value },
      })
    } catch {
      option = await db.masterOption.findUnique({
        where: { category_value: { category, value } },
      })
    }

    return NextResponse.json({ success: true, data: option })
  } catch (error) {
    console.error('POST /api/master-options error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan opsi' },
      { status: 500 }
    )
  }
}
