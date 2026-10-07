import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all bank accounts (sorted by sortOrder, then createdAt)
export async function GET() {
  try {
    const accounts = await db.bankAccount.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(accounts)
  } catch (error) {
    // Return error detail supaya bisa diagnose (tabel belum ada? koneksi gagal?)
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[bank-accounts] GET error:', msg)
    return NextResponse.json(
      { error: 'Gagal mengambil data rekening', detail: msg.slice(0, 300) },
      { status: 500 }
    )
  }
}

// POST create a new bank account
export async function POST(request: Request) {
  try {
    const { accountNumber, accountName, description } = await request.json()

    // accountNumber boleh kosong saat awal tambah (user isi setelahnya).
    // Tapi kalau sudah diisi, cek duplikat.
    const trimmedNumber = (accountNumber || '').trim()
    if (trimmedNumber) {
      const existing = await db.bankAccount.findFirst({
        where: { accountNumber: { equals: trimmedNumber } },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Nomor rekening sudah ada di daftar' },
          { status: 409 },
        )
      }
    }

    // sortOrder: letakkan di akhir (max + 1)
    const maxSort = await db.bankAccount.aggregate({ _max: { sortOrder: true } })
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1

    const account = await db.bankAccount.create({
      data: {
        accountNumber: trimmedNumber,
        accountName: (accountName || '').trim(),
        description: (description || '').trim(),
        sortOrder: nextSort,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[bank-accounts] POST error:', msg)
    return NextResponse.json(
      { error: 'Gagal membuat rekening', detail: msg.slice(0, 300) },
      { status: 500 }
    )
  }
}
