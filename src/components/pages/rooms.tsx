'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigationStore } from '@/lib/navigation-store'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
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
import { MasterCombobox } from '@/components/ui/master-combobox'
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
  FileSpreadsheet,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { exportToExcel, getSchoolMeta, type ExcelColumn } from '@/lib/export-excel'
import { PrintDialog } from '@/components/print-dialog'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { PhotoGallery } from '@/components/photo-gallery'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BilikData {
  id: string
  name: string
  number: string
  description: string
  roomId: string
  // ── Aset fields ──
  condition: string
  acquisitionYear: number | null
  acquisitionPrice: number
  sumberDana: string
  length: number
  width: number
  height: number
  area: number
  volume: number
  registrationNumber: string
  documentNumber: string
  responsiblePerson: string
  usefulLife: number | null
  notes: string
  items?: InventoryItemData[]
}

interface CabinetData {
  id: string
  number: string
  description: string
  roomId: string
  bilikId: string | null
  bilik?: { id: string; name: string; number: string } | null
  // ── Aset fields ──
  condition: string
  acquisitionYear: number | null
  acquisitionPrice: number
  sumberDana: string
  length: number
  width: number
  height: number
  area: number
  volume: number
  registrationNumber: string
  documentNumber: string
  responsiblePerson: string
  usefulLife: number | null
  notes: string
  items?: InventoryItemData[]
}

interface BuildingRef {
  id: string
  name: string
  code: string
}

