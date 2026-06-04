'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigationStore } from '@/lib/navigation-store'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

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
  ChevronLeft,
  Archive,
  Box,
  Package,
} from 'lucide-react'

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
      // Refresh room detail
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

  // ─── Breadcrumb ──────────────────────────────────────────────────────────

  function renderBreadcrumb() {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button
          onClick={() => { setSelectedRoomId(null); setSelectedBilikId(null); setSelectedLemariId(null) }}
          className="hover:text-foreground transition-colors"
        >
          Ruang
        </button>
        {selectedRoomId && currentRoom && (
          <>
            <ChevronLeft className="size-3 rotate-180" />
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
            <ChevronLeft className="size-3 rotate-180" />
            <span className="text-foreground font-medium">
              Bilik: {currentRoom.biliks.find(b => b.id === selectedBilikId)?.name || ''}
            </span>
          </>
        )}
        {selectedLemariId && currentRoom && (
          <>
            <ChevronLeft className="size-3 rotate-180" />
            <span className="text-foreground font-medium">
              Lemari: {currentRoom.lemari.find(l => l.id === selectedLemariId)?.number || ''}
            </span>
          </>
        )}
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
        <div className="text-center py-12 text-muted-foreground">
          <DoorOpen className="size-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Belum ada data ruangan</p>
          <p className="text-sm">Klik "Tambah Ruang" untuk menambahkan</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedRoomId(room.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <DoorOpen className="size-5 text-primary" />
                  <CardTitle className="text-base">{room.name}</CardTitle>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditRoom(room)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: room.id, name: room.name, type: 'room' })}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                {room.building && <p>Gedung: {room.building}</p>}
                {room.floor && <p>Lantai: {room.floor}</p>}
                {room.description && <p className="truncate">{room.description}</p>}
                <div className="flex gap-3 pt-2">
                  <Badge variant="secondary">{room.biliks?.length || 0} Bilik</Badge>
                  <Badge variant="secondary">{room.lemari?.length || 0} Lemari</Badge>
                  <Badge variant="outline">{room.items?.length || 0} Barang</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ─── Render: Room Detail ─────────────────────────────────────────────────

  function renderRoomDetail() {
    if (!currentRoom) return null

    return (
      <div className="space-y-6">
        {/* Bilik Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="size-5" />
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
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada bilik</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.biliks.map((bilik) => (
                  <div
                    key={bilik.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedBilikId === bilik.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => { setSelectedBilikId(bilik.id); setSelectedLemariId(null) }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{bilik.name}</p>
                        <p className="text-sm text-muted-foreground">No: {bilik.number || '-'}</p>
                        {bilik.description && <p className="text-xs text-muted-foreground mt-1 truncate">{bilik.description}</p>}
                        <Badge variant="outline" className="mt-2">{bilik.items?.length || 0} Barang</Badge>
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
                <Box className="size-5" />
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
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada lemari</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.lemari.map((lem) => (
                  <div
                    key={lem.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedLemariId === lem.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => { setSelectedLemariId(lem.id); setSelectedBilikId(null) }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">Lemari {lem.number}</p>
                        {lem.description && <p className="text-sm text-muted-foreground mt-1 truncate">{lem.description}</p>}
                        <Badge variant="outline" className="mt-2">{lem.items?.length || 0} Barang</Badge>
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
                <Package className="size-5" />
                <div>
                  <CardTitle className="text-base">Barang di Ruang {currentRoom.name}</CardTitle>
                  <CardDescription>Barang yang berada langsung di ruangan ini</CardDescription>
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
              <Package className="size-5" />
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
              <ChevronLeft className="size-4 mr-1" /> Kembali
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
          <Package className="size-10 mx-auto mb-3 opacity-30" />
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
              <TableHead>Nama Barang</TableHead>
              <TableHead>No. Register</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.registrationNumber || '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.condition === 'Baik' ? 'default' : item.condition === 'Rusak Ringan' ? 'secondary' : 'destructive'}>
                    {item.condition}
                  </Badge>
                </TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
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
          <h2 className="text-2xl font-bold tracking-tight">Ruang</h2>
          <p className="text-muted-foreground">Manajemen ruangan dan lokasi barang</p>
        </div>
        {!selectedRoomId && (
          <Button onClick={openAddRoom}>
            <Plus className="size-4 mr-2" />
            Tambah Ruang
          </Button>
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
    </div>
  )
}
