import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [totalStores, totalEmployees, totalRooms, totalItems] = await Promise.all([
      db.store.count(),
      db.employee.count(),
      db.room.count(),
      db.item.count(),
    ])

    return NextResponse.json({
      totalStores,
      totalEmployees,
      totalRooms,
      totalItems,
    })
  } catch {
    return NextResponse.json(
      { totalStores: 0, totalEmployees: 0, totalRooms: 0, totalItems: 0 },
      { status: 200 }
    )
  }
}
