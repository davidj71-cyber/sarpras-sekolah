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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MasterCombobox } from '@/components/ui/master-combobox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Package,
  Search,
  Plus,
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
  Camera,
  Pencil,
  Trash2,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { PhotoGallery } from '@/components/photo-gallery'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomData {
  id: string
  name: string
  building: string
  floor: string
}

interface InventoryItemData {
  id: string
  name: string
  registrationNumber: string
  brand: string
  condition: string
  quantity: number
  unit: string
  price: number
  sumberDana: string
  tahunPengadaan: number | null
  notes: string
  roomId: string | null
  bilikId: string | null
  cabinetId: string | null
  room?: { id: string; name: string; building: string; floor: string } | null
  bilik?: { id: string; name: string } | null
  cabinet?: { id: string; number: string } | null
  photos?: string[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoomItemsPage() {
  const { toast } = useToast()

  const [items, setItems] = useState<InventoryItemData[]>([])
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterCondition, setFilterCondition] = useState<string>('all')

  // Photo edit dialog
  const [photoItem, setPhotoItem] = useState<InventoryItemData | null>(null)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  // Item add/edit dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    registrationNumber: '',
    brand: '',
    condition: 'Baik' as string,
    quantity: 1 as number,
    unit: 'Unit',
    price: 0 as number,
    sumberDana: '',
    tahunPengadaan: null as number | null,
    notes: '',
    roomId: null as string | null,
  })
  const [itemSaving, setItemSaving] = useState(false)

  // Item delete confirmation
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletingItem, setDeletingItem] = useState(false)

  function handleItemPhotosChange(itemId: string, newPhotos: string[]) {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, photos: newPhotos } : item))
  }

  // ─── Item Add/Edit/Delete ──────────────────────────────────────────────

  function openAddItem() {
    setEditingItem(null)
    setItemForm({
      name: '',
      registrationNumber: '',
      brand: '',
      condition: 'Baik',
      quantity: 1,
      unit: 'Unit',
      price: 0,
      sumberDana: '',
      tahunPengadaan: null,
      notes: '',
      roomId: null,
    })
    setItemDialogOpen(true)
  }

  function openEditItem(item: InventoryItemData) {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      registrationNumber: item.registrationNumber || '',
      brand: item.brand || '',
      condition: item.condition,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      sumberDana: item.sumberDana || '',
      tahunPengadaan: item.tahunPengadaan ?? null,
      notes: item.notes || '',
      roomId: item.roomId,
    })
    setItemDialogOpen(true)
  }

  async function handleItemSubmit() {
    if (!itemForm.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama barang wajib diisi', variant: 'destructive' })
      return
    }
    setItemSaving(true)
    try {
      if (editingItem) {
        // Edit existing item
        const res = await fetch(`/api/inventory/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemForm),
        })
        if (!res.ok) throw new Error('Gagal')
        toast({ title: 'Berhasil', description: 'Barang berhasil diperbarui' })
      } else {
        // Add new item
        const res = await fetch('/api/inventory/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemForm),
        })
        if (!res.ok) throw new Error('Gagal')
        toast({ title: 'Berhasil', description: 'Barang berhasil ditambahkan' })
      }
      setItemDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Error', description: editingItem ? 'Gagal memperbarui barang' : 'Gagal menambahkan barang', variant: 'destructive' })
    } finally {
      setItemSaving(false)
    }
  }

  async function handleDeleteItem() {
    if (!deleteItemTarget) return
    setDeletingItem(true)
    try {
      const res = await fetch(`/api/inventory/items/${deleteItemTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Barang berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus barang', variant: 'destructive' })
    } finally {
      setDeletingItem(false)
      setDeleteItemTarget(null)
    }
  }

  // ─── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, roomsRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/inventory/rooms'),
      ])

      if (!itemsRes.ok || !roomsRes.ok) throw new Error('Gagal')

      const [itemsData, roomsData] = await Promise.all([
        itemsRes.json(),
        roomsRes.json(),
      ])

      // Only items that have a room assigned
      setItems(itemsData.filter((item: InventoryItemData) => item.roomId))
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
      item.cabinet?.number.toLowerCase().includes(searchQuery.toLowerCase())

    const matchRoom = filterRoom === 'all' || item.roomId === filterRoom
    const matchCondition = filterCondition === 'all' || item.condition === filterCondition

    return matchSearch && matchRoom && matchCondition
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

  function renderLocation(item: InventoryItemData) {
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
    if (item.cabinet) {
      parts.push(
        <span key="cabinet" className="flex items-center gap-1">
          <Box className="size-3 text-orange-500" />
          Lemari {item.cabinet.number}
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

  // ─── Format currency ─────────────────────────────────────────────────────

  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
  }

  // ─── Handle Print ──────────────────────────────────────────────────────

  const [printing, setPrinting] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  async function handlePrint(orientation: PrintOrientation = 'portrait') {
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
      const subtitle = filterParts.length > 0
        ? `<div class="subtitle">Filter: ${filterParts.join(', ')}</div>`
        : ''

      // Build table rows
      const rowsHtml = filteredItems.map((item, idx) => {
        const locationParts: string[] = []
        if (item.room) locationParts.push(item.room.name)
        if (item.bilik) locationParts.push(`Bilik ${item.bilik.name}`)
        if (item.cabinet) locationParts.push(`Lemari ${item.cabinet.number}`)
        const location = locationParts.length > 0 ? locationParts.join(' &gt; ') : '-'

        return `<tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.name}</td>
          <td class="text-center">${item.registrationNumber || '-'}</td>
          <td>${item.brand || '-'}</td>
          <td class="text-center">${item.condition}</td>
          <td class="text-right">${item.quantity} ${item.unit}</td>
          <td class="text-right">${item.price > 0 ? formatRupiahPrint(item.price) : '-'}</td>
          <td>${item.sumberDana || '-'}</td>
          <td class="text-center">${item.tahunPengadaan || '-'}</td>
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
              <th>Merk</th>
              <th>Kondisi</th>
              <th>Jumlah</th>
              <th>Harga</th>
              <th>Sumber Dana</th>
              <th>Tahun Pengadaan</th>
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

      await printWithKop('DAFTAR BARANG INVENTARIS', contentHtml, orientation)
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
          <h2 className="text-2xl font-bold tracking-tight">Barang Inventaris</h2>
          <p className="text-muted-foreground">Daftar semua barang inventaris beserta lokasi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddItem} size="sm">
            <Plus className="size-4 mr-2" />
            Tambah Barang
          </Button>
          <Button onClick={() => setPrintDialogOpen(true)} disabled={printing || filteredItems.length === 0} variant="outline" size="sm">
            {printing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
            Cetak
          </Button>
        </div>
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
                <p className="text-sm text-muted-foreground">Barang Inventaris</p>
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
              ? 'Belum ada barang inventaris. Klik tombol "Tambah Barang" untuk menambahkan barang baru.'
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
                    <TableHead>Merk</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead>Sumber Dana</TableHead>
                    <TableHead>Tahun Pengadaan</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="w-[130px]">Aksi</TableHead>
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
                      <TableCell>{item.brand || '-'}</TableCell>
                      <TableCell>{conditionBadge(item.condition)}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{item.price > 0 ? formatRupiah(item.price) : '-'}</TableCell>
                      <TableCell>{item.sumberDana || '-'}</TableCell>
                      <TableCell>{item.tahunPengadaan || '-'}</TableCell>
                      <TableCell>{renderLocation(item)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{item.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`size-8 ${item.photos && item.photos.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                            onClick={() => { setPhotoItem(item); setPhotoDialogOpen(true) }}
                            title={item.photos && item.photos.length > 0 ? `Kelola foto (${item.photos.length})` : 'Tambah foto'}
                          >
                            <Camera className="size-4" />
                            {item.photos && item.photos.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full size-3.5 flex items-center justify-center font-bold">{item.photos.length}</span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditItem(item)}
                            title="Edit barang"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItemTarget({ id: item.id, name: item.name })}
                            title="Hapus barang"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto Barang - {photoItem?.name}</DialogTitle>
            <DialogDescription>
              Kelola foto barang. Klik kamera atau upload untuk menambahkan foto.
            </DialogDescription>
          </DialogHeader>
          {photoItem && (
            <PhotoGallery
              photos={photoItem.photos || []}
              itemId={photoItem.id}
              itemApiPath="/api/inventory/items"
              onPhotosChange={(newPhotos) => {
                handleItemPhotosChange(photoItem.id, newPhotos)
                setPhotoItem(prev => prev ? { ...prev, photos: newPhotos } : null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Item Add/Edit Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Barang' : 'Tambah Barang'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Perbarui data barang inventaris.' : 'Tambahkan barang inventaris baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item-name">Nama Barang *</Label>
              <Input id="item-name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Masukkan nama barang" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-reg">No. Register</Label>
              <Input id="item-reg" value={itemForm.registrationNumber} onChange={(e) => setItemForm({ ...itemForm, registrationNumber: e.target.value })} placeholder="Nomor register" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-brand">Merk</Label>
              <MasterCombobox
                category="merk"
                value={itemForm.brand}
                onChange={(val) => setItemForm({ ...itemForm, brand: val })}
                placeholder="Merk barang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-condition">Kondisi</Label>
              <Select value={itemForm.condition} onValueChange={(val) => setItemForm({ ...itemForm, condition: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-qty">Jumlah</Label>
              <Input id="item-qty" type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit">Satuan</Label>
              <MasterCombobox
                category="satuan"
                value={itemForm.unit}
                onChange={(val) => setItemForm({ ...itemForm, unit: val })}
                placeholder="Satuan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Harga (Rp)</Label>
              <Input id="item-price" type="number" min={0} value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) || 0 })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-sumber-dana">Sumber Dana</Label>
              <MasterCombobox
                category="sumberDana"
                value={itemForm.sumberDana}
                onChange={(val) => setItemForm({ ...itemForm, sumberDana: val })}
                placeholder="Pilih sumber dana"
                allowClear
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-tahun-pengadaan">Tahun Pengadaan</Label>
              <Input id="item-tahun-pengadaan" type="number" min={1900} max={2100} value={itemForm.tahunPengadaan ?? ''} onChange={(e) => setItemForm({ ...itemForm, tahunPengadaan: e.target.value ? Number(e.target.value) : null })} placeholder="Contoh: 2024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-room">Lokasi / Ruang</Label>
              <Select value={itemForm.roomId || '_none_'} onValueChange={(val) => setItemForm({ ...itemForm, roomId: val === '_none_' ? null : val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih ruang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Tidak Ditentukan —</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}{room.building ? ` (${room.building})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item-notes">Keterangan</Label>
              <Textarea id="item-notes" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} placeholder="Keterangan tambahan" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)} disabled={itemSaving}>Batal</Button>
            <Button onClick={handleItemSubmit} disabled={itemSaving}>
              {itemSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Delete Confirmation */}
      <AlertDialog open={!!deleteItemTarget} onOpenChange={(open) => { if (!open) setDeleteItemTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Barang</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <span className="font-semibold">{deleteItemTarget?.name}</span>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItem}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={deletingItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingItem && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrint}
        title="Cetak Daftar Barang Inventaris"
        loading={printing}
      />
    </div>
  )
}
