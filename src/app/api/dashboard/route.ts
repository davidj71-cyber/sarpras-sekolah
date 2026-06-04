import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Basic counts
    const [
      totalStores,
      totalEmployees,
      totalRooms,
      totalBilik,
      totalLemari,
      totalItems,
      totalOrders,
      totalBarangMasuk,
    ] = await Promise.all([
      db.store.count(),
      db.employee.count(),
      db.room.count(),
      db.bilik.count(),
      db.lemari.count(),
      db.item.count(),
      db.order.count(),
      db.barangMasuk.count(),
    ])

    // Item conditions
    const itemsBaik = await db.item.count({ where: { condition: 'Baik' } })
    const itemsRusakRingan = await db.item.count({ where: { condition: 'Rusak Ringan' } })
    const itemsRusakBerat = await db.item.count({ where: { condition: 'Rusak Berat' } })

    // Items by KIB type
    const kibA = await db.item.count({ where: { kibType: 'A' } })
    const kibB = await db.item.count({ where: { kibType: 'B' } })
    const kibC = await db.item.count({ where: { kibType: 'C' } })
    const kibD = await db.item.count({ where: { kibType: 'D' } })
    const kibE = await db.item.count({ where: { kibType: 'E' } })
    const kibF = await db.item.count({ where: { kibType: 'F' } })

    // Total asset value
    const itemsWithValue = await db.item.findMany({
      select: { price: true, quantity: true },
    })
    const totalAssetValue = itemsWithValue.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    // Order stats
    const ordersDraft = await db.order.count({ where: { status: 'Draft' } })
    const ordersDikirim = await db.order.count({ where: { status: 'Dikirim' } })
    const ordersDiterima = await db.order.count({ where: { status: 'Diterima' } })
    const ordersSelesai = await db.order.count({ where: { status: 'Selesai' } })

    // Barang masuk stats
    const bmDraft = await db.barangMasuk.count({ where: { status: 'Draft' } })
    const bmDiterima = await db.barangMasuk.count({ where: { status: 'Diterima' } })
    const bmDitolak = await db.barangMasuk.count({ where: { status: 'Ditolak' } })

    // Items without room (not placed anywhere)
    const itemsWithoutRoom = await db.item.count({ where: { roomId: null } })

    // Recent orders (last 5)
    const recentOrders = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { name: true } },
        employee: { select: { name: true } },
        items: { select: { id: true } },
      },
    })

    // Recent barang masuk (last 5)
    const recentBarangMasuk = await db.barangMasuk.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { name: true } },
        employee: { select: { name: true } },
        items: { select: { id: true } },
      },
    })

    // Items per room
    const roomsWithItems = await db.room.findMany({
      select: {
        name: true,
        _count: { select: { items: true } },
      },
      orderBy: { items: { _count: 'desc' } },
      take: 10,
    })

    // Damaged items that need attention
    const damagedItems = await db.item.findMany({
      where: {
        OR: [
          { condition: 'Rusak Ringan' },
          { condition: 'Rusak Berat' },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        condition: true,
        registrationNumber: true,
        room: { select: { name: true } },
      },
    })

    return NextResponse.json({
      // Basic counts
      totalStores,
      totalEmployees,
      totalRooms,
      totalBilik,
      totalLemari,
      totalItems,
      totalOrders,
      totalBarangMasuk,
      // Conditions
      itemsBaik,
      itemsRusakRingan,
      itemsRusakBerat,
      // KIB breakdown
      kibBreakdown: [
        { type: 'A', label: 'KIB A - Tanah', count: kibA },
        { type: 'B', label: 'KIB B - Peralatan & Mesin', count: kibB },
        { type: 'C', label: 'KIB C - Gedung & Bangunan', count: kibC },
        { type: 'D', label: 'KIB D - Jalan, Irigasi & Jaringan', count: kibD },
        { type: 'E', label: 'KIB E - Aset Tetap Lainnya', count: kibE },
        { type: 'F', label: 'KIB F - Konstruksi Dalam Pengerjaan', count: kibF },
      ],
      // Value
      totalAssetValue,
      // Orders
      ordersDraft,
      ordersDikirim,
      ordersDiterima,
      ordersSelesai,
      // Barang masuk
      bmDraft,
      bmDiterima,
      bmDitolak,
      // Location
      itemsWithoutRoom,
      // Recent
      recentOrders,
      recentBarangMasuk,
      // Chart data
      roomsWithItems,
      damagedItems,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      {
        totalStores: 0, totalEmployees: 0, totalRooms: 0,
        totalBilik: 0, totalLemari: 0, totalItems: 0,
        totalOrders: 0, totalBarangMasuk: 0,
        itemsBaik: 0, itemsRusakRingan: 0, itemsRusakBerat: 0,
        kibBreakdown: [],
        totalAssetValue: 0,
        ordersDraft: 0, ordersDikirim: 0, ordersDiterima: 0, ordersSelesai: 0,
        bmDraft: 0, bmDiterima: 0, bmDitolak: 0,
        itemsWithoutRoom: 0,
        recentOrders: [], recentBarangMasuk: [],
        roomsWithItems: [], damagedItems: [],
      },
      { status: 200 }
    )
  }
}
