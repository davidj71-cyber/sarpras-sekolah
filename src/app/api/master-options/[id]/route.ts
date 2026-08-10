import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/master-options/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.masterOption.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/master-options/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus opsi' },
      { status: 500 }
    )
  }
}
