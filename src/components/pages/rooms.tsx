'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigationStore } from '@/lib/navigation-store'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  DoorOpen,
  ChevronRight,
  Archive,
  Box,
  Package,
  Search,
  Building2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Camera,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint } from '@/lib/print-utils'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { PhotoGallery } from '@/components/photo-gallery'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BilikData {
  id: string
  name: string
  number: string
  description: string
  roomId: string
  items?: ItemData[]
}

interface LemariData {
  id: string
  number: string
  description: string
  roomId: string
  items?: ItemData[]
}

interface RoomData {
  id: string
  name: string
  building: string
  floor: string
  description: string
  biliks: BilikData[]
  lemari: LemariData[]
  items?: ItemData[]
  createdAt: string
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
  room?: { id: string; name: string }
  bilik?: { id: string; name: string }
  lemari?: { id: string; number: string }
  photos?: string[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoomsPage() {
  const { toast } = useToast()
  const {
    selectedRoomId,
    selectedBilikId,
    selectedLemariId,
    setSelectedRoomId,
    setSelectedBilikId,
    setSelectedLemariId,
  } = useNavigationStore()

  const [rooms, setRooms] = useState<RoomData[]>([])
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null)
  const [items, setItems] = useState<ItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Room dialog
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomData | null>(null)
  const [roomForm, setRoomForm] = useState({ name: '', building: '', floor: '', description: '' })
  const [saving, setSaving] = useState(false)

  // Bilik dialog
  const [bilikDialogOpen, setBilikDialogOpen] = useState(false)
  const [editingBilik, setEditingBilik] = useState<BilikData | null>(null)
  const [bilikForm, setBilikForm] = useState({ name: '', number: '', description: '' })

  // Lemari dialog
  const [lemariDialogOpen, setLemariDialogOpen] = useState(false)
  const [editingLemari, setEditingLemari] = useState<LemariData | null>(null)
  const [lemariForm, setLemariForm] = useState({ number: '', description: '' })

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'room' | 'bilik' | 'lemari' } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Photo edit dialog
  const [photoItem, setPhotoItem] = useState<ItemData | null>(null)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  function handleItemPhotosChange(itemId: string, newPhotos: string[]) {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, photos: newPhotos } : item))
  }

  // ─── Fetch rooms ─────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setRooms(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data ruangan', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // ─── Fetch current room detail ───────────────────────────────────────────

  useEffect(() => {
    if (selectedRoomId) {
      fetch(`/api/rooms/${selectedRoomId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setCurrentRoom(data) })
        .catch(() => {})
    } else {
      setCurrentRoom(null)
    }
  }, [selectedRoomId])

  // ─── Fetch items when bilik or lemari selected ────────────────────────────

  useEffect(() => {
    if (selectedLemariId) {
      setItemsLoading(true)
      fetch(`/api/items?lemariId=${selectedLemariId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setItems(data); setItemsLoading(false) })
        .catch(() => { setItems([]); setItemsLoading(false) })
    } else if (selectedBilikId) {
      setItemsLoading(true)
      fetch(`/api/items?bilikId=${selectedBilikId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setItems(data); setItemsLoading(false) })
        .catch(() => { setItems([]); setItemsLoading(false) })
    } else if (selectedRoomId) {
      setItemsLoading(true)
      fetch(`/api/items?roomId=${selectedRoomId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setItems(data); setItemsLoading(false) })
        .catch(() => { setItems([]); setItemsLoading(false) })
    } else {
      setItems([])
    }
  }, [selectedRoomId, selectedBilikId, selectedLemariId])

  // ─── Computed values ───────────────────────────────────────────────────────

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.floor.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalItems = rooms.reduce((acc, r) => acc + (r.items?.length || 0), 0)
  const totalBilik = rooms.reduce((acc, r) => acc + (r.biliks?.length || 0), 0)
  const totalLemari = rooms.reduce((acc, r) => acc + (r.lemari?.length || 0), 0)

  // ─── Print Room List ──────────────────────────────────────────────────────

  async function handlePrintRoomList() {
    const tableRows = rooms.map((room, idx) => {
      const bilikCount = room.biliks?.length || 0
      const lemariCount = room.lemari?.length || 0
      const itemCount = room.items?.length || 0
      return `<tr>
        <td class="text-center">${idx + 1}</td>
        <td>${room.name}</td>
        <td>${room.building || '-'}</td>
        <td class="text-center">${room.floor || '-'}</td>
        <td class="text-center">${bilikCount}</td>
        <td class="text-center">${lemariCount}</td>
        <td class="text-center">${itemCount}</td>
      </tr>`
    }).join('')

    const totalBilikPrint = rooms.reduce((acc, r) => acc + (r.biliks?.length || 0), 0)
    const totalLemariPrint = rooms.reduce((acc, r) => acc + (r.lemari?.length || 0), 0)
    const totalItemsPrint = rooms.reduce((acc, r) => acc + (r.items?.length || 0), 0)

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Ruang</th>
            <th>Gedung</th>
            <th>Lantai</th>
            <th>Jumlah Bilik</th>
            <th>Jumlah Lemari</th>
            <th>Jumlah Barang</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr>
            <td colspan="4" class="font-bold text-right">Total</td>
            <td class="text-center font-bold">${totalBilikPrint}</td>
            <td class="text-center font-bold">${totalLemariPrint}</td>
            <td class="text-center font-bold">${totalItemsPrint}</td>
          </tr>
        </tbody>
      </table>
    `

    await printWithKop('DAFTAR RUANGAN', contentHtml)
  }

  // ─── Print Room Detail ──────────────────────────────────────────────────

  async function handlePrintRoomDetail() {
    if (!selectedRoomId || !currentRoom) return

    try {
      // Fetch all items for the room (including items in biliks and lemari)
      const res = await fetch(`/api/items?roomId=${selectedRoomId}`)
      if (!res.ok) throw new Error('Gagal')
      const allItems: ItemData[] = await res.json()

      // Also fetch items from biliks and lemari in this room
      const bilikItemPromises = currentRoom.biliks.map(async (bilik) => {
        try {
          const bRes = await fetch(`/api/items?bilikId=${bilik.id}`)
          if (!bRes.ok) return []
          return await bRes.json()
        } catch { return [] }
      })

      const lemariItemPromises = currentRoom.lemari.map(async (lem) => {
        try {
          const lRes = await fetch(`/api/items?lemariId=${lem.id}`)
          if (!lRes.ok) return []
          return await lRes.json()
        } catch { return [] }
      })

      const [bilikItems, lemariItems] = await Promise.all([
        Promise.all(bilikItemPromises),
        Promise.all(lemariItemPromises),
      ])

      // Combine all items and deduplicate
      const allBilikItems = bilikItems.flat()
      const allLemariItems = lemariItems.flat()
      const combinedItems = [...allItems, ...allBilikItems, ...allLemariItems]
      const uniqueItems = Array.from(
        combinedItems.reduce((map, item) => { map.set(item.id, item); return map }, new Map<string, ItemData>())
        .values()
      )

      const baikCount = uniqueItems.filter(i => i.condition === 'Baik').length
      const rusakRinganCount = uniqueItems.filter(i => i.condition === 'Rusak Ringan').length
      const rusakBeratCount = uniqueItems.filter(i => i.condition === 'Rusak Berat').length

      // Determine location for each item
      function getItemLocation(item: ItemData): string {
        const parts: string[] = []
        parts.push(currentRoom.name)
        if (item.bilikId) {
          const bilik = currentRoom.biliks.find(b => b.id === item.bilikId)
          if (bilik) parts.push(`Bilik ${bilik.name}`)
        }
        if (item.lemariId) {
          const lem = currentRoom.lemari.find(l => l.id === item.lemariId)
          if (lem) parts.push(`Lemari ${lem.number}`)
        }
        return parts.join(' / ')
      }

      const tableRows = uniqueItems.map((item, idx) => {
        return `<tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.name}</td>
          <td>${item.registrationNumber || '-'}</td>
          <td>${item.brand || '-'}</td>
          <td class="text-center">${item.condition}</td>
          <td class="text-center">${item.quantity} ${item.unit}</td>
          <td>${getItemLocation(item)}</td>
          <td>${item.notes || '-'}</td>
        </tr>`
      }).join('')

      const contentHtml = `
        <table class="meta-table">
          <tr><td class="font-bold" style="width:120px">Nama Ruang</td><td>: ${currentRoom.name}</td></tr>
          <tr><td class="font-bold">Gedung</td><td>: ${currentRoom.building || '-'}</td></tr>
          <tr><td class="font-bold">Lantai</td><td>: ${currentRoom.floor || '-'}</td></tr>
          ${currentRoom.description ? `<tr><td class="font-bold">Deskripsi</td><td>: ${currentRoom.description}</td></tr>` : ''}
        </table>

        <table class="meta-table" style="margin-bottom:16px;">
          <tr>
            <td style="border:1px solid #333;padding:4px 12px;text-align:center;"><strong>Baik</strong><br/>${baikCount}</td>
            <td style="border:1px solid #333;padding:4px 12px;text-align:center;"><strong>Rusak Ringan</strong><br/>${rusakRinganCount}</td>
            <td style="border:1px solid #333;padding:4px 12px;text-align:center;"><strong>Rusak Berat</strong><br/>${rusakBeratCount}</td>
            <td style="border:1px solid #333;padding:4px 12px;text-align:center;"><strong>Total</strong><br/>${uniqueItems.length}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Barang</th>
              <th>No. Register</th>
              <th>Merk</th>
              <th>Kondisi</th>
              <th>Jumlah</th>
              <th>Lokasi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="text-center">Tidak ada barang</td></tr>'}
          </tbody>
        </table>

        <div class="signature-block">
          <div style="display:flex;justify-content:space-between;">
            <div style="text-align:center;">
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <br/><br/><br/><br/>
              <p style="text-decoration:underline;font-weight:bold;">________________________</p>
              <p>NIP. ________________________</p>
            </div>
            <div style="text-align:center;">
              <p>........................, 20.....</p>
              <p>Pengelola Barang</p>
              <br/><br/><br/><br/>
              <p style="text-decoration:underline;font-weight:bold;">________________________</p>
              <p>NIP. ________________________</p>
            </div>
          </div>
        </div>
      `

      await printWithKop(`INVENTARIS RUANG ${currentRoom.name.toUpperCase()}`, contentHtml)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak data ruangan', variant: 'destructive' })
    }
  }

  // ─── Room CRUD ──────────────────────────────────────────────────────────

  function openAddRoom() {
    setEditingRoom(null)
    setRoomForm({ name: '', building: '', floor: '', description: '' })
    setRoomDialogOpen(true)
  }

  function openEditRoom(room: RoomData) {
    setEditingRoom(room)
    setRoomForm({ name: room.name, building: room.building, floor: room.floor, description: room.description })
    setRoomDialogOpen(true)
  }

  async function handleRoomSubmit() {
    if (!roomForm.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama ruang wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms'
      const method = editingRoom ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm) })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingRoom ? 'Ruang berhasil diperbarui' : 'Ruang berhasil ditambahkan' })
      setRoomDialogOpen(false)
      fetchRooms()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data ruang', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Bilik CRUD ──────────────────────────────────────────────────────────

  function openAddBilik() {
    setEditingBilik(null)
    setBilikForm({ name: '', number: '', description: '' })
    setBilikDialogOpen(true)
  }

  function openEditBilik(bilik: BilikData) {
    setEditingBilik(bilik)
    setBilikForm({ name: bilik.name, number: bilik.number, description: bilik.description })
    setBilikDialogOpen(true)
  }

  async function handleBilikSubmit() {
    if (!bilikForm.name.trim() || !selectedRoomId) return
    setSaving(true)
    try {
      const url = editingBilik ? `/api/biliks/${editingBilik.id}` : '/api/biliks'
      const method = editingBilik ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bilikForm, roomId: selectedRoomId }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingBilik ? 'Bilik berhasil diperbarui' : 'Bilik berhasil ditambahkan' })
      setBilikDialogOpen(false)
      fetchRooms()
      const roomRes = await fetch(`/api/rooms/${selectedRoomId}`)
      if (roomRes.ok) setCurrentRoom(await roomRes.json())
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan bilik', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Lemari CRUD ──────────────────────────────────────────────────────────

  function openAddLemari() {
    setEditingLemari(null)
    setLemariForm({ number: '', description: '' })
    setLemariDialogOpen(true)
  }

  function openEditLemari(lem: LemariData) {
    setEditingLemari(lem)
    setLemariForm({ number: lem.number, description: lem.description })
    setLemariDialogOpen(true)
  }

  async function handleLemariSubmit() {
    if (!lemariForm.number.trim() || !selectedRoomId) return
    setSaving(true)
    try {
      const url = editingLemari ? `/api/lemari/${editingLemari.id}` : '/api/lemari'
      const method = editingLemari ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lemariForm, roomId: selectedRoomId }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingLemari ? 'Lemari berhasil diperbarui' : 'Lemari berhasil ditambahkan' })
      setLemariDialogOpen(false)
      fetchRooms()
      const roomRes = await fetch(`/api/rooms/${selectedRoomId}`)
      if (roomRes.ok) setCurrentRoom(await roomRes.json())
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan lemari', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete handler ──────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const endpoints: Record<string, string> = {
        room: `/api/rooms/${deleteTarget.id}`,
        bilik: `/api/biliks/${deleteTarget.id}`,
        lemari: `/api/lemari/${deleteTarget.id}`,
      }
      const res = await fetch(endpoints[deleteTarget.type], { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Data berhasil dihapus' })
      if (deleteTarget.type === 'room') {
        setSelectedRoomId(null)
        setSelectedBilikId(null)
        setSelectedLemariId(null)
        fetchRooms()
      } else {
        fetchRooms()
        if (selectedRoomId) {
          const roomRes = await fetch(`/api/rooms/${selectedRoomId}`)
          if (roomRes.ok) setCurrentRoom(await roomRes.json())
        }
        if (deleteTarget.type === 'bilik') setSelectedBilikId(null)
        if (deleteTarget.type === 'lemari') setSelectedLemariId(null)
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ─── Condition badge helper ──────────────────────────────────────────────

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

  // ─── Breadcrumb ──────────────────────────────────────────────────────────

  function renderBreadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <button
          onClick={() => { setSelectedRoomId(null); setSelectedBilikId(null); setSelectedLemariId(null) }}
          className="hover:text-foreground transition-colors font-medium"
        >
          Ruang
        </button>
        {selectedRoomId && currentRoom && (
          <>
            <ChevronRight className="size-3.5" />
            <button
              onClick={() => { setSelectedBilikId(null); setSelectedLemariId(null) }}
              className={`hover:text-foreground transition-colors ${!selectedBilikId && !selectedLemariId ? 'text-foreground font-medium' : ''}`}
            >
              {currentRoom.name}
            </button>
          </>
        )}
        {selectedBilikId && currentRoom && (
          <>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground font-medium">
              Bilik {currentRoom.biliks.find(b => b.id === selectedBilikId)?.name || ''}
            </span>
          </>
        )}
        {selectedLemariId && currentRoom && (
          <>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground font-medium">
              Lemari {currentRoom.lemari.find(l => l.id === selectedLemariId)?.number || ''}
            </span>
          </>
        )}
      </div>
    )
  }

  // ─── Stats Cards ─────────────────────────────────────────────────────────

  function renderStatsCards() {
    const stats = [
      { label: 'Total Ruang', value: rooms.length, icon: DoorOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Total Bilik', value: totalBilik, icon: Archive, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Total Lemari', value: totalLemari, icon: Box, color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Total Barang', value: totalItems, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ]

    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ─── Render: Room List ───────────────────────────────────────────────────

  function renderRoomList() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (rooms.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <DoorOpen className="size-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Belum ada data ruangan</p>
          <p className="text-sm mb-6">Klik tombol di atas untuk menambahkan ruangan baru</p>
          <Button onClick={openAddRoom}>
            <Plus className="size-4 mr-2" />
            Tambah Ruang
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari ruang, gedung, atau lantai..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        {renderStatsCards()}

        {/* Room grid */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Tidak ditemukan</p>
            <p className="text-sm">Tidak ada ruangan yang cocok dengan pencarian</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const itemCount = room.items?.length || 0
              const baikCount = room.items?.filter(i => i.condition === 'Baik').length || 0
              const rusakRinganCount = room.items?.filter(i => i.condition === 'Rusak Ringan').length || 0
              const rusakBeratCount = room.items?.filter(i => i.condition === 'Rusak Berat').length || 0

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <DoorOpen className="size-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">{room.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                            {room.building && (
                              <span className="flex items-center gap-1">
                                <Building2 className="size-3" />{room.building}
                              </span>
                            )}
                            {room.floor && (
                              <span className="flex items-center gap-1">
                                <Layers className="size-3" />Lantai {room.floor}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditRoom(room)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: room.id, name: room.name, type: 'room' })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {room.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        <Archive className="size-3 mr-1" />{room.biliks?.length || 0} Bilik
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Box className="size-3 mr-1" />{room.lemari?.length || 0} Lemari
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Package className="size-3 mr-1" />{itemCount} Barang
                      </Badge>
                    </div>
                    {itemCount > 0 && (
                      <div className="flex gap-2 text-xs">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="size-3" />{baikCount}
                        </span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="size-3" />{rusakRinganCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="size-3" />{rusakBeratCount}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Room Detail ─────────────────────────────────────────────────

  function renderRoomDetail() {
    if (!currentRoom) return null

    const itemCount = currentRoom.items?.length || 0
    const baikCount = currentRoom.items?.filter(i => i.condition === 'Baik').length || 0
    const rusakRinganCount = currentRoom.items?.filter(i => i.condition === 'Rusak Ringan').length || 0
    const rusakBeratCount = currentRoom.items?.filter(i => i.condition === 'Rusak Berat').length || 0

    return (
      <div className="space-y-6">
        {/* Room Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <DoorOpen className="size-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{currentRoom.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {currentRoom.building && (
                      <span className="flex items-center gap-1"><Building2 className="size-3.5" />{currentRoom.building}</span>
                    )}
                    {currentRoom.floor && (
                      <span className="flex items-center gap-1"><Layers className="size-3.5" />Lantai {currentRoom.floor}</span>
                    )}
                  </div>
                  {currentRoom.description && (
                    <p className="text-sm text-muted-foreground mt-1">{currentRoom.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintRoomDetail}>
                  <Printer className="size-3.5 mr-1" /> Cetak
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditRoom(currentRoom)}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: currentRoom.id, name: currentRoom.name, type: 'room' })}>
                  <Trash2 className="size-3.5 mr-1" /> Hapus
                </Button>
              </div>
            </div>

            {/* Room Stats */}
            {itemCount > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{itemCount}</p>
                  <p className="text-xs text-muted-foreground">Total Barang</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-50">
                  <p className="text-lg font-bold text-emerald-600">{baikCount}</p>
                  <p className="text-xs text-muted-foreground">Baik</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50">
                  <p className="text-lg font-bold text-amber-600">{rusakRinganCount}</p>
                  <p className="text-xs text-muted-foreground">Rusak Ringan</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50">
                  <p className="text-lg font-bold text-red-600">{rusakBeratCount}</p>
                  <p className="text-xs text-muted-foreground">Rusak Berat</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bilik Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="size-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base">Bilik</CardTitle>
                  <CardDescription>Daftar bilik di ruang {currentRoom.name}</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={openAddBilik}>
                <Plus className="size-4 mr-1" /> Tambah Bilik
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {currentRoom.biliks?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Belum ada bilik</p>
                <p className="text-sm">Tambahkan bilik untuk mengorganisir barang</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.biliks.map((bilik) => (
                  <div
                    key={bilik.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedBilikId === bilik.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50 hover:shadow-sm'}`}
                    onClick={() => { setSelectedBilikId(bilik.id); setSelectedLemariId(null) }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-purple-50 p-1.5 mt-0.5">
                          <Archive className="size-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{bilik.name}</p>
                          <p className="text-sm text-muted-foreground">No: {bilik.number || '-'}</p>
                          {bilik.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bilik.description}</p>}
                          <Badge variant="outline" className="mt-2 text-xs">{bilik.items?.length || 0} Barang</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditBilik(bilik)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteTarget({ id: bilik.id, name: bilik.name, type: 'bilik' })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lemari Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="size-5 text-orange-600" />
                <div>
                  <CardTitle className="text-base">Lemari</CardTitle>
                  <CardDescription>Daftar lemari di ruang {currentRoom.name}</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={openAddLemari}>
                <Plus className="size-4 mr-1" /> Tambah Lemari
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {currentRoom.lemari?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Belum ada lemari</p>
                <p className="text-sm">Tambahkan lemari untuk menyimpan barang</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.lemari.map((lem) => (
                  <div
                    key={lem.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLemariId === lem.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50 hover:shadow-sm'}`}
                    onClick={() => { setSelectedLemariId(lem.id); setSelectedBilikId(null) }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-orange-50 p-1.5 mt-0.5">
                          <Box className="size-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">Lemari {lem.number}</p>
                          {lem.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lem.description}</p>}
                          <Badge variant="outline" className="mt-2 text-xs">{lem.items?.length || 0} Barang</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditLemari(lem)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteTarget({ id: lem.id, name: `Lemari ${lem.number}`, type: 'lemari' })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items in Room (when no bilik/lemari selected) */}
        {!selectedBilikId && !selectedLemariId && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="size-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base">Barang di Ruang {currentRoom.name}</CardTitle>
                  <CardDescription>Barang yang berada langsung di ruangan ini (tidak di bilik/lemari)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderItemsTable()}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ─── Render: Items in Bilik/Lemari ───────────────────────────────────────

  function renderBilikOrLemariItems() {
    const title = selectedLemariId
      ? `Barang di Lemari ${currentRoom?.lemari.find(l => l.id === selectedLemariId)?.number || ''}`
      : selectedBilikId
        ? `Barang di Bilik ${currentRoom?.biliks.find(b => b.id === selectedBilikId)?.name || ''}`
        : ''

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>Daftar barang yang ada di dalamnya</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBilikId(null)
                setSelectedLemariId(null)
              }}
            >
              <ChevronRight className="size-4 mr-1 rotate-180" /> Kembali
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderItemsTable()}
        </CardContent>
      </Card>
    )
  }

  function renderItemsTable() {
    if (itemsLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="size-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada barang</p>
          <p className="text-sm">Tambahkan barang melalui menu KIB</p>
        </div>
      )
    }

    return (
      <div className="max-h-[400px] overflow-y-auto rounded-md border">
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
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-[50px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PhotoThumbnail
                      photos={item.photos || []}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.registrationNumber || '-'}</TableCell>
                <TableCell>{item.brand || '-'}</TableCell>
                <TableCell>{conditionBadge(item.condition)}</TableCell>
                <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
                <TableCell>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 ${item.photos && item.photos.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                      onClick={(e) => { e.stopPropagation(); setPhotoItem(item); setPhotoDialogOpen(true) }}
                      title={item.photos && item.photos.length > 0 ? `Kelola foto (${item.photos.length})` : 'Tambah foto'}
                    >
                      <Camera className="size-4" />
                    </Button>
                    {item.photos && item.photos.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full size-3.5 flex items-center justify-center font-bold">{item.photos.length}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventaris</h2>
          <p className="text-muted-foreground">Manajemen ruangan dan inventaris barang</p>
        </div>
        {!selectedRoomId && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrintRoomList} disabled={rooms.length === 0}>
              <Printer className="size-4 mr-2" />
              Cetak
            </Button>
            <Button onClick={openAddRoom}>
              <Plus className="size-4 mr-2" />
              Tambah Ruang
            </Button>
          </div>
        )}
      </div>

      {selectedRoomId && renderBreadcrumb()}

      {!selectedRoomId ? renderRoomList() : (
        selectedBilikId || selectedLemariId ? renderBilikOrLemariItems() : renderRoomDetail()
      )}

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Ruang' : 'Tambah Ruang'}</DialogTitle>
            <DialogDescription>{editingRoom ? 'Perbarui data ruangan' : 'Isi data ruangan baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room-name">Nama Ruang *</Label>
              <Input id="room-name" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Masukkan nama ruang" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building">Gedung</Label>
              <Input id="building" value={roomForm.building} onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })} placeholder="Nama gedung" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Lantai</Label>
              <Input id="floor" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} placeholder="Nomor lantai" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room-desc">Deskripsi</Label>
              <Textarea id="room-desc" value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} placeholder="Deskripsi ruangan" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleRoomSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingRoom ? 'Simpan Perubahan' : 'Tambah Ruang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bilik Dialog */}
      <Dialog open={bilikDialogOpen} onOpenChange={setBilikDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBilik ? 'Edit Bilik' : 'Tambah Bilik'}</DialogTitle>
            <DialogDescription>{editingBilik ? 'Perbarui data bilik' : 'Isi data bilik baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bilik-name">Nama Bilik *</Label>
              <Input id="bilik-name" value={bilikForm.name} onChange={(e) => setBilikForm({ ...bilikForm, name: e.target.value })} placeholder="Nama bilik" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-number">Nomor Bilik</Label>
              <Input id="bilik-number" value={bilikForm.number} onChange={(e) => setBilikForm({ ...bilikForm, number: e.target.value })} placeholder="Nomor bilik" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bilik-desc">Deskripsi</Label>
              <Textarea id="bilik-desc" value={bilikForm.description} onChange={(e) => setBilikForm({ ...bilikForm, description: e.target.value })} placeholder="Deskripsi bilik" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBilikDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleBilikSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingBilik ? 'Simpan Perubahan' : 'Tambah Bilik'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lemari Dialog */}
      <Dialog open={lemariDialogOpen} onOpenChange={setLemariDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLemari ? 'Edit Lemari' : 'Tambah Lemari'}</DialogTitle>
            <DialogDescription>{editingLemari ? 'Perbarui data lemari' : 'Isi data lemari baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lemari-number">Nomor Lemari *</Label>
              <Input id="lemari-number" value={lemariForm.number} onChange={(e) => setLemariForm({ ...lemariForm, number: e.target.value })} placeholder="Nomor lemari" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-desc">Deskripsi</Label>
              <Textarea id="lemari-desc" value={lemariForm.description} onChange={(e) => setLemariForm({ ...lemariForm, description: e.target.value })} placeholder="Deskripsi lemari" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLemariDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleLemariSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingLemari ? 'Simpan Perubahan' : 'Tambah Lemari'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <span className="font-semibold">{deleteTarget?.name}</span>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onPhotosChange={(newPhotos) => {
                handleItemPhotosChange(photoItem.id, newPhotos)
                setPhotoItem(prev => prev ? { ...prev, photos: newPhotos } : null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
