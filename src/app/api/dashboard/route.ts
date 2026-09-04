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

    // ── Berita Acara Peminjaman stats ────────────────────────────────────────
    let activeBorrowings = 0
    let totalBorrowings = 0
    let overdueBorrowings = 0
    let recentBorrowings: Array<{
      id: string; baNumber: string; borrowDate: string; status: string;
      borrower: { name: string } | null;
      items: { id: string }[];
    }> = []
    try {
      activeBorrowings = await db.borrowingEntry.count({ where: { status: 'Dipinjam' } })
      totalBorrowings = await db.borrowingEntry.count()
      overdueBorrowings = await db.borrowingEntry.count({
        where: {
          status: 'Dipinjam',
          expectedReturnDate: { lt: new Date() },
        },
      })
      recentBorrowings = await db.borrowingEntry.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: { select: { name: true } },
          items: { select: { id: true } },
        },
      })
    } catch { /* tables might not exist yet */ }

    // ── Galon stats ─────────────────────────────────────────────────────────
    let totalGalonEntries = 0
    let galonBonUnpaid = 0
    let recentGalon: Array<{
      id: string; recipient: string; receivedDate: string;
      paymentMethod: string; paymentStatus: string;
      emptyCount: number; filledCount: number;
    }> = []
    try {
      totalGalonEntries = await db.galonEntry.count()
      galonBonUnpaid = await db.galonEntry.count({ where: { paymentStatus: 'BELUM_BAYAR' } })
      recentGalon = await db.galonEntry.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, recipient: true, receivedDate: true, paymentMethod: true, paymentStatus: true, emptyCount: true, filledCount: true },
      })
    } catch { /* tables might not exist yet */ }

    // ── Gaji stats ──────────────────────────────────────────────────────────
    let totalSalaryEntries = 0
    let totalSalaryThisYear = 0
    try {
      totalSalaryEntries = await db.salaryEntry.count()
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const yearEnd = new Date(new Date().getFullYear() + 1, 0, 1)
      const salaryPayments = await db.salaryPayment.findMany({
        where: { paidAt: { gte: yearStart, lt: yearEnd } },
        select: { amount: true },
      })
      totalSalaryThisYear = salaryPayments.reduce((s, p) => s + p.amount, 0)
    } catch { /* tables might not exist yet */ }

    // ── Media stats ─────────────────────────────────────────────────────────
    let totalMediaEntries = 0
    let mediaActiveCount = 0
    try {
      totalMediaEntries = await db.mediaEntry.count()
      // Media dengan payment terbaru tahun ini = aktif
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      mediaActiveCount = await db.mediaPayment.count({
        where: { paidAt: { gte: yearStart } },
      })
    } catch { /* tables might not exist yet */ }

    // ── BON unpaid orders ───────────────────────────────────────────────────
    let bonUnpaidCount = 0
    let bonUnpaidAmount = 0
    try {
      const bonOrders = await db.order.findMany({
        where: { paymentMethod: 'BON', paymentStatus: 'BELUM_BAYAR' },
        select: { totalAmount: true },
      })
      bonUnpaidCount = bonOrders.length
      bonUnpaidAmount = bonOrders.reduce((s, o) => s + o.totalAmount, 0)
    } catch { /* ignore */ }

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
      // Berita Acara
      activeBorrowings,
      totalBorrowings,
      overdueBorrowings,
      recentBorrowings,
      // Galon
      totalGalonEntries,
      galonBonUnpaid,
      recentGalon,
      // Gaji
      totalSalaryEntries,
      totalSalaryThisYear,
      // Media
      totalMediaEntries,
      mediaActiveCount,
      // BON
      bonUnpaidCount,
      bonUnpaidAmount,
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
        activeBorrowings: 0, totalBorrowings: 0, overdueBorrowings: 0,
        recentBorrowings: [],
        totalGalonEntries: 0, galonBonUnpaid: 0, recentGalon: [],
        totalSalaryEntries: 0, totalSalaryThisYear: 0,
        totalMediaEntries: 0, mediaActiveCount: 0,
        bonUnpaidCount: 0, bonUnpaidAmount: 0,
      },
      { status: 200 }
    )
  }
}
