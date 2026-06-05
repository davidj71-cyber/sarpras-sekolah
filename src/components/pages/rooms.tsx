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
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { PhotoGallery } from '@/components/photo-gallery'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BilikData {
  id: string
  name: string
  number: string
  description: string
  roomId: string
  items?: InventoryItemData[]
}

interface CabinetData {
  id: string
  number: string
  description: string
  roomId: string
  items?: InventoryItemData[]
}

interface RoomData {
  id: string
  name: string
  building: string
  floor: string
  description: string
  biliks: BilikData[]
  cabinets: CabinetData[]
  items?: InventoryItemData[]
  createdAt: string
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
  room?: { id: string; name: string }
  bilik?: { id: string; name: string }
  cabinet?: { id: string; number: string }
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
  const [items, setItems] = useState<InventoryItemData[]>([])
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

  // Lemari/Cabinet dialog (UI shows "Lemari", API uses "cabinet")
  const [lemariDialogOpen, setLemariDialogOpen] = useState(false)
  const [editingLemari, setEditingLemari] = useState<CabinetData | null>(null)
  const [lemariForm, setLemariForm] = useState({ number: '', description: '' })

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'room' | 'bilik' | 'lemari' } | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  })
  const [itemSaving, setItemSaving] = useState(false)

  // Item delete confirmation
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletingItem, setDeletingItem] = useState(false)

  // Print dialog states
  const [printListDialogOpen, setPrintListDialogOpen] = useState(false)
  const [printDetailDialogOpen, setPrintDetailDialogOpen] = useState(false)

  function handleItemPhotosChange(itemId: string, newPhotos: string[]) {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, photos: newPhotos } : item))
  }

  // ─── Fetch rooms ─────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/rooms')
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
      fetch(`/api/inventory/rooms/${selectedRoomId}`)
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
      fetch(`/api/inventory/items?cabinetId=${selectedLemariId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setItems(data); setItemsLoading(false) })
        .catch(() => { setItems([]); setItemsLoading(false) })
    } else if (selectedBilikId) {
      setItemsLoading(true)
      fetch(`/api/inventory/items?bilikId=${selectedBilikId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setItems(data); setItemsLoading(false) })
        .catch(() => { setItems([]); setItemsLoading(false) })
    } else if (selectedRoomId) {
      setItemsLoading(true)
      fetch(`/api/inventory/items?roomId=${selectedRoomId}`)
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
  const totalLemari = rooms.reduce((acc, r) => acc + (r.cabinets?.length || 0), 0)

  // ─── Helper: refresh items list ─────────────────────────────────────────

  function refreshItemsList() {
    if (selectedLemariId) {
      fetch(`/api/inventory/items?cabinetId=${selectedLemariId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setItems(data))
    } else if (selectedBilikId) {
      fetch(`/api/inventory/items?bilikId=${selectedBilikId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setItems(data))
    } else if (selectedRoomId) {
      fetch(`/api/inventory/items?roomId=${selectedRoomId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setItems(data))
    }
  }

  // ─── Helper: refresh room data ─────────────────────────────────────────

  async function refreshRoomData() {
    if (selectedRoomId) {
      const roomRes = await fetch(`/api/inventory/rooms/${selectedRoomId}`)
      if (roomRes.ok) setCurrentRoom(await roomRes.json())
    }
    fetchRooms()
  }

  // ─── Print Room List ──────────────────────────────────────────────────────

  async function handlePrintRoomList(orientation: PrintOrientation = 'portrait') {
    const tableRows = rooms.map((room, idx) => {
      const bilikCount = room.biliks?.length || 0
      const lemariCount = room.cabinets?.length || 0
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
    const totalLemariPrint = rooms.reduce((acc, r) => acc + (r.cabinets?.length || 0), 0)
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

    await printWithKop('DAFTAR RUANGAN', contentHtml, orientation)
  }

  // ─── Print Room Detail ──────────────────────────────────────────────────

  async function handlePrintRoomDetail(orientation: PrintOrientation = 'portrait') {
    if (!selectedRoomId || !currentRoom) return

    try {
      // Fetch all items for the room (including items in biliks and cabinets)
      const res = await fetch(`/api/inventory/items?roomId=${selectedRoomId}`)
      if (!res.ok) throw new Error('Gagal')
      const allItems: InventoryItemData[] = await res.json()

      // Also fetch items from biliks and cabinets in this room
      const bilikItemPromises = currentRoom.biliks.map(async (bilik) => {
        try {
          const bRes = await fetch(`/api/inventory/items?bilikId=${bilik.id}`)
          if (!bRes.ok) return []
          return await bRes.json()
        } catch { return [] }
      })

      const cabinetItemPromises = currentRoom.cabinets.map(async (cab) => {
        try {
          const cRes = await fetch(`/api/inventory/items?cabinetId=${cab.id}`)
          if (!cRes.ok) return []
          return await cRes.json()
        } catch { return [] }
      })

      const [bilikItems, cabinetItems] = await Promise.all([
        Promise.all(bilikItemPromises),
        Promise.all(cabinetItemPromises),
      ])

      // Combine all items and deduplicate
      const allBilikItems = bilikItems.flat()
      const allCabinetItems = cabinetItems.flat()
      const combinedItems = [...allItems, ...allBilikItems, ...allCabinetItems]
      const uniqueItems = Array.from(
        combinedItems.reduce((map, item) => { map.set(item.id, item); return map }, new Map<string, InventoryItemData>())
        .values()
      )

      const baikCount = uniqueItems.filter(i => i.condition === 'Baik').length
      const rusakRinganCount = uniqueItems.filter(i => i.condition === 'Rusak Ringan').length
      const rusakBeratCount = uniqueItems.filter(i => i.condition === 'Rusak Berat').length

      // Determine location for each item
      function getItemLocation(item: InventoryItemData): string {
        const parts: string[] = []
        parts.push(currentRoom.name)
        if (item.bilikId) {
          const bilik = currentRoom.biliks.find(b => b.id === item.bilikId)
          if (bilik) parts.push(`Bilik ${bilik.name}`)
        }
        if (item.cabinetId) {
          const cab = currentRoom.cabinets.find(c => c.id === item.cabinetId)
          if (cab) parts.push(`Lemari ${cab.number}`)
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
          <td>${item.sumberDana || '-'}</td>
          <td class="text-center">${item.tahunPengadaan || '-'}</td>
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
              <th>Sumber Dana</th>
              <th>Tahun Pengadaan</th>
              <th>Lokasi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="10" class="text-center">Tidak ada barang</td></tr>'}
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

      await printWithKop(`INVENTARIS RUANG ${currentRoom.name.toUpperCase()}`, contentHtml, orientation)
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
      const url = editingRoom ? `/api/inventory/rooms/${editingRoom.id}` : '/api/inventory/rooms'
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
      const url = editingBilik ? `/api/inventory/biliks/${editingBilik.id}` : '/api/inventory/biliks'
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
      const roomRes = await fetch(`/api/inventory/rooms/${selectedRoomId}`)
      if (roomRes.ok) setCurrentRoom(await roomRes.json())
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan bilik', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Lemari/Cabinet CRUD ──────────────────────────────────────────────────

  function openAddLemari() {
    setEditingLemari(null)
    setLemariForm({ number: '', description: '' })
    setLemariDialogOpen(true)
  }

  function openEditLemari(cab: CabinetData) {
    setEditingLemari(cab)
    setLemariForm({ number: cab.number, description: cab.description })
    setLemariDialogOpen(true)
  }

  async function handleLemariSubmit() {
    if (!lemariForm.number.trim() || !selectedRoomId) return
    setSaving(true)
    try {
      const url = editingLemari ? `/api/inventory/cabinets/${editingLemari.id}` : '/api/inventory/cabinets'
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
      const roomRes = await fetch(`/api/inventory/rooms/${selectedRoomId}`)
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
        room: `/api/inventory/rooms/${deleteTarget.id}`,
        bilik: `/api/inventory/biliks/${deleteTarget.id}`,
        lemari: `/api/inventory/cabinets/${deleteTarget.id}`,
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
          const roomRes = await fetch(`/api/inventory/rooms/${selectedRoomId}`)
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
    })
    setItemDialogOpen(true)
  }

  function openEditItem(item: InventoryItemData) {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      registrationNumber: item.registrationNumber,
      brand: item.brand || '',
      condition: item.condition,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      sumberDana: item.sumberDana || '',
      tahunPengadaan: item.tahunPengadaan ?? null,
      notes: item.notes || '',
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
        // Add new item — determine location from current selection
        const locationData: Record<string, string | null> = {
          roomId: selectedRoomId,
          bilikId: selectedBilikId,
          cabinetId: selectedLemariId,
        }
        const res = await fetch('/api/inventory/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...itemForm, ...locationData }),
        })
        if (!res.ok) throw new Error('Gagal')
        toast({ title: 'Berhasil', description: 'Barang berhasil ditambahkan' })
      }
      setItemDialogOpen(false)
      refreshItemsList()
      refreshRoomData()
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
      refreshItemsList()
      refreshRoomData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus barang', variant: 'destructive' })
    } finally {
      setDeletingItem(false)
      setDeleteItemTarget(null)
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
          Inventaris
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
              Lemari {currentRoom.cabinets.find(c => c.id === selectedLemariId)?.number || ''}
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
                        <Box className="size-3 mr-1" />{room.cabinets?.length || 0} Lemari
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
                <Button variant="outline" size="sm" onClick={() => setPrintDetailDialogOpen(true)}>
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

        {/* Lemari/Cabinet Section */}
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
            {currentRoom.cabinets?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="size-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Belum ada lemari</p>
                <p className="text-sm">Tambahkan lemari untuk menyimpan barang</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.cabinets.map((cab) => (
                  <div
                    key={cab.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLemariId === cab.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50 hover:shadow-sm'}`}
                    onClick={() => { setSelectedLemariId(cab.id); setSelectedBilikId(null) }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-orange-50 p-1.5 mt-0.5">
                          <Box className="size-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">Lemari {cab.number}</p>
                          {cab.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cab.description}</p>}
                          <Badge variant="outline" className="mt-2 text-xs">{cab.items?.length || 0} Barang</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditLemari(cab)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteTarget({ id: cab.id, name: `Lemari ${cab.number}`, type: 'lemari' })}>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="size-5 text-emerald-600" />
                  <div>
                    <CardTitle className="text-base">Barang di Ruang {currentRoom.name}</CardTitle>
                    <CardDescription>Barang yang berada langsung di ruangan ini (tidak di bilik/lemari)</CardDescription>
                  </div>
                </div>
                <Button size="sm" onClick={openAddItem}>
                  <Plus className="size-4 mr-1" /> Tambah Barang
                </Button>
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
      ? `Barang di Lemari ${currentRoom?.cabinets.find(c => c.id === selectedLemariId)?.number || ''}`
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
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openAddItem}>
                <Plus className="size-4 mr-1" /> Tambah Barang
              </Button>
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
          <p className="text-sm">Klik tombol &quot;Tambah Barang&quot; untuk menambahkan barang baru</p>
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
              <TableHead className="text-right">Harga</TableHead>
              <TableHead>Sumber Dana</TableHead>
              <TableHead>Tahun Pengadaan</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-[120px]">Aksi</TableHead>
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
                <TableCell className="text-right">{item.price ? formatRupiahPrint(item.price) : '-'}</TableCell>
                <TableCell>{item.sumberDana || '-'}</TableCell>
                <TableCell>{item.tahunPengadaan || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 ${item.photos && item.photos.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                      onClick={(e) => { e.stopPropagation(); setPhotoItem(item); setPhotoDialogOpen(true) }}
                      title={item.photos && item.photos.length > 0 ? `Kelola foto (${item.photos.length})` : 'Tambah foto'}
                    >
                      <Camera className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={(e) => { e.stopPropagation(); openEditItem(item) }}
                      title="Edit barang"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteItemTarget({ id: item.id, name: item.name }) }}
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
            <Button variant="outline" onClick={() => setPrintListDialogOpen(true)} disabled={rooms.length === 0}>
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

      {/* Lemari/Cabinet Dialog */}
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
            <DialogDescription>{editingItem ? 'Perbarui data barang' : 'Isi data barang baru'}</DialogDescription>
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
              <Input id="item-brand" value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} placeholder="Merk barang" />
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
              <Input id="item-unit" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="Satuan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Harga (Rp)</Label>
              <Input id="item-price" type="number" min={0} value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) || 0 })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-sumber-dana">Sumber Dana</Label>
              <Select value={itemForm.sumberDana || '_none_'} onValueChange={(val) => setItemForm({ ...itemForm, sumberDana: val === '_none_' ? '' : val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih sumber dana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Tidak Ditentukan —</SelectItem>
                  <SelectItem value="APBN">APBN</SelectItem>
                  <SelectItem value="APBD">APBD</SelectItem>
                  <SelectItem value="BOS">BOS</SelectItem>
                  <SelectItem value="Donasi">Donasi</SelectItem>
                  <SelectItem value="Hibah">Hibah</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-tahun-pengadaan">Tahun Pengadaan</Label>
              <Input id="item-tahun-pengadaan" type="number" min={1900} max={2100} value={itemForm.tahunPengadaan ?? ''} onChange={(e) => setItemForm({ ...itemForm, tahunPengadaan: e.target.value ? Number(e.target.value) : null })} placeholder="Contoh: 2024" />
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
        open={printListDialogOpen}
        onOpenChange={setPrintListDialogOpen}
        onPrint={handlePrintRoomList}
        title="Cetak Daftar Ruangan"
      />
      <PrintDialog
        open={printDetailDialogOpen}
        onOpenChange={setPrintDetailDialogOpen}
        onPrint={handlePrintRoomDetail}
        title="Cetak Detail Ruangan"
      />
    </div>
  )
}