interface RoomData {
  id: string
  name: string
  buildingId: string | null
  building: BuildingRef | null
  floor: string
  description: string
  biliks: BilikData[]
  cabinets: CabinetData[]
  items?: InventoryItemData[]
  // ── Aset fields ──
  condition: string
  acquisitionYear: number | null
  acquisitionPrice: number
  sumberDana: string
  length: number
  width: number
  height: number
  area: number
  volume: number
  capacity: number
  registrationNumber: string
  documentNumber: string
  responsiblePerson: string
  usefulLife: number | null
  notes: string
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
  const [roomForm, setRoomForm] = useState({
    name: '',
    buildingId: '',
    floor: '',
    description: '',
    condition: 'Baik' as string,
    acquisitionYear: '' as number | string,
    acquisitionPrice: 0 as number,
    sumberDana: '',
    length: 0 as number | string,
    width: 0 as number | string,
    height: 0 as number | string,
    area: 0 as number | string,
    volume: 0 as number | string,
    capacity: 0 as number | string,
    registrationNumber: '',
    documentNumber: '',
    responsiblePerson: '',
    usefulLife: '' as number | string,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Bilik dialog
  const [bilikDialogOpen, setBilikDialogOpen] = useState(false)
  const [editingBilik, setEditingBilik] = useState<BilikData | null>(null)
  const [bilikForm, setBilikForm] = useState({
    name: '',
    number: '',
    description: '',
    condition: 'Baik' as string,
    acquisitionYear: '' as number | string,
    acquisitionPrice: 0 as number,
    sumberDana: '',
    length: 0 as number | string,
    width: 0 as number | string,
    height: 0 as number | string,
    area: 0 as number | string,
    volume: 0 as number | string,
    registrationNumber: '',
    documentNumber: '',
    responsiblePerson: '',
    usefulLife: '' as number | string,
    notes: '',
  })

  // Lemari/Cabinet dialog (UI shows "Lemari", API uses "cabinet")
  const [lemariDialogOpen, setLemariDialogOpen] = useState(false)
  const [editingLemari, setEditingLemari] = useState<CabinetData | null>(null)
  const [lemariForm, setLemariForm] = useState({
    number: '',
    description: '',
    bilikId: '',
    condition: 'Baik' as string,
    acquisitionYear: '' as number | string,
    acquisitionPrice: 0 as number,
    sumberDana: '',
    length: 0 as number | string,
    width: 0 as number | string,
    height: 0 as number | string,
    area: 0 as number | string,
    volume: 0 as number | string,
    registrationNumber: '',
    documentNumber: '',
    responsiblePerson: '',
    usefulLife: '' as number | string,
    notes: '',
  })

  // Buildings (Gedung) list for room form dropdown
  const [buildings, setBuildings] = useState<BuildingRef[]>([])

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

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/buildings')
      if (!res.ok) return
      const data = await res.json()
      setBuildings(data.map((b: BuildingRef & { code?: string }) => ({ id: b.id, name: b.name, code: b.code || '' })))
    } catch {
      // silent fail; buildings dropdown will just be empty
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])
  useEffect(() => { fetchBuildings() }, [fetchBuildings])

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
    (room.building?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        <td>${room.building?.name || '-'}</td>
        <td class="text-center">${room.floor || '-'}</td>
        <td class="text-center">${room.condition || '-'}</td>
        <td class="text-center">${room.acquisitionYear || '-'}</td>
        <td class="text-right">${room.acquisitionPrice ? formatRupiahPrint(room.acquisitionPrice) : '-'}</td>
        <td class="text-center">${room.area ? room.area : '-'}</td>
        <td class="text-center">${room.capacity ? room.capacity : '-'}</td>
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
            <th>Keadaan</th>
            <th>Tahun</th>
            <th>Nilai Aset</th>
            <th>Luas (m²)</th>
            <th>Kapasitas</th>
            <th>Jumlah Bilik</th>
            <th>Jumlah Lemari</th>
            <th>Jumlah Barang</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr>
            <td colspan="9" class="font-bold text-right">Total</td>
            <td class="text-center font-bold">${totalBilikPrint}</td>
            <td class="text-center font-bold">${totalLemariPrint}</td>
            <td class="text-center font-bold">${totalItemsPrint}</td>
          </tr>
        </tbody>
      </table>
    `

    await printWithKop('DAFTAR RUANGAN', contentHtml, orientation, {
      appendSignature: true,
      signatureOptions: { rightTitle: 'Pengurus Barang', rightSigner: 'goodsManager' },
    })
  }

  // ─── Excel: Room List ─────────────────────────────────────────────────

  async function handleExportExcelRoomList() {
    if (rooms.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data ruangan untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      await exportToExcel({
        filename: 'Daftar_Ruangan.xlsx',
        sheetName: 'Daftar Ruangan',
        title: 'DAFTAR RUANGAN',
        meta,
        columns: [
          { header: 'No', key: (r) => String(rooms.indexOf(r) + 1), width: 6 },
          { header: 'Nama Ruang', key: 'name', width: 24 },
          { header: 'Gedung', key: (r) => r.building?.name || '-', width: 20 },
          { header: 'Lantai', key: (r) => r.floor || '-', width: 8 },
          { header: 'Keadaan', key: (r) => r.condition || '-', width: 14 },
          { header: 'Tahun Perolehan', key: (r) => r.acquisitionYear || '-', width: 14 },
          { header: 'Nilai Aset (Rp)', key: (r) => r.acquisitionPrice || 0, width: 18 },
          { header: 'Luas (m²)', key: (r) => r.area || 0, width: 12 },
          { header: 'Kapasitas', key: (r) => r.capacity || 0, width: 12 },
          { header: 'Jml Bilik', key: (r) => r.biliks?.length || 0, width: 10 },
          { header: 'Jml Lemari', key: (r) => r.cabinets?.length || 0, width: 10 },
          { header: 'Jml Barang', key: (r) => r.items?.length || 0, width: 10 },
          { header: 'Sumber Dana', key: (r) => r.sumberDana || '-', width: 16 },
          { header: 'Penanggung Jawab', key: (r) => r.responsiblePerson || '-', width: 20 },
        ],
        data: rooms,
      })
      toast({ title: 'Berhasil', description: 'Data ruangan berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
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
          <tr><td class="font-bold">Gedung</td><td>: ${currentRoom.building?.name || '-'}</td></tr>
          <tr><td class="font-bold">Lantai</td><td>: ${currentRoom.floor || '-'}</td></tr>
          <tr><td class="font-bold">Keadaan</td><td>: ${currentRoom.condition || 'Baik'}</td></tr>
          <tr><td class="font-bold">Tahun Perolehan</td><td>: ${currentRoom.acquisitionYear || '-'}</td></tr>
          <tr><td class="font-bold">Nilai Perolehan</td><td>: ${currentRoom.acquisitionPrice ? formatRupiahPrint(currentRoom.acquisitionPrice) : '-'}</td></tr>
          <tr><td class="font-bold">Sumber Dana</td><td>: ${currentRoom.sumberDana || '-'}</td></tr>
          <tr><td class="font-bold">Panjang × Lebar × Tinggi</td><td>: ${currentRoom.length || currentRoom.width || currentRoom.height ? `${currentRoom.length || '-'} × ${currentRoom.width || '-'} × ${currentRoom.height || '-'} m` : '-'}</td></tr>
          <tr><td class="font-bold">Luas</td><td>: ${currentRoom.area ? `${currentRoom.area} m²` : '-'}</td></tr>
          <tr><td class="font-bold">Volume</td><td>: ${currentRoom.volume ? `${currentRoom.volume} m³` : '-'}</td></tr>
          <tr><td class="font-bold">Kapasitas</td><td>: ${currentRoom.capacity ? `${currentRoom.capacity} orang` : '-'}</td></tr>
          <tr><td class="font-bold">No. Registrasi</td><td>: ${currentRoom.registrationNumber || '-'}</td></tr>
          <tr><td class="font-bold">Penanggung Jawab</td><td>: ${currentRoom.responsiblePerson || '-'}</td></tr>
          <tr><td class="font-bold">Masa Manfaat</td><td>: ${currentRoom.usefulLife ? `${currentRoom.usefulLife} tahun` : '-'}</td></tr>
          <tr><td class="font-bold">Catatan</td><td>: ${currentRoom.notes || '-'}</td></tr>
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
      `

      await printWithKop(`INVENTARIS RUANG ${currentRoom.name.toUpperCase()}`, contentHtml, orientation, {
        appendSignature: true,
        signatureOptions: { rightTitle: 'Pengurus Barang', rightSigner: 'goodsManager' },
      })
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak data ruangan', variant: 'destructive' })
    }
  }

  // ─── Excel: Room Detail ──────────────────────────────────────────────────

  async function handleExportExcelRoomDetail() {
    if (!selectedRoomId || !currentRoom) return
    try {
      const res = await fetch(`/api/inventory/items?roomId=${selectedRoomId}`)
      if (!res.ok) throw new Error('Gagal')
      const allItems: InventoryItemData[] = await res.json()
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
      const combinedItems = [...allItems, ...bilikItems.flat(), ...cabinetItems.flat()]
      const uniqueItems = Array.from(
        combinedItems.reduce((map, item) => { map.set(item.id, item); return map }, new Map<string, InventoryItemData>())
          .values()
      )

      function getItemLocation(item: InventoryItemData): string {
        const parts: string[] = [currentRoom.name]
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

      const meta = await getSchoolMeta()
      meta.unshift(
        { label: 'Nama Ruang', value: currentRoom.name },
        { label: 'Gedung', value: currentRoom.building?.name || '-' },
        { label: 'Lantai', value: currentRoom.floor || '-' },
        { label: 'Keadaan', value: currentRoom.condition || 'Baik' },
        { label: 'Tahun Perolehan', value: String(currentRoom.acquisitionYear || '-') },
        { label: 'Kapasitas', value: String(currentRoom.capacity || '-') },
        { label: 'Penanggung Jawab', value: currentRoom.responsiblePerson || '-' },
      )

      const columns: ExcelColumn<InventoryItemData>[] = [
        { header: 'No', key: (item) => String(uniqueItems.indexOf(item) + 1), width: 6 },
        { header: 'Nama Barang', key: 'name', width: 28 },
        { header: 'No. Register', key: (item) => item.registrationNumber || '-', width: 16 },
        { header: 'Merk', key: (item) => item.brand || '-', width: 16 },
        { header: 'Kondisi', key: (item) => item.condition || '-', width: 14 },
        { header: 'Jumlah', key: (item) => `${item.quantity} ${item.unit}`, width: 12 },
        { header: 'Sumber Dana', key: (item) => item.sumberDana || '-', width: 16 },
        { header: 'Tahun Pengadaan', key: (item) => item.tahunPengadaan || '-', width: 14 },
        { header: 'Lokasi', key: (item) => getItemLocation(item), width: 28 },
        { header: 'Keterangan', key: (item) => item.notes || '-', width: 24 },
      ]

      await exportToExcel({
        filename: `Inventaris_Ruang_${currentRoom.name.replace(/\s+/g, '_')}.xlsx`,
        sheetName: 'Inventaris Ruang',
        title: `INVENTARIS RUANG ${currentRoom.name.toUpperCase()}`,
        meta,
        columns,
        data: uniqueItems,
      })
      toast({ title: 'Berhasil', description: 'Data inventaris ruang berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  // ─── Room CRUD ──────────────────────────────────────────────────────────

  function openAddRoom() {
    setEditingRoom(null)
    setRoomForm({
      name: '',
      buildingId: '',
      floor: '',
      description: '',
      condition: 'Baik',
      acquisitionYear: '',
      acquisitionPrice: 0,
      sumberDana: '',
      length: 0,
      width: 0,
      height: 0,
      area: 0,
      volume: 0,
      capacity: 0,
      registrationNumber: '',
      documentNumber: '',
      responsiblePerson: '',
      usefulLife: '',
      notes: '',
    })
    fetchBuildings()
    setRoomDialogOpen(true)
  }

  function openEditRoom(room: RoomData) {
    setEditingRoom(room)
    setRoomForm({
      name: room.name,
      buildingId: room.buildingId || '',
      floor: room.floor,
      description: room.description,
      condition: room.condition || 'Baik',
      acquisitionYear: room.acquisitionYear ?? '',
      acquisitionPrice: room.acquisitionPrice ?? 0,
      sumberDana: room.sumberDana || '',
      length: room.length ?? 0,
      width: room.width ?? 0,
      height: room.height ?? 0,
      area: room.area ?? 0,
      volume: room.volume ?? 0,
      capacity: room.capacity ?? 0,
      registrationNumber: room.registrationNumber || '',
      documentNumber: room.documentNumber || '',
      responsiblePerson: room.responsiblePerson || '',
      usefulLife: room.usefulLife ?? '',
      notes: room.notes || '',
    })
    fetchBuildings()
    setRoomDialogOpen(true)
  }

  async function handleRoomSubmit() {
    if (!roomForm.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama ruang wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: roomForm.name.trim(),
        buildingId: roomForm.buildingId,
        floor: roomForm.floor,
        description: roomForm.description,
        condition: roomForm.condition,
        acquisitionYear: roomForm.acquisitionYear ? Number(roomForm.acquisitionYear) : null,
        acquisitionPrice: Number(roomForm.acquisitionPrice) || 0,
        sumberDana: roomForm.sumberDana,
        length: Number(roomForm.length) || 0,
        width: Number(roomForm.width) || 0,
        height: Number(roomForm.height) || 0,
        area: Number(roomForm.area) || 0,
        volume: Number(roomForm.volume) || 0,
        capacity: Number(roomForm.capacity) || 0,
        registrationNumber: roomForm.registrationNumber,
        documentNumber: roomForm.documentNumber,
        responsiblePerson: roomForm.responsiblePerson,
        usefulLife: roomForm.usefulLife ? Number(roomForm.usefulLife) : null,
        notes: roomForm.notes,
      }
      const url = editingRoom ? `/api/inventory/rooms/${editingRoom.id}` : '/api/inventory/rooms'
      const method = editingRoom ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
    setBilikForm({
      name: '',
      number: '',
      description: '',
      condition: 'Baik',
      acquisitionYear: '',
      acquisitionPrice: 0,
      sumberDana: '',
      length: 0,
      width: 0,
      height: 0,
      area: 0,
      volume: 0,
      registrationNumber: '',
      documentNumber: '',
      responsiblePerson: '',
      usefulLife: '',
      notes: '',
    })
    setBilikDialogOpen(true)
  }

  function openEditBilik(bilik: BilikData) {
    setEditingBilik(bilik)
    setBilikForm({
      name: bilik.name,
      number: bilik.number,
      description: bilik.description,
      condition: bilik.condition || 'Baik',
      acquisitionYear: bilik.acquisitionYear ?? '',
      acquisitionPrice: bilik.acquisitionPrice ?? 0,
      sumberDana: bilik.sumberDana || '',
      length: bilik.length ?? 0,
      width: bilik.width ?? 0,
      height: bilik.height ?? 0,
      area: bilik.area ?? 0,
      volume: bilik.volume ?? 0,
      registrationNumber: bilik.registrationNumber || '',
      documentNumber: bilik.documentNumber || '',
      responsiblePerson: bilik.responsiblePerson || '',
      usefulLife: bilik.usefulLife ?? '',
      notes: bilik.notes || '',
    })
    setBilikDialogOpen(true)
  }

  async function handleBilikSubmit() {
    if (!bilikForm.name.trim() || !selectedRoomId) return
    setSaving(true)
    try {
      const payload = {
        name: bilikForm.name.trim(),
        number: bilikForm.number,
        description: bilikForm.description,
        condition: bilikForm.condition,
        acquisitionYear: bilikForm.acquisitionYear ? Number(bilikForm.acquisitionYear) : null,
        acquisitionPrice: Number(bilikForm.acquisitionPrice) || 0,
        sumberDana: bilikForm.sumberDana,
        length: Number(bilikForm.length) || 0,
        width: Number(bilikForm.width) || 0,
        height: Number(bilikForm.height) || 0,
        area: Number(bilikForm.area) || 0,
        volume: Number(bilikForm.volume) || 0,
        registrationNumber: bilikForm.registrationNumber,
        documentNumber: bilikForm.documentNumber,
        responsiblePerson: bilikForm.responsiblePerson,
        usefulLife: bilikForm.usefulLife ? Number(bilikForm.usefulLife) : null,
        notes: bilikForm.notes,
        roomId: selectedRoomId,
      }
      const url = editingBilik ? `/api/inventory/biliks/${editingBilik.id}` : '/api/inventory/biliks'
      const method = editingBilik ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    // pre-select bilik if user is currently viewing a bilik
    setLemariForm({
      number: '',
      description: '',
      bilikId: selectedBilikId || '',
      condition: 'Baik',
      acquisitionYear: '',
      acquisitionPrice: 0,
      sumberDana: '',
      length: 0,
      width: 0,
      height: 0,
      area: 0,
      volume: 0,
      registrationNumber: '',
      documentNumber: '',
      responsiblePerson: '',
      usefulLife: '',
      notes: '',
    })
    setLemariDialogOpen(true)
  }

  function openEditLemari(cab: CabinetData) {
    setEditingLemari(cab)
    setLemariForm({
      number: cab.number,
      description: cab.description,
      bilikId: cab.bilikId || '',
      condition: cab.condition || 'Baik',
      acquisitionYear: cab.acquisitionYear ?? '',
      acquisitionPrice: cab.acquisitionPrice ?? 0,
      sumberDana: cab.sumberDana || '',
      length: cab.length ?? 0,
      width: cab.width ?? 0,
      height: cab.height ?? 0,
      area: cab.area ?? 0,
      volume: cab.volume ?? 0,
      registrationNumber: cab.registrationNumber || '',
      documentNumber: cab.documentNumber || '',
      responsiblePerson: cab.responsiblePerson || '',
      usefulLife: cab.usefulLife ?? '',
      notes: cab.notes || '',
    })
    setLemariDialogOpen(true)
  }

  async function handleLemariSubmit() {
    if (!lemariForm.number.trim() || !selectedRoomId) return
    setSaving(true)
    try {
      const payload = {
        number: lemariForm.number.trim(),
        description: lemariForm.description,
        bilikId: lemariForm.bilikId || null,
        condition: lemariForm.condition,
        acquisitionYear: lemariForm.acquisitionYear ? Number(lemariForm.acquisitionYear) : null,
        acquisitionPrice: Number(lemariForm.acquisitionPrice) || 0,
        sumberDana: lemariForm.sumberDana,
        length: Number(lemariForm.length) || 0,
        width: Number(lemariForm.width) || 0,
        height: Number(lemariForm.height) || 0,
        area: Number(lemariForm.area) || 0,
        volume: Number(lemariForm.volume) || 0,
        registrationNumber: lemariForm.registrationNumber,
        documentNumber: lemariForm.documentNumber,
        responsiblePerson: lemariForm.responsiblePerson,
        usefulLife: lemariForm.usefulLife ? Number(lemariForm.usefulLife) : null,
        notes: lemariForm.notes,
        roomId: selectedRoomId,
      }
      const url = editingLemari ? `/api/inventory/cabinets/${editingLemari.id}` : '/api/inventory/cabinets'
      const method = editingLemari ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // ─── Asset dimension + metadata helper (cards) ─────────────────────────

  function renderAssetMeta(entity: {
    length?: number | null
    width?: number | null
    height?: number | null
    area?: number | null
    volume?: number | null
    capacity?: number | null
    registrationNumber?: string | null
    responsiblePerson?: string | null
  }) {
    const dimParts: string[] = []
    const dims: string[] = []
    if (entity.length) dims.push(`P: ${entity.length}m`)
    if (entity.width) dims.push(`L: ${entity.width}m`)
    if (entity.height) dims.push(`T: ${entity.height}m`)
    if (dims.length) dimParts.push(dims.join(' × '))
    if (entity.area) dimParts.push(`Luas: ${entity.area} m²`)
    if (entity.volume) dimParts.push(`Volume: ${entity.volume} m³`)
    if (entity.capacity) dimParts.push(`Kapasitas: ${entity.capacity} orang`)
    const dimLine = dimParts.join(' · ')

    const pjParts: string[] = []
    if (entity.registrationNumber) pjParts.push(`No. Reg: ${entity.registrationNumber}`)
    if (entity.responsiblePerson) pjParts.push(`PJ: ${entity.responsiblePerson}`)
    const pjLine = pjParts.join(' · ')

    if (!dimLine && !pjLine) return null
    return (
      <div className="text-[11px] text-muted-foreground mb-2 space-y-0.5">
        {dimLine && <p>{dimLine}</p>}
        {pjLine && <p>{pjLine}</p>}
      </div>
    )
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
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Ruang" value={rooms.length} subtitle="Ruang terdaftar" icon={DoorOpen} tone="info" delay={1} />
        <StatCard title="Total Bilik" value={totalBilik} subtitle="Bilik terdaftar" icon={Archive} tone="primary" delay={2} />
        <StatCard title="Total Lemari" value={totalLemari} subtitle="Lemari terdaftar" icon={Box} tone="warning" delay={3} />
        <StatCard title="Total Barang" value={totalItems} subtitle="Barang inventaris" icon={Package} tone="success" delay={4} />
      </div>
    )
  }

  // ─── Render: Room List ───────────────────────────────────────────────────

  function renderRoomList() {
    if (loading) {
      return <PageLoading label="Memuat data ruangan..." />
    }

    if (rooms.length === 0) {
      return (
        <Card className="card-pro">
          <CardContent className="p-0">
            <EmptyState
              icon={DoorOpen}
              title="Belum ada data ruangan"
              description="Klik tombol di bawah untuk menambahkan ruangan baru"
              action={
                <Button onClick={openAddRoom}>
                  <Plus className="size-4 mr-2" />
                  Tambah Ruang
                </Button>
              }
            />
          </CardContent>
        </Card>
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
          <EmptyState
            icon={Search}
            title="Tidak ditemukan"
            description="Tidak ada ruangan yang cocok dengan pencarian"
            size="compact"
          />
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
                  className="card-pro cursor-pointer hover:border-primary/50 transition-all group"
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
                            {room.building?.name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="size-3" />{room.building.name}
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
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
                      {conditionBadge(room.condition || 'Baik')}
                    </div>
                    {room.acquisitionPrice ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Nilai Aset: {formatRupiahPrint(room.acquisitionPrice)}{room.acquisitionYear ? ` · Th. ${room.acquisitionYear}` : ''}{room.sumberDana ? ` · ${room.sumberDana}` : ''}
                      </p>
                    ) : null}
                    {renderAssetMeta(room)}
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
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <DoorOpen className="size-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{currentRoom.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {currentRoom.building?.name && (
                      <span className="flex items-center gap-1"><Building2 className="size-3.5" />{currentRoom.building.name}</span>
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
                <Button variant="outline" size="sm" onClick={handleExportExcelRoomDetail}>
                  <FileSpreadsheet className="size-3.5 mr-1" /> Export Excel
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
        <Card className="card-pro">
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
              <EmptyState
                icon={Archive}
                title="Belum ada bilik"
                description="Tambahkan bilik untuk mengorganisir barang"
                size="compact"
              />
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
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-xs">{bilik.items?.length || 0} Barang</Badge>
                            {conditionBadge(bilik.condition || 'Baik')}
                          </div>
                          {bilik.acquisitionPrice ? (
                            <p className="text-xs text-muted-foreground mt-1">Nilai: {formatRupiahPrint(bilik.acquisitionPrice)}{bilik.acquisitionYear ? ` · Th. ${bilik.acquisitionYear}` : ''}</p>
                          ) : null}
                          {renderAssetMeta(bilik)}
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
        <Card className="card-pro">
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
              <EmptyState
                icon={Box}
                title="Belum ada lemari"
                description="Tambahkan lemari untuk menyimpan barang"
                size="compact"
              />
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
                          {cab.bilik?.name && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                              <Archive className="size-3" />Bilik {cab.bilik.name}
                            </span>
                          )}
                          {cab.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cab.description}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-xs">{cab.items?.length || 0} Barang</Badge>
                            {conditionBadge(cab.condition || 'Baik')}
                          </div>
                          {cab.acquisitionPrice ? (
                            <p className="text-xs text-muted-foreground mt-1">Nilai: {formatRupiahPrint(cab.acquisitionPrice)}{cab.acquisitionYear ? ` · Th. ${cab.acquisitionYear}` : ''}</p>
                          ) : null}
                          {renderAssetMeta(cab)}
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
          <Card className="card-pro">
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
      <Card className="card-pro">
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
      return <PageLoading label="Memuat barang..." />
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Belum ada barang"
          description='Klik tombol "Tambah Barang" untuk menambahkan barang baru'
          size="compact"
        />
      )
    }

    return (
      <div className="max-h-[400px] overflow-y-auto rounded-md border">
        <Table className="table-pro">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
              <TableHead className="w-[70px]">Foto</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>No. Register</TableHead>
              <TableHead>Merk</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead className="text-right tabular-nums whitespace-nowrap">Jumlah</TableHead>
              <TableHead className="text-right tabular-nums whitespace-nowrap">Harga</TableHead>
              <TableHead>Sumber Dana</TableHead>
              <TableHead className="text-center">Tahun Pengadaan</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-[120px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id} className="h-14">
                <TableCell className="text-left tabular-nums">{idx + 1}</TableCell>
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
                <TableCell className="text-right tabular-nums whitespace-nowrap">{item.quantity} {item.unit}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{item.price ? formatRupiahPrint(item.price) : '-'}</TableCell>
                <TableCell>{item.sumberDana || '-'}</TableCell>
                <TableCell className="text-center tabular-nums">{item.tahunPengadaan || '-'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.notes || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
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
    <PageContainer>
      <PageHeader
        title="Inventaris"
        description="Manajemen ruangan dan inventaris barang"
        icon={DoorOpen}
        actions={
          !selectedRoomId ? (
            <>
              <Button variant="outline" onClick={() => setPrintListDialogOpen(true)} disabled={rooms.length === 0}>
                <Printer className="size-4 mr-2" />
                Cetak
              </Button>
              <Button variant="outline" onClick={handleExportExcelRoomList} disabled={rooms.length === 0}>
                <FileSpreadsheet className="size-4 mr-2" />
                Export Excel
              </Button>
              <Button onClick={openAddRoom}>
                <Plus className="size-4 mr-2" />
                Tambah Ruang
              </Button>
            </>
          ) : undefined
        }
      />

      {selectedRoomId && renderBreadcrumb()}

      {!selectedRoomId ? renderRoomList() : (
        selectedBilikId || selectedLemariId ? renderBilikOrLemariItems() : renderRoomDetail()
      )}

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Ruang' : 'Tambah Ruang'}</DialogTitle>
            <DialogDescription>{editingRoom ? 'Perbarui data ruangan' : 'Isi data ruangan baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="room-name">Nama Ruang *</Label>
              <Input id="room-name" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Masukkan nama ruang" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building">Gedung</Label>
              <Select value={roomForm.buildingId || '__none__'} onValueChange={(v) => setRoomForm({ ...roomForm, buildingId: v === '__none__' ? '' : v })}>
                <SelectTrigger id="building">
                  <SelectValue placeholder={buildings.length === 0 ? 'Belum ada gedung' : 'Pilih gedung'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tanpa Gedung —</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.code ? ` (${b.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {buildings.length === 0 && (
                <p className="text-xs text-amber-600">Belum ada gedung. Tambahkan gedung di tab "Gedung" terlebih dahulu.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Lantai</Label>
              <Input id="floor" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} placeholder="Nomor lantai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-condition">Keadaan</Label>
              <Select value={roomForm.condition} onValueChange={(val) => setRoomForm({ ...roomForm, condition: val })}>
                <SelectTrigger id="room-condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-year">Tahun Perolehan</Label>
              <Input id="room-year" type="number" min={1900} max={2100} value={roomForm.acquisitionYear} onChange={(e) => setRoomForm({ ...roomForm, acquisitionYear: e.target.value })} placeholder="Misal: 2020" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-price">Nilai Perolehan (Rp)</Label>
              <CurrencyInput id="room-price" value={roomForm.acquisitionPrice} onChange={(val) => setRoomForm({ ...roomForm, acquisitionPrice: val })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-sumber">Sumber Dana</Label>
              <MasterCombobox
                id="room-sumber"
                category="sumberDana"
                value={roomForm.sumberDana}
                onChange={(val) => setRoomForm({ ...roomForm, sumberDana: val })}
                placeholder="Pilih sumber dana"
              />
            </div>
            {/* Dimensi Fisik */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Dimensi Fisik</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="room-length" className="text-xs">Panjang (m)</Label>
                  <Input id="room-length" type="number" min={0} step="any" value={roomForm.length} onChange={(e) => setRoomForm({ ...roomForm, length: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-width" className="text-xs">Lebar (m)</Label>
                  <Input id="room-width" type="number" min={0} step="any" value={roomForm.width} onChange={(e) => setRoomForm({ ...roomForm, width: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-height" className="text-xs">Tinggi (m)</Label>
                  <Input id="room-height" type="number" min={0} step="any" value={roomForm.height} onChange={(e) => setRoomForm({ ...roomForm, height: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-area" className="text-xs">Luas (m²)</Label>
                  <Input id="room-area" type="number" min={0} step="any" value={roomForm.area} onChange={(e) => setRoomForm({ ...roomForm, area: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-volume" className="text-xs">Volume (m³)</Label>
                  <Input id="room-volume" type="number" min={0} step="any" value={roomForm.volume} onChange={(e) => setRoomForm({ ...roomForm, volume: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-capacity" className="text-xs">Kapasitas (orang)</Label>
                  <Input id="room-capacity" type="number" min={0} step={1} value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>
            {/* Metadata Aset */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Metadata Aset</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="room-reg" className="text-xs">No. Registrasi / Kode Aset</Label>
                  <Input id="room-reg" value={roomForm.registrationNumber} onChange={(e) => setRoomForm({ ...roomForm, registrationNumber: e.target.value })} placeholder="Misal: R.001" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-doc" className="text-xs">No. Dokumen Perolehan</Label>
                  <Input id="room-doc" value={roomForm.documentNumber} onChange={(e) => setRoomForm({ ...roomForm, documentNumber: e.target.value })} placeholder="Misal: 123/ABC/2024" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-pj" className="text-xs">Penanggung Jawab</Label>
                  <Input id="room-pj" value={roomForm.responsiblePerson} onChange={(e) => setRoomForm({ ...roomForm, responsiblePerson: e.target.value })} placeholder="Nama penanggung jawab" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-useful" className="text-xs">Masa Manfaat (tahun)</Label>
                  <Input id="room-useful" type="number" min={0} step={1} value={roomForm.usefulLife} onChange={(e) => setRoomForm({ ...roomForm, usefulLife: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="room-notes" className="text-xs">Catatan</Label>
                  <Textarea id="room-notes" value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} placeholder="Catatan tambahan" rows={2} />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingBilik ? 'Edit Bilik' : 'Tambah Bilik'}</DialogTitle>
            <DialogDescription>{editingBilik ? 'Perbarui data bilik' : 'Isi data bilik baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bilik-name">Nama Bilik *</Label>
              <Input id="bilik-name" value={bilikForm.name} onChange={(e) => setBilikForm({ ...bilikForm, name: e.target.value })} placeholder="Nama bilik" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-number">Nomor Bilik</Label>
              <Input id="bilik-number" value={bilikForm.number} onChange={(e) => setBilikForm({ ...bilikForm, number: e.target.value })} placeholder="Nomor bilik" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-condition">Keadaan</Label>
              <Select value={bilikForm.condition} onValueChange={(val) => setBilikForm({ ...bilikForm, condition: val })}>
                <SelectTrigger id="bilik-condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-year">Tahun Perolehan</Label>
              <Input id="bilik-year" type="number" min={1900} max={2100} value={bilikForm.acquisitionYear} onChange={(e) => setBilikForm({ ...bilikForm, acquisitionYear: e.target.value })} placeholder="Misal: 2020" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-price">Nilai Perolehan (Rp)</Label>
              <CurrencyInput id="bilik-price" value={bilikForm.acquisitionPrice} onChange={(val) => setBilikForm({ ...bilikForm, acquisitionPrice: val })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bilik-sumber">Sumber Dana</Label>
              <MasterCombobox
                id="bilik-sumber"
                category="sumberDana"
                value={bilikForm.sumberDana}
                onChange={(val) => setBilikForm({ ...bilikForm, sumberDana: val })}
                placeholder="Pilih sumber dana"
              />
            </div>
            {/* Dimensi Fisik */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Dimensi Fisik</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bilik-length" className="text-xs">Panjang (m)</Label>
                  <Input id="bilik-length" type="number" min={0} step="any" value={bilikForm.length} onChange={(e) => setBilikForm({ ...bilikForm, length: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-width" className="text-xs">Lebar (m)</Label>
                  <Input id="bilik-width" type="number" min={0} step="any" value={bilikForm.width} onChange={(e) => setBilikForm({ ...bilikForm, width: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-height" className="text-xs">Tinggi (m)</Label>
                  <Input id="bilik-height" type="number" min={0} step="any" value={bilikForm.height} onChange={(e) => setBilikForm({ ...bilikForm, height: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-area" className="text-xs">Luas (m²)</Label>
                  <Input id="bilik-area" type="number" min={0} step="any" value={bilikForm.area} onChange={(e) => setBilikForm({ ...bilikForm, area: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-volume" className="text-xs">Volume (m³)</Label>
                  <Input id="bilik-volume" type="number" min={0} step="any" value={bilikForm.volume} onChange={(e) => setBilikForm({ ...bilikForm, volume: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>
            {/* Metadata Aset */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Metadata Aset</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bilik-reg" className="text-xs">No. Registrasi / Kode Aset</Label>
                  <Input id="bilik-reg" value={bilikForm.registrationNumber} onChange={(e) => setBilikForm({ ...bilikForm, registrationNumber: e.target.value })} placeholder="Misal: B.001" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-doc" className="text-xs">No. Dokumen Perolehan</Label>
                  <Input id="bilik-doc" value={bilikForm.documentNumber} onChange={(e) => setBilikForm({ ...bilikForm, documentNumber: e.target.value })} placeholder="Misal: 123/ABC/2024" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-pj" className="text-xs">Penanggung Jawab</Label>
                  <Input id="bilik-pj" value={bilikForm.responsiblePerson} onChange={(e) => setBilikForm({ ...bilikForm, responsiblePerson: e.target.value })} placeholder="Nama penanggung jawab" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bilik-useful" className="text-xs">Masa Manfaat (tahun)</Label>
                  <Input id="bilik-useful" type="number" min={0} step={1} value={bilikForm.usefulLife} onChange={(e) => setBilikForm({ ...bilikForm, usefulLife: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="bilik-notes" className="text-xs">Catatan</Label>
                  <Textarea id="bilik-notes" value={bilikForm.notes} onChange={(e) => setBilikForm({ ...bilikForm, notes: e.target.value })} placeholder="Catatan tambahan" rows={2} />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingLemari ? 'Edit Lemari' : 'Tambah Lemari'}</DialogTitle>
            <DialogDescription>{editingLemari ? 'Perbarui data lemari' : 'Isi data lemari baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lemari-number">Nomor Lemari *</Label>
              <Input id="lemari-number" value={lemariForm.number} onChange={(e) => setLemariForm({ ...lemariForm, number: e.target.value })} placeholder="Nomor lemari" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-bilik">Bilik (opsional)</Label>
              <Select value={lemariForm.bilikId || '__none__'} onValueChange={(v) => setLemariForm({ ...lemariForm, bilikId: v === '__none__' ? '' : v })}>
                <SelectTrigger id="lemari-bilik">
                  <SelectValue placeholder="Lemari berdiri langsung di ruang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Langsung di Ruang (tanpa bilik) —</SelectItem>
                  {currentRoom?.biliks?.map((bilik) => (
                    <SelectItem key={bilik.id} value={bilik.id}>
                      Bilik {bilik.name}{bilik.number ? ` (${bilik.number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pilih bilik jika lemari berada di dalam bilik tertentu.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-condition">Keadaan</Label>
              <Select value={lemariForm.condition} onValueChange={(val) => setLemariForm({ ...lemariForm, condition: val })}>
                <SelectTrigger id="lemari-condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-year">Tahun Perolehan</Label>
              <Input id="lemari-year" type="number" min={1900} max={2100} value={lemariForm.acquisitionYear} onChange={(e) => setLemariForm({ ...lemariForm, acquisitionYear: e.target.value })} placeholder="Misal: 2020" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-price">Nilai Perolehan (Rp)</Label>
              <CurrencyInput id="lemari-price" value={lemariForm.acquisitionPrice} onChange={(val) => setLemariForm({ ...lemariForm, acquisitionPrice: val })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lemari-sumber">Sumber Dana</Label>
              <MasterCombobox
                id="lemari-sumber"
                category="sumberDana"
                value={lemariForm.sumberDana}
                onChange={(val) => setLemariForm({ ...lemariForm, sumberDana: val })}
                placeholder="Pilih sumber dana"
              />
            </div>
            {/* Dimensi Fisik */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Dimensi Fisik</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lemari-length" className="text-xs">Panjang (m)</Label>
                  <Input id="lemari-length" type="number" min={0} step="any" value={lemariForm.length} onChange={(e) => setLemariForm({ ...lemariForm, length: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-width" className="text-xs">Lebar (m)</Label>
                  <Input id="lemari-width" type="number" min={0} step="any" value={lemariForm.width} onChange={(e) => setLemariForm({ ...lemariForm, width: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-height" className="text-xs">Tinggi (m)</Label>
                  <Input id="lemari-height" type="number" min={0} step="any" value={lemariForm.height} onChange={(e) => setLemariForm({ ...lemariForm, height: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-area" className="text-xs">Luas (m²)</Label>
                  <Input id="lemari-area" type="number" min={0} step="any" value={lemariForm.area} onChange={(e) => setLemariForm({ ...lemariForm, area: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-volume" className="text-xs">Volume (m³)</Label>
                  <Input id="lemari-volume" type="number" min={0} step="any" value={lemariForm.volume} onChange={(e) => setLemariForm({ ...lemariForm, volume: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>
            {/* Metadata Aset */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Metadata Aset</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lemari-reg" className="text-xs">No. Registrasi / Kode Aset</Label>
                  <Input id="lemari-reg" value={lemariForm.registrationNumber} onChange={(e) => setLemariForm({ ...lemariForm, registrationNumber: e.target.value })} placeholder="Misal: L.001" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-doc" className="text-xs">No. Dokumen Perolehan</Label>
                  <Input id="lemari-doc" value={lemariForm.documentNumber} onChange={(e) => setLemariForm({ ...lemariForm, documentNumber: e.target.value })} placeholder="Misal: 123/ABC/2024" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-pj" className="text-xs">Penanggung Jawab</Label>
                  <Input id="lemari-pj" value={lemariForm.responsiblePerson} onChange={(e) => setLemariForm({ ...lemariForm, responsiblePerson: e.target.value })} placeholder="Nama penanggung jawab" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lemari-useful" className="text-xs">Masa Manfaat (tahun)</Label>
                  <Input id="lemari-useful" type="number" min={0} step={1} value={lemariForm.usefulLife} onChange={(e) => setLemariForm({ ...lemariForm, usefulLife: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="lemari-notes" className="text-xs">Catatan</Label>
                  <Textarea id="lemari-notes" value={lemariForm.notes} onChange={(e) => setLemariForm({ ...lemariForm, notes: e.target.value })} placeholder="Catatan tambahan" rows={2} />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
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
        <DialogContent className="sm:max-w-4xl">
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Barang' : 'Tambah Barang'}</DialogTitle>
            <DialogDescription>{editingItem ? 'Perbarui data barang' : 'Isi data barang baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
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
                id="item-brand"
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
                id="item-unit"
                category="satuan"
                value={itemForm.unit}
                onChange={(val) => setItemForm({ ...itemForm, unit: val })}
                placeholder="Satuan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Harga (Rp)</Label>
              <CurrencyInput id="item-price" value={itemForm.price} onChange={(val) => setItemForm({ ...itemForm, price: val })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-sumber-dana">Sumber Dana</Label>
              <MasterCombobox
                id="item-sumber-dana"
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
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
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
    </PageContainer>
  )
}
