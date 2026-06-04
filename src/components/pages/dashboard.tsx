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
  DoorOpen,
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
  Box,
  Clock,
  Loader2,
} from 'lucide-react'
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
  'KIB A': { label: 'KIB A', color: '#6366f1' },
  'KIB B': { label: 'KIB B', color: '#8b5cf6' },
  'KIB C': { label: 'KIB C', color: '#a855f7' },
  'KIB D': { label: 'KIB D', color: '#c084fc' },
  'KIB E': { label: 'KIB E', color: '#d8b4fe' },
  'KIB F': { label: 'KIB F', color: '#e9d5ff' },
}

const roomChartConfig: ChartConfig = {
  items: { label: 'Barang', color: '#3b82f6' },
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
    Draft: { className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    Dikirim: { className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    Diterima: { className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
    Selesai: { className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  }
  const v = variants[status] || { className: '' }
  return <Badge className={v.className}>{status}</Badge>
}

function bmStatusBadge(status: string) {
  const variants: Record<string, { className: string }> = {
    Draft: { className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    Diterima: { className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
    Ditolak: { className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }
  const v = variants[status] || { className: '' }
  return <Badge className={v.className}>{status}</Badge>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setPage, setStoreSubPage, setRoomSubPage } = useNavigationStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

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
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
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
    fill: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'][i],
  }))

  const roomData = data.roomsWithItems.map(r => ({
    name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
    items: r._count.items,
  }))

  const baikPercent = data.totalItems > 0 ? Math.round((data.itemsBaik / data.totalItems) * 100) : 0
  const placedPercent = data.totalItems > 0 ? Math.round(((data.totalItems - data.itemsWithoutRoom) / data.totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan data Sarana Prasarana Sekolah</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Barang</p>
                <p className="text-2xl font-bold">{data.totalItems.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <TrendingUp className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nilai Aset</p>
                <p className="text-2xl font-bold">{formatRupiah(data.totalAssetValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <Warehouse className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ruang & Lokasi</p>
                <p className="text-2xl font-bold">{data.totalRooms}</p>
                <p className="text-xs text-muted-foreground">{data.totalBilik} bilik · {data.totalLemari} lemari</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2.5">
                <FileText className="size-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pesanan</p>
                <p className="text-2xl font-bold">{data.totalOrders}</p>
                <p className="text-xs text-muted-foreground">{data.ordersDikirim} dikirim · {data.ordersDraft} draft</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Condition & KIB Charts Row ───────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kondisi Barang */}
        <Card>
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
              <div className="flex flex-col sm:flex-row items-center gap-4">
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
                <div className="flex-1 space-y-3 w-full">
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
        <Card>
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
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
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
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Penempatan Barang</CardTitle>
                <CardDescription>Status lokasi barang inventaris</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPage('rooms'); setRoomSubPage('allItems') }}>
                Lihat Detail <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Placement progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Barang sudah ditempatkan</span>
                <span className="font-medium">{data.totalItems - data.itemsWithoutRoom} / {data.totalItems}</span>
              </div>
              <Progress value={placedPercent} className="h-2.5" />
              <p className="text-xs text-muted-foreground">{placedPercent}% barang sudah memiliki lokasi</p>
            </div>

            {/* Items per room chart */}
            {roomData.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-3">Barang per Ruangan (Top 10)</p>
                <ChartContainer config={roomChartConfig} className="h-[180px] w-full">
                  <BarChart data={roomData} margin={{ top: 5, bottom: 0, left: 0, right: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="items" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {data.itemsWithoutRoom > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                <span><strong>{data.itemsWithoutRoom}</strong> barang belum ditempatkan di ruangan manapun</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barang Perlu Perhatian */}
        <Card>
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
                <Badge variant="destructive">{data.itemsRusakRingan + data.itemsRusakBerat} barang rusak</Badge>
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
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.room ? item.room.name : 'Tidak ada ruangan'}
                        {item.registrationNumber && ` · No: ${item.registrationNumber}`}
                      </p>
                    </div>
                    <Badge className={
                      item.condition === 'Rusak Ringan'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 ml-2'
                        : 'bg-red-100 text-red-800 hover:bg-red-100 ml-2'
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
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-orange-500" />
                  Pesanan Terbaru
                </CardTitle>
                <CardDescription>5 pesanan terakhir</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPage('stores'); setStoreSubPage('orders') }}>
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
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        {orderStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.store?.name || '-'}
                        {order.employee ? ` · ${order.employee.name}` : ''}
                        <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(order.orderDate)}</span>
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-medium">{formatRupiah(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barang Masuk Terbaru */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <PackagePlus className="size-4 text-teal-500" />
                  Barang Masuk Terbaru
                </CardTitle>
                <CardDescription>5 barang masuk terakhir</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setPage('stores'); setStoreSubPage('barangMasuk') }}>
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
              <div className="space-y-3">
                {data.recentBarangMasuk.map((bm) => (
                  <div key={bm.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{bm.documentNumber}</p>
                        {bmStatusBadge(bm.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bm.store?.name || bm.source || '-'}
                        {bm.employee ? ` · ${bm.employee.name}` : ''}
                        <span className="flex items-center gap-1"><Clock className="size-3" />{formatDate(bm.entryDate)}</span>
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

      {/* ─── Quick Stats & Info Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setPage('stores'); setStoreSubPage('stores') }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-50 p-2.5">
                <Store className="size-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toko</p>
                <p className="text-xl font-bold">{data.totalStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setPage('employees')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-50 p-2.5">
                <Users className="size-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pegawai</p>
                <p className="text-xl font-bold">{data.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setPage('stores'); setStoreSubPage('barangMasuk') }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2.5">
                <PackagePlus className="size-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Barang Masuk</p>
                <p className="text-xl font-bold">{data.totalBarangMasuk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setPage('kib')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-50 p-2.5">
                <Archive className="size-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KIB Entry</p>
                <p className="text-xl font-bold">{data.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
