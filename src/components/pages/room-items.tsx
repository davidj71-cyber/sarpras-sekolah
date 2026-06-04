'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DoorOpen,
  Archive,
  Box,
  Filter,
  MapPin,
  Printer,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint } from '@/lib/print-utils'
import { PhotoThumbnail } from '@/components/photo-thumbnail'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomData {
  id: string
  name: string
  building: string
  floor: string
}

interface ItemData {
  id: string
  name: string
  kibType: string
  registrationNumber: string
  brand: string
  condition: string
  quantity: number
  unit: string
  price: number
  notes: string
  roomId: string | null
  bilikId: string | null
  lemariId: string | null
  room?: { id: string; name: string; building: string; floor: string } | null
  bilik?: { id: string; name: string } | null
  lemari?: { id: string; number: string } | null
  photos?: string[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoomItemsPage() {
  const { toast } = useToast()

  const [items, setItems] = useState<ItemData[]>([])
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterCondition, setFilterCondition] = useState<string>('all')
  const [filterKibType, setFilterKibType] = useState<string>('all')

  // ─── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, roomsRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/rooms'),
      ])

      if (!itemsRes.ok || !roomsRes.ok) throw new Error('Gagal')

      const [itemsData, roomsData] = await Promise.all([
        itemsRes.json(),
        roomsRes.json(),
      ])

      // Only items that have a room assigned
      setItems(itemsData.filter((item: ItemData) => item.roomId))
      setRooms(roomsData)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Filter items ────────────────────────────────────────────────────────

  const filteredItems = items.filter(item => {
    const matchSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.room?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bilik?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lemari?.number.toLowerCase().includes(searchQuery.toLowerCase())

    const matchRoom = filterRoom === 'all' || item.roomId === filterRoom
    const matchCondition = filterCondition === 'all' || item.condition === filterCondition
    const matchKibType = filterKibType === 'all' || item.kibType === filterKibType

    return matchSearch && matchRoom && matchCondition && matchKibType
  })

  // ─── Stats ───────────────────────────────────────────────────────────────

  const baikCount = filteredItems.filter(i => i.condition === 'Baik').length
  const rusakRinganCount = filteredItems.filter(i => i.condition === 'Rusak Ringan').length
  const rusakBeratCount = filteredItems.filter(i => i.condition === 'Rusak Berat').length
  const totalValue = filteredItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)

  // ─── Condition badge ──────────────────────────────────────────────────────

  function conditionBadge(condition: string) {
    switch (condition) {
      case 'Baik':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="size-3 mr-1" />Baik</Badge>
      case 'Rusak Ringan':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><AlertTriangle className="size-3 mr-1" />Rusak Ringan</Badge>
      case 'Rusak Berat':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="size-3 mr-1" />Rusak Berat</Badge>
      default:
        return <Badge variant="secondary">{condition}</Badge>
    }
  }

  // ─── Location display ─────────────────────────────────────────────────────

  function renderLocation(item: ItemData) {
    const parts: React.ReactNode[] = []
    if (item.room) {
      parts.push(
        <span key="room" className="flex items-center gap-1">
          <DoorOpen className="size-3 text-blue-500" />
          {item.room.name}
        </span>
      )
    }
    if (item.bilik) {
      parts.push(
        <span key="bilik" className="flex items-center gap-1">
          <Archive className="size-3 text-purple-500" />
          Bilik {item.bilik.name}
        </span>
      )
    }
    if (item.lemari) {
      parts.push(
        <span key="lemari" className="flex items-center gap-1">
          <Box className="size-3 text-orange-500" />
          Lemari {item.lemari.number}
        </span>
      )
    }

    if (parts.length === 0) return <span className="text-muted-foreground">-</span>

    return (
      <div className="flex flex-col gap-0.5 text-xs">
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && null}
            {part}
          </React.Fragment>
        ))}
      </div>
    )
  }

  // ─── KIB Type label ──────────────────────────────────────────────────────

  const kibLabels: Record<string, string> = {
    A: 'KIB A',
    B: 'KIB B',
    C: 'KIB C',
    D: 'KIB D',
    E: 'KIB E',
    F: 'KIB F',
  }

  // ─── Format currency ─────────────────────────────────────────────────────

  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
  }

  // ─── Handle Print ──────────────────────────────────────────────────────

  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    if (filteredItems.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }
    setPrinting(true)
    try {
      // Build filter subtitle
      const filterParts: string[] = []
      if (filterRoom !== 'all') {
        const room = rooms.find(r => r.id === filterRoom)
        if (room) filterParts.push(`Ruang - ${room.name}`)
      }
      if (filterCondition !== 'all') {
        filterParts.push(`Kondisi - ${filterCondition}`)
      }
      if (filterKibType !== 'all') {
        filterParts.push(`KIB - ${kibLabels[filterKibType] || filterKibType}`)
      }
      const subtitle = filterParts.length > 0
        ? `<div class="subtitle">Filter: ${filterParts.join(', ')}</div>`
        : ''

      // Build table rows
      const rowsHtml = filteredItems.map((item, idx) => {
        const locationParts: string[] = []
        if (item.room) locationParts.push(item.room.name)
        if (item.bilik) locationParts.push(`Bilik ${item.bilik.name}`)
        if (item.lemari) locationParts.push(`Lemari ${item.lemari.number}`)
        const location = locationParts.length > 0 ? locationParts.join(' &gt; ') : '-'

        return `<tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.name}</td>
          <td class="text-center">${item.registrationNumber || '-'}</td>
          <td class="text-center">${kibLabels[item.kibType] || item.kibType}</td>
          <td>${item.brand || '-'}</td>
          <td class="text-center">${item.condition}</td>
          <td class="text-right">${item.quantity} ${item.unit}</td>
          <td class="text-right">${item.price > 0 ? formatRupiahPrint(item.price) : '-'}</td>
          <td>${location}</td>
          <td>${item.notes || '-'}</td>
        </tr>`
      }).join('\n')

      // Build content HTML
      const contentHtml = `
        ${subtitle}
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Barang</th>
              <th>No. Register</th>
              <th>KIB</th>
              <th>Merk</th>
              <th>Kondisi</th>
              <th>Jumlah</th>
              <th>Harga</th>
              <th>Lokasi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <br/>
        <table style="width: auto; border: none; margin-top: 8px;">
          <tr>
            <td style="border: none; padding: 3px 16px 3px 0; font-weight: bold;">Jumlah Barang</td>
            <td style="border: none; padding: 3px 8px;">: ${filteredItems.length} item</td>
            <td style="border: none; padding: 3px 16px 3px 32px; font-weight: bold;">Baik</td>
            <td style="border: none; padding: 3px 8px;">: ${baikCount}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 3px 16px 3px 0; font-weight: bold;">Total Nilai</td>
            <td style="border: none; padding: 3px 8px;">: ${formatRupiahPrint(totalValue)}</td>
            <td style="border: none; padding: 3px 16px 3px 32px; font-weight: bold;">Rusak Ringan</td>
            <td style="border: none; padding: 3px 8px;">: ${rusakRinganCount}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 3px 16px 3px 0;"></td>
            <td style="border: none; padding: 3px 8px;"></td>
            <td style="border: none; padding: 3px 16px 3px 32px; font-weight: bold;">Rusak Berat</td>
            <td style="border: none; padding: 3px 8px;">: ${rusakBeratCount}</td>
          </tr>
        </table>
      `

      await printWithKop('DAFTAR BARANG DI RUANGAN', contentHtml)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak data', variant: 'destructive' })
    } finally {
      setPrinting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Barang di Ruang</h2>
          <p className="text-muted-foreground">Daftar semua barang beserta lokasi ruangan</p>
        </div>
        <Button onClick={handlePrint} disabled={printing || filteredItems.length === 0} variant="outline" size="sm">
          {printing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
          Cetak
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Package className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Barang</p>
                <p className="text-2xl font-bold">{filteredItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baik</p>
                <p className="text-2xl font-bold text-emerald-600">{baikCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5">
                <AlertTriangle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rusak Ringan</p>
                <p className="text-2xl font-bold text-amber-600">{rusakRinganCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2.5">
                <XCircle className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rusak Berat</p>
                <p className="text-2xl font-bold text-red-600">{rusakBeratCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama barang, no register, merk, lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="size-4 mr-1" />
                  <SelectValue placeholder="Semua Ruang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Ruang</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}{room.building ? ` (${room.building})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="size-4 mr-1" />
                  <SelectValue placeholder="Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kondisi</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterKibType} onValueChange={setFilterKibType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="KIB" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua KIB</SelectItem>
                  {Object.entries(kibLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total value summary */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>Menampilkan {filteredItems.length} dari {items.length} barang</span>
          <span>Total Nilai: <span className="font-semibold text-foreground">{formatRupiah(totalValue)}</span></span>
        </div>
      )}

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Tidak ada barang ditemukan</p>
          <p className="text-sm">
            {items.length === 0
              ? 'Belum ada barang yang ditempatkan di ruangan. Tambahkan barang melalui menu KIB dan tentukan lokasinya.'
              : 'Coba ubah filter pencarian Anda'}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead className="w-[70px]">Foto</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>No. Register</TableHead>
                    <TableHead>KIB</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <PhotoThumbnail photos={item.photos || []} />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.registrationNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{kibLabels[item.kibType] || item.kibType}</Badge>
                      </TableCell>
                      <TableCell>{item.brand || '-'}</TableCell>
                      <TableCell>{conditionBadge(item.condition)}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{item.price > 0 ? formatRupiah(item.price) : '-'}</TableCell>
                      <TableCell>{renderLocation(item)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{item.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
