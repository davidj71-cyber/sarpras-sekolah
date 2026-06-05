'use client'

import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/lib/navigation-store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Store,
  Users,
  Package,
  FileText,
  PackagePlus,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Warehouse,
  Archive,
  Clock,
  Loader2,
  Sparkles,
  Printer,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint, formatNumberPrint } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, Label } from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  totalStores: number
  totalEmployees: number
  totalRooms: number
  totalBilik: number
  totalLemari: number
  totalItems: number
  totalOrders: number
  totalBarangMasuk: number
  itemsBaik: number
  itemsRusakRingan: number
  itemsRusakBerat: number
  kibBreakdown: { type: string; label: string; count: number }[]
  totalAssetValue: number
  ordersDraft: number
  ordersDikirim: number
  ordersDiterima: number
  ordersSelesai: number
  bmDraft: number
  bmDiterima: number
  bmDitolak: number
  itemsWithoutRoom: number
  recentOrders: {
    id: string
    orderNumber: string
    orderDate: string
    status: string
    totalAmount: number
    store: { name: string } | null
    employee: { name: string } | null
    items: { id: string }[]
  }[]
  recentBarangMasuk: {
    id: string
    documentNumber: string
    entryDate: string
    status: string
    source: string
    store: { name: string } | null
    employee: { name: string } | null
    items: { id: string }[]
  }[]
  roomsWithItems: { name: string; _count: { items: number } }[]
  damagedItems: {
    id: string
    name: string
    condition: string
    registrationNumber: string
    room: { name: string } | null
  }[]
}

// ─── Chart configs ───────────────────────────────────────────────────────────

const conditionChartConfig: ChartConfig = {
  count: { label: 'Jumlah' },
  Baik: { label: 'Baik', color: '#10b981' },
  'Rusak Ringan': { label: 'Rusak Ringan', color: '#f59e0b' },
  'Rusak Berat': { label: 'Rusak Berat', color: '#ef4444' },
}

const kibChartConfig: ChartConfig = {
  count: { label: 'Jumlah' },
  'KIB A': { label: 'KIB A', color: '#0d9488' },
  'KIB B': { label: 'KIB B', color: '#0891b2' },
  'KIB C': { label: 'KIB C', color: '#2563eb' },
  'KIB D': { label: 'KIB D', color: '#7c3aed' },
  'KIB E': { label: 'KIB E', color: '#c026d3' },
  'KIB F': { label: 'KIB F', color: '#e11d48' },
}

