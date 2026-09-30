import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT update a bank account
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { accountNumber, accountName, description } = await request.json()

    const trimmedNumber = (accountNumber || '').trim()
    // Cek duplikat nomor rekening (kecuali dirinya sendiri) kalau tidak kosong
    if (trimmedNumber) {
      const existing = await db.bankAccount.findFirst({
        where: {
          accountNumber: { equals: trimmedNumber },
          NOT: { id },
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Nomor rekening sudah ada di daftar' },
          { status: 409 },
        )
      }
    }

    const updated = await db.bankAccount.update({
      where: { id },
      data: {
        accountNumber: trimmedNumber,
        accountName: (accountName || '').trim(),
        description: (description || '').trim(),
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui rekening' }, { status: 500 })
  }
}

// DELETE a bank account
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await db.bankAccount.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus rekening' }, { status: 500 })
  }
}
