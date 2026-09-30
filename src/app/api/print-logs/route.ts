import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET — list all print logs, sorted by printDate DESC.
// Returns all fields EXCEPT contentHtml (to keep payload small for the list view).
// Supports optional ?category=rekening-koran|salary|media query filter.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.trim() || undefined

    const where = category ? { category } : undefined

    const logs = await db.printLog.findMany({
      where,
      orderBy: { printDate: 'desc' },
      select: {
        id: true,
        category: true,
        printDate: true,
        periodLabel: true,
        letterNumber: true,
        bankName: true,
        printMode: true,
        title: true,
        orientation: true,
        createdAt: true,
        // contentHtml sengaja TIDAK di-select supaya payload list tetap kecil.
      },
    })

    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil riwayat pencetakan' }, { status: 500 })
  }
}

// POST — create a new print log.
// Body: { category, periodLabel, letterNumber?, bankName?, printMode?, title, contentHtml, orientation }
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const category = (body.category || '').toString().trim()
    const title = (body.title || '').toString().trim()
    const contentHtml = body.contentHtml ? String(body.contentHtml) : ''

    if (!category) {
      return NextResponse.json({ error: 'Category wajib diisi' }, { status: 400 })
    }
    if (!contentHtml) {
      return NextResponse.json({ error: 'contentHtml wajib diisi' }, { status: 400 })
    }

    // Validasi kategori yang dikenal
    const validCategories = ['rekening-koran', 'salary', 'media']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Category tidak valid. Harus salah satu: ${validCategories.join(', ')}` }, { status: 400 })
    }

    const periodLabel = (body.periodLabel || '').toString()
    const letterNumber = (body.letterNumber || '').toString()
    const bankName = (body.bankName || '').toString()
    const printMode = (body.printMode || '').toString()
    const orientationRaw = (body.orientation || 'portrait').toString().trim().toLowerCase()
    const orientation = orientationRaw === 'landscape' ? 'landscape' : 'portrait'

    const created = await db.printLog.create({
      data: {
        category,
        periodLabel,
        letterNumber,
        bankName,
        printMode,
        title,
        contentHtml,
        orientation,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan riwayat pencetakan' }, { status: 500 })
  }
}
