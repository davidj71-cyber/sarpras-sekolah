import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET — return full record INCLUDING contentHtml (for re-print).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const log = await db.printLog.findUnique({ where: { id } })

    if (!log) {
      return NextResponse.json({ error: 'Riwayat pencetakan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(log)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil riwayat pencetakan' }, { status: 500 })
  }
}

// DELETE — delete a print log by id.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await db.printLog.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Riwayat pencetakan tidak ditemukan' }, { status: 404 })
    }

    await db.printLog.delete({ where: { id } })

    return NextResponse.json({ message: 'Riwayat pencetakan berhasil dihapus' })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus riwayat pencetakan' }, { status: 500 })
  }
}