const roomChartConfig: ChartConfig = {
  items: { label: 'Barang', color: '#0891b2' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} Jt`
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} Rb`
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function orderStatusBadge(status: string) {
  const variants: Record<string, { className: string }> = {
    Draft: { className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
    Dikirim: { className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' },
    Diterima: { className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    Selesai: { className: 'bg-teal-100 text-teal-700 hover:bg-teal-100' },
  }
  const v = variants[status] || { className: '' }
  return <Badge className={`text-[11px] font-medium ${v.className}`}>{status}</Badge>
}

function bmStatusBadge(status: string) {
  const variants: Record<string, { className: string }> = {
    Draft: { className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
    Diterima: { className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    Ditolak: { className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  }
  const v = variants[status] || { className: '' }
  return <Badge className={`text-[11px] font-medium ${v.className}`}>{status}</Badge>
}

// ─── Stat Card Component ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  delay = 0,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  delay?: number
}) {
  return (
    <Card className={`overflow-hidden card-elegant animate-fade-in-up stagger-${delay}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3.5">
          <div className={`rounded-xl p-2.5 shadow-sm ${iconBg}`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-0.5">{title}</p>
            <p className="text-2xl font-bold tracking-tight stat-value">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setPage, setStoreSubPage, setRoomSubPage } = useNavigationStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const d = await res.json()
          setData(d)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  const conditionData = [
    { condition: 'Baik', count: data.itemsBaik, fill: '#10b981' },
    { condition: 'Rusak Ringan', count: data.itemsRusakRingan, fill: '#f59e0b' },
    { condition: 'Rusak Berat', count: data.itemsRusakBerat, fill: '#ef4444' },
  ]

  const kibData = data.kibBreakdown.map((k, i) => ({
    kib: `KIB ${k.type}`,
    count: k.count,
    fill: ['#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#e11d48'][i],
  }))

  const roomData = data.roomsWithItems.map(r => ({
    name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
    items: r._count.items,
  }))

  const baikPercent = data.totalItems > 0 ? Math.round((data.itemsBaik / data.totalItems) * 100) : 0
  const placedPercent = data.totalItems > 0 ? Math.round(((data.totalItems - data.itemsWithoutRoom) / data.totalItems) * 100) : 0

  const handlePrint = async (orientation: PrintOrientation = 'portrait') => {
    const placed = data.totalItems - data.itemsWithoutRoom
    const rrPercent = data.totalItems > 0 ? ((data.itemsRusakRingan / data.totalItems) * 100).toFixed(1) : '0'
    const rbPercent = data.totalItems > 0 ? ((data.itemsRusakBerat / data.totalItems) * 100).toFixed(1) : '0'

    // Section 1: Ringkasan Statistik
    const section1 = `
      <div style="margin-top:20px;"><strong>I. Ringkasan Statistik</strong></div>
      <table style="width:auto; margin:8px 0 16px;">
        <tr><td style="border:none; padding:3px 12px 3px 0; font-weight:bold;">Total Barang</td><td style="border:none; padding:3px 8px;">:</td><td style="border:none; padding:3px 0;">${formatNumberPrint(data.totalItems)}</td></tr>
        <tr><td style="border:none; padding:3px 12px 3px 0; font-weight:bold;">Nilai Aset</td><td style="border:none; padding:3px 8px;">:</td><td style="border:none; padding:3px 0;">${formatRupiahPrint(data.totalAssetValue)}</td></tr>
        <tr><td style="border:none; padding:3px 12px 3px 0; font-weight:bold;">Ruang & Lokasi</td><td style="border:none; padding:3px 8px;">:</td><td style="border:none; padding:3px 0;">${formatNumberPrint(data.totalRooms)} ruang, ${formatNumberPrint(data.totalBilik)} bilik, ${formatNumberPrint(data.totalLemari)} lemari</td></tr>
        <tr><td style="border:none; padding:3px 12px 3px 0; font-weight:bold;">Pesanan</td><td style="border:none; padding:3px 8px;">:</td><td style="border:none; padding:3px 0;">${formatNumberPrint(data.totalOrders)}</td></tr>
      </table>
    `

    // Section 2: Kondisi Barang
    const section2 = `
      <div style="margin-top:12px;"><strong>II. Kondisi Barang</strong></div>
      <table style="margin:8px 0 16px;">
        <thead>
          <tr><th>Kondisi</th><th>Jumlah</th><th>Persentase</th></tr>
        </thead>
        <tbody>
          <tr><td class="text-center">Baik</td><td class="text-right">${formatNumberPrint(data.itemsBaik)}</td><td class="text-right">${baikPercent}%</td></tr>
          <tr><td class="text-center">Rusak Ringan</td><td class="text-right">${formatNumberPrint(data.itemsRusakRingan)}</td><td class="text-right">${rrPercent}%</td></tr>
          <tr><td class="text-center">Rusak Berat</td><td class="text-right">${formatNumberPrint(data.itemsRusakBerat)}</td><td class="text-right">${rbPercent}%</td></tr>
          <tr style="font-weight:bold;"><td class="text-center">Total</td><td class="text-right">${formatNumberPrint(data.totalItems)}</td><td class="text-right">100%</td></tr>
        </tbody>
      </table>
    `

    // Section 3: Klasifikasi KIB
    const kibRows = data.kibBreakdown.map(k =>
      `<tr><td class="text-center">KIB ${k.type}</td><td>${k.label}</td><td class="text-right">${formatNumberPrint(k.count)}</td></tr>`
    ).join('\n')
    const section3 = `
      <div style="margin-top:12px;"><strong>III. Klasifikasi KIB</strong></div>
      <table style="margin:8px 0 16px;">
        <thead>
          <tr><th>Jenis KIB</th><th>Keterangan</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          ${kibRows}
        </tbody>
      </table>
    `

    // Section 4: Penempatan Barang
    const section4 = `
      <div style="margin-top:12px;"><strong>IV. Penempatan Barang</strong></div>
      <table style="margin:8px 0 16px;">
        <thead>
          <tr><th>Keterangan</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td>Total Barang</td><td class="text-right">${formatNumberPrint(data.totalItems)}</td></tr>
          <tr><td>Ditempatkan</td><td class="text-right">${formatNumberPrint(placed)}</td></tr>
          <tr><td>Belum Ditempatkan</td><td class="text-right">${formatNumberPrint(data.itemsWithoutRoom)}</td></tr>
          <tr style="font-weight:bold;"><td>Persentase Ditempatkan</td><td class="text-right">${placedPercent}%</td></tr>
        </tbody>
      </table>
    `

    // Section 5: Status Pesanan
    const section5 = `
      <div style="margin-top:12px;"><strong>V. Status Pesanan</strong></div>
      <table style="margin:8px 0 16px;">
        <thead>
          <tr><th>Status</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td>Draft</td><td class="text-right">${formatNumberPrint(data.ordersDraft)}</td></tr>
          <tr><td>Dikirim</td><td class="text-right">${formatNumberPrint(data.ordersDikirim)}</td></tr>
          <tr><td>Diterima</td><td class="text-right">${formatNumberPrint(data.ordersDiterima)}</td></tr>
          <tr><td>Selesai</td><td class="text-right">${formatNumberPrint(data.ordersSelesai)}</td></tr>
        </tbody>
      </table>
    `

    // Section 6: Barang Perlu Perhatian
    let section6 = ''
    if (data.damagedItems.length > 0) {
      const damagedRows = data.damagedItems.map((item, idx) =>
        `<tr><td class="text-center">${idx + 1}</td><td>${item.name}</td><td class="text-center">${item.condition}</td><td>${item.room ? item.room.name : '-'}</td><td class="text-center">${item.registrationNumber || '-'}</td></tr>`
      ).join('\n')
      section6 = `
        <div style="margin-top:12px;"><strong>VI. Barang Perlu Perhatian</strong></div>
        <table style="margin:8px 0 16px;">
          <thead>
            <tr><th>No</th><th>Nama Barang</th><th>Kondisi</th><th>Ruangan</th><th>No. Register</th></tr>
          </thead>
          <tbody>
            ${damagedRows}
          </tbody>
        </table>
      `
    } else {
      section6 = `
        <div style="margin-top:12px;"><strong>VI. Barang Perlu Perhatian</strong></div>
        <p style="margin:8px 0 16px; font-style:italic;">Tidak ada barang yang memerlukan perhatian.</p>
      `
    }

    const contentHtml = section1 + section2 + section3 + section4 + section5 + section6

    await printWithKop('LAPORAN DASHBOARD SARANA PRASARANA', contentHtml, orientation)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan data Sarana Prasarana Sekolah</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <Sparkles className="size-3.5 text-primary" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPrintDialogOpen(true)}>
            <Printer className="size-4" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Barang"
          value={data.totalItems}
          subtitle="Barang inventaris terdaftar"
          icon={Package}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          delay={1}
        />
        <StatCard
          title="Nilai Aset"
          value={formatRupiah(data.totalAssetValue)}
          subtitle="Total nilai seluruh aset"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          delay={2}
        />
        <StatCard
          title="Ruang & Lokasi"
          value={data.totalRooms}
          subtitle={`${data.totalBilik} bilik · ${data.totalLemari} lemari`}
          icon={Warehouse}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          delay={3}
        />
        <StatCard
          title="Pesanan"
          value={data.totalOrders}
          subtitle={`${data.ordersDikirim} dikirim · ${data.ordersDraft} draft`}
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          delay={4}
        />
      </div>

      {/* ─── Condition & KIB Charts Row ───────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kondisi Barang */}
        <Card className="card-elegant animate-fade-in-up stagger-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kondisi Barang</CardTitle>
            <CardDescription>Distribusi kondisi seluruh barang inventaris</CardDescription>
          </CardHeader>
          <CardContent>
            {data.totalItems === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Belum ada data barang
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ChartContainer config={conditionChartConfig} className="mx-auto size-[200px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={conditionData}
                      dataKey="count"
                      nameKey="condition"
                      innerRadius={55}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="white"
                    >
                      {conditionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                  {baikPercent}%
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                  Baik
                                </tspan>
                              </text>
                            )
                          }
                          return null
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500" /> Baik
                      </span>
                      <span className="font-medium">{data.itemsBaik} <span className="text-muted-foreground font-normal">({baikPercent}%)</span></span>
                    </div>
                    <Progress value={baikPercent} className="h-2 [&>div]:bg-emerald-500" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-amber-500" /> Rusak Ringan
                      </span>
                      <span className="font-medium">{data.itemsRusakRingan}</span>
                    </div>
                    <Progress value={data.totalItems > 0 ? (data.itemsRusakRingan / data.totalItems) * 100 : 0} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <XCircle className="size-3.5 text-red-500" /> Rusak Berat
                      </span>
                      <span className="font-medium">{data.itemsRusakBerat}</span>
                    </div>
                    <Progress value={data.totalItems > 0 ? (data.itemsRusakBerat / data.totalItems) * 100 : 0} className="h-2 [&>div]:bg-red-500" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KIB Breakdown */}
        <Card className="card-elegant animate-fade-in-up stagger-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Klasifikasi KIB</CardTitle>
            <CardDescription>Distribusi barang berdasarkan jenis KIB</CardDescription>
          </CardHeader>
          <CardContent>
            {data.totalItems === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Belum ada data barang
              </div>
            ) : (
              <ChartContainer config={kibChartConfig} className="h-[250px] w-full">
                <BarChart data={kibData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="kib" type="category" tickLine={false} axisLine={false} width={50} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {kibData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Location & Alerts Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lokasi Barang */}
        <Card className="card-elegant animate-fade-in-up stagger-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Penempatan Barang</CardTitle>
                <CardDescription>Status lokasi barang inventaris</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="transition-all" onClick={() => { setPage('rooms'); setRoomSubPage('allItems') }}>
                Lihat Detail <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Barang sudah ditempatkan</span>
                <span className="font-medium">{data.totalItems - data.itemsWithoutRoom} / {data.totalItems}</span>
              </div>
              <Progress value={placedPercent} className="h-2.5" />
              <p className="text-xs text-muted-foreground">{placedPercent}% barang sudah memiliki lokasi</p>
            </div>

            {roomData.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-3">Barang per Ruangan (Top 10)</p>
                <ChartContainer config={roomChartConfig} className="h-[180px] w-full">
                  <BarChart data={roomData} margin={{ top: 5, bottom: 0, left: 0, right: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="items" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {data.itemsWithoutRoom > 0 && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/50 text-amber-800 text-sm">
                <div className="rounded-full bg-amber-100 p-1">
                  <AlertTriangle className="size-3.5" />
                </div>
                <span><strong>{data.itemsWithoutRoom}</strong> barang belum ditempatkan di ruangan manapun</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barang Perlu Perhatian */}
        <Card className="card-elegant animate-fade-in-up stagger-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Perlu Perhatian
                </CardTitle>
                <CardDescription>Barang rusak yang memerlukan tindakan</CardDescription>
              </div>
              {data.itemsRusakRingan + data.itemsRusakBerat > 0 && (
                <Badge variant="destructive" className="text-[11px]">{data.itemsRusakRingan + data.itemsRusakBerat} barang rusak</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.damagedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Semua barang dalam kondisi baik</p>
                <p className="text-xs">Tidak ada barang yang perlu perhatian</p>
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {data.damagedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.room ? item.room.name : 'Tidak ada ruangan'}
                        {item.registrationNumber && ` · No: ${item.registrationNumber}`}
                      </p>
                    </div>
                    <Badge className={
                      item.condition === 'Rusak Ringan'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 ml-2 text-[11px]'
                        : 'bg-red-100 text-red-800 hover:bg-red-100 ml-2 text-[11px]'
                    }>
                      {item.condition === 'Rusak Ringan' ? (
                        <><AlertTriangle className="size-3 mr-1" />Rusak Ringan</>
                      ) : (
                        <><XCircle className="size-3 mr-1" />Rusak Berat</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Activity Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pesanan Terbaru */}
        <Card className="card-elegant animate-fade-in-up stagger-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-amber-500" />
                  Pesanan Terbaru
                </CardTitle>
                <CardDescription>5 pesanan terakhir</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="transition-all" onClick={() => { setPage('stores'); setStoreSubPage('orders') }}>
                Semua <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <FileText className="size-8 mx-auto mb-2 opacity-20" />
                Belum ada pesanan
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        {orderStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{order.store?.name || '-'}</span>
                        {order.employee && <span>· {order.employee.name}</span>}
                        <span className="flex items-center gap-0.5"><Clock className="size-3" />{formatDate(order.orderDate)}</span>
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold">{formatRupiah(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barang Masuk Terbaru */}
        <Card className="card-elegant animate-fade-in-up stagger-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <PackagePlus className="size-4 text-teal-500" />
                  Barang Masuk Terbaru
                </CardTitle>
                <CardDescription>5 barang masuk terakhir</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="transition-all" onClick={() => { setPage('stores'); setStoreSubPage('barangMasuk') }}>
                Semua <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentBarangMasuk.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <PackagePlus className="size-8 mx-auto mb-2 opacity-20" />
                Belum ada barang masuk
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentBarangMasuk.map((bm) => (
                  <div key={bm.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{bm.documentNumber}</p>
                        {bmStatusBadge(bm.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{bm.store?.name || bm.source || '-'}</span>
                        {bm.employee && <span>· {bm.employee.name}</span>}
                        <span className="flex items-center gap-0.5"><Clock className="size-3" />{formatDate(bm.entryDate)}</span>
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xs text-muted-foreground">{bm.items.length} item</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Quick Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Toko', value: data.totalStores, icon: Store, bg: 'bg-cyan-50', color: 'text-cyan-600', action: () => { setPage('stores'); setStoreSubPage('stores') } },
          { label: 'Pegawai', value: data.totalEmployees, icon: Users, bg: 'bg-rose-50', color: 'text-rose-600', action: () => setPage('employees') },
          { label: 'Barang Masuk', value: data.totalBarangMasuk, icon: PackagePlus, bg: 'bg-teal-50', color: 'text-teal-600', action: () => { setPage('stores'); setStoreSubPage('barangMasuk') } },
          { label: 'KIB Entry', value: data.totalItems, icon: Archive, bg: 'bg-violet-50', color: 'text-violet-600', action: () => setPage('kib') },
        ].map((item, idx) => (
          <Card
            key={item.label}
            className={`cursor-pointer card-elegant group animate-fade-in-up stagger-${idx + 1}`}
            onClick={item.action}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3.5">
                <div className={`rounded-xl p-2.5 shadow-sm transition-transform duration-200 group-hover:scale-105 ${item.bg}`}>
                  <item.icon className={`size-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrint}
        title="Cetak Laporan Dashboard"
      />
    </div>
  )
}
