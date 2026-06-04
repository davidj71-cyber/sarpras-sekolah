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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ClipboardList,
  Printer,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint, formatNumberPrint } from '@/lib/print-utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const kibLabels: Record<string, string> = {
  A: 'Tanah',
  B: 'Peralatan & Mesin',
  C: 'Gedung & Bangunan',
  D: 'Jalan, Irigasi & Jaringan',
  E: 'Aset Tetap Lainnya',
  F: 'Konstruksi Dalam Pengerjaan',
}

const conditionOptions = ['Baik', 'Rusak Ringan', 'Rusak Berat'] as const

// ─── Types ───────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  building: string
  floor: string
}

interface Item {
  id: string
  name: string
  kibType: string
  registrationNumber: string
  brand: string
  model: string
  serialNumber: string
  material: string
  yearMade: number | null
  size: string
  condition: string
  quantity: number
  unit: string
  origin: string
  price: number
  acquisitionYear: number | null
  notes: string
  roomId: string | null
  bilikId: string | null
  lemariId: string | null
  landCertificate: string
  landArea: number
  landStatus: string
  landUsage: string
  buildingLevel: string
  buildingConcrete: string
  buildingArea: number
  buildingLocation: string
  roadLength: number
  roadWidth: number
  roadArea: number
  roadLocation: string
  contractNumber: string
  implementationYear: number | null
  room: Room | null
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  registrationNumber: string
  condition: string
  quantity: number
  unit: string
  origin: string
  price: number
  acquisitionYear: number | ''
  notes: string
  roomId: string
  brand: string
  model: string
  serialNumber: string
  material: string
  yearMade: number | ''
  size: string
  landCertificate: string
  landArea: number | ''
  landStatus: string
  landUsage: string
  buildingLevel: string
  buildingConcrete: string
  buildingArea: number | ''
  buildingLocation: string
  roadLength: number | ''
  roadWidth: number | ''
  roadArea: number | ''
  roadLocation: string
  contractNumber: string
  implementationYear: number | ''
}

const emptyFormData: FormData = {
  name: '',
  registrationNumber: '',
  condition: 'Baik',
  quantity: 1,
  unit: 'Unit',
  origin: '',
  price: 0,
  acquisitionYear: '',
  notes: '',
  roomId: '',
  brand: '',
  model: '',
  serialNumber: '',
  material: '',
  yearMade: '',
  size: '',
  landCertificate: '',
  landArea: '',
  landStatus: '',
  landUsage: '',
  buildingLevel: '',
  buildingConcrete: '',
  buildingArea: '',
  buildingLocation: '',
  roadLength: '',
  roadWidth: '',
  roadArea: '',
  roadLocation: '',
  contractNumber: '',
  implementationYear: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function conditionBadgeVariant(condition: string): 'default' | 'secondary' | 'destructive' {
  switch (condition) {
    case 'Baik':
      return 'default'
    case 'Rusak Ringan':
      return 'secondary'
    case 'Rusak Berat':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// Table column definitions per KIB type
type ColumnDef = { key: string; label: string; className?: string }

function getColumns(kibType: string): ColumnDef[] {
  const base: ColumnDef[] = [
    { key: 'no', label: 'No', className: 'w-[50px]' },
    { key: 'registrationNumber', label: 'No. Register' },
    { key: 'name', label: 'Nama Barang' },
  ]

  const specific: Record<string, ColumnDef[]> = {
    A: [
      { key: 'landCertificate', label: 'Sertifikat' },
      { key: 'landArea', label: 'Luas (m²)' },
      { key: 'landStatus', label: 'Status' },
      { key: 'landUsage', label: 'Penggunaan' },
      { key: 'price', label: 'Harga' },
    ],
    B: [
      { key: 'brand', label: 'Merk' },
      { key: 'model', label: 'Model' },
      { key: 'serialNumber', label: 'No. Seri' },
      { key: 'quantity', label: 'Jumlah' },
      { key: 'condition', label: 'Kondisi' },
      { key: 'price', label: 'Harga' },
    ],
    C: [
      { key: 'buildingLevel', label: 'Tingkat' },
      { key: 'buildingConcrete', label: 'Beton' },
      { key: 'buildingArea', label: 'Luas (m²)' },
      { key: 'buildingLocation', label: 'Letak' },
      { key: 'price', label: 'Harga' },
    ],
    D: [
      { key: 'roadLength', label: 'Panjang (km)' },
      { key: 'roadWidth', label: 'Lebar (m)' },
      { key: 'roadArea', label: 'Luas (m²)' },
      { key: 'roadLocation', label: 'Letak' },
      { key: 'price', label: 'Harga' },
    ],
    E: [
      { key: 'quantity', label: 'Jumlah' },
      { key: 'condition', label: 'Kondisi' },
      { key: 'price', label: 'Harga' },
    ],
    F: [
      { key: 'contractNumber', label: 'No. Kontrak' },
      { key: 'implementationYear', label: 'Tahun Pelaksanaan' },
      { key: 'price', label: 'Harga' },
    ],
  }

  return [...base, ...(specific[kibType] || []), { key: 'actions', label: 'Aksi', className: 'w-[100px]' }]
}

// Print columns (same as getColumns but without actions)
function getPrintColumns(kibType: string): ColumnDef[] {
  const base: ColumnDef[] = [
    { key: 'no', label: 'No' },
    { key: 'registrationNumber', label: 'No. Register' },
    { key: 'name', label: 'Nama Barang' },
  ]

  const specific: Record<string, ColumnDef[]> = {
    A: [
      { key: 'landCertificate', label: 'Sertifikat' },
      { key: 'landArea', label: 'Luas (m²)' },
      { key: 'landStatus', label: 'Status' },
      { key: 'landUsage', label: 'Penggunaan' },
      { key: 'price', label: 'Harga' },
    ],
    B: [
      { key: 'brand', label: 'Merk' },
      { key: 'model', label: 'Model' },
      { key: 'serialNumber', label: 'No. Seri' },
      { key: 'quantity', label: 'Jumlah' },
      { key: 'condition', label: 'Kondisi' },
      { key: 'price', label: 'Harga' },
    ],
    C: [
      { key: 'buildingLevel', label: 'Tingkat' },
      { key: 'buildingConcrete', label: 'Beton' },
      { key: 'buildingArea', label: 'Luas (m²)' },
      { key: 'buildingLocation', label: 'Letak' },
      { key: 'price', label: 'Harga' },
    ],
    D: [
      { key: 'roadLength', label: 'Panjang (km)' },
      { key: 'roadWidth', label: 'Lebar (m)' },
      { key: 'roadArea', label: 'Luas (m²)' },
      { key: 'roadLocation', label: 'Letak' },
      { key: 'price', label: 'Harga' },
    ],
    E: [
      { key: 'quantity', label: 'Jumlah' },
      { key: 'condition', label: 'Kondisi' },
      { key: 'price', label: 'Harga' },
    ],
    F: [
      { key: 'contractNumber', label: 'No. Kontrak' },
      { key: 'implementationYear', label: 'Tahun Pelaksanaan' },
      { key: 'price', label: 'Harga' },
    ],
  }

  return [...base, ...(specific[kibType] || [])]
}

// Get plain text value for print cell
function getPrintCellValue(item: Item, col: ColumnDef, idx: number): string {
  switch (col.key) {
    case 'no':
      return String(idx + 1)
    case 'price':
      return formatRupiahPrint(item.price)
    case 'landArea':
    case 'buildingArea':
    case 'roadArea':
      return item[col.key] ? `${formatNumberPrint(item[col.key] as number)} m²` : '-'
    case 'roadLength':
      return item.roadLength ? `${formatNumberPrint(item.roadLength)} km` : '-'
    case 'roadWidth':
      return item.roadWidth ? `${formatNumberPrint(item.roadWidth)} m` : '-'
    case 'quantity':
      return `${formatNumberPrint(item.quantity)} ${item.unit}`
    case 'implementationYear':
      return item.implementationYear ? String(item.implementationYear) : '-'
    case 'condition':
      return item.condition || '-'
    default: {
      const value = (item as Record<string, unknown>)[col.key]
      return value ? String(value) : '-'
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KibPage() {
  const { kibType, setKibType } = useNavigationStore()
  const label = kibLabels[kibType] || 'Peralatan & Mesin'

  const [items, setItems] = useState<Item[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyFormData })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch items ─────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/items?kibType=${kibType}`)
      if (!res.ok) throw new Error('Gagal mengambil data')
      const data = await res.json()
      setItems(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data barang', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [kibType])

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms')
      if (!res.ok) return
      const data = await res.json()
      setRooms(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // ─── Form handlers ───────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingItem(null)
    setFormData({ ...emptyFormData })
    setDialogOpen(true)
  }

  function openEditDialog(item: Item) {
    setEditingItem(item)
    setFormData({
      name: item.name,
      registrationNumber: item.registrationNumber,
      condition: item.condition,
      quantity: item.quantity,
      unit: item.unit,
      origin: item.origin,
      price: item.price,
      acquisitionYear: item.acquisitionYear ?? '',
      notes: item.notes,
      roomId: item.roomId ?? '',
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      material: item.material,
      yearMade: item.yearMade ?? '',
      size: item.size,
      landCertificate: item.landCertificate,
      landArea: item.landArea || '',
      landStatus: item.landStatus,
      landUsage: item.landUsage,
      buildingLevel: item.buildingLevel,
      buildingConcrete: item.buildingConcrete,
      buildingArea: item.buildingArea || '',
      buildingLocation: item.buildingLocation,
      roadLength: item.roadLength || '',
      roadWidth: item.roadWidth || '',
      roadArea: item.roadArea || '',
      roadLocation: item.roadLocation,
      contractNumber: item.contractNumber,
      implementationYear: item.implementationYear ?? '',
    })
    setDialogOpen(true)
  }

  function handleFieldChange(field: keyof FormData, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama barang wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        ...formData,
        kibType,
        quantity: Number(formData.quantity) || 1,
        price: Number(formData.price) || 0,
        acquisitionYear: formData.acquisitionYear ? Number(formData.acquisitionYear) : null,
        yearMade: formData.yearMade ? Number(formData.yearMade) : null,
        landArea: formData.landArea ? Number(formData.landArea) : 0,
        buildingArea: formData.buildingArea ? Number(formData.buildingArea) : 0,
        roadLength: formData.roadLength ? Number(formData.roadLength) : 0,
        roadWidth: formData.roadWidth ? Number(formData.roadWidth) : 0,
        roadArea: formData.roadArea ? Number(formData.roadArea) : 0,
        implementationYear: formData.implementationYear ? Number(formData.implementationYear) : null,
        roomId: formData.roomId || null,
      }

      if (editingItem) {
        const res = await fetch(`/api/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Gagal memperbarui')
        toast({ title: 'Berhasil', description: 'Barang berhasil diperbarui' })
      } else {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Gagal membuat')
        toast({ title: 'Berhasil', description: 'Barang berhasil ditambahkan' })
      }

      setDialogOpen(false)
      fetchItems()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data barang', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/items/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      toast({ title: 'Berhasil', description: 'Barang berhasil dihapus' })
      fetchItems()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus barang', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  // ─── Filtered items ──────────────────────────────────────────────────────

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      item.registrationNumber.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      item.serialNumber?.toLowerCase().includes(q)
    )
  })

  // ─── Render cell ─────────────────────────────────────────────────────────

  function renderCell(item: Item, col: ColumnDef, idx: number) {
    switch (col.key) {
      case 'no':
        return idx + 1
      case 'price':
        return formatRupiah(item.price)
      case 'condition':
        return (
          <Badge variant={conditionBadgeVariant(item.condition)}>
            {item.condition}
          </Badge>
        )
      case 'landArea':
      case 'buildingArea':
      case 'roadArea':
        return item[col.key] ? `${item[col.key]} m²` : '-'
      case 'roadLength':
        return item.roadLength ? `${item.roadLength} km` : '-'
      case 'roadWidth':
        return item.roadWidth ? `${item.roadWidth} m` : '-'
      case 'quantity':
        return `${item.quantity} ${item.unit}`
      case 'implementationYear':
        return item.implementationYear ?? '-'
      case 'actions':
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => openEditDialog(item)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => {
                setDeleteId(item.id)
                setDeleteName(item.name)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      default: {
        const value = (item as Record<string, unknown>)[col.key]
        return value ? String(value) : '-'
      }
    }
  }

  // ─── Form fields per KIB type ────────────────────────────────────────────

  function renderCommonFields() {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nama Barang *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Masukkan nama barang"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Nomor Register</Label>
            <Input
              id="registrationNumber"
              value={formData.registrationNumber}
              onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
              placeholder="No. Register"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Kondisi</Label>
            <Select
              value={formData.condition}
              onValueChange={(val) => handleFieldChange('condition', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kondisi" />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Jumlah</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => handleFieldChange('quantity', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Satuan</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => handleFieldChange('unit', e.target.value)}
              placeholder="Satuan"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin">Asal Usul</Label>
            <Input
              id="origin"
              value={formData.origin}
              onChange={(e) => handleFieldChange('origin', e.target.value)}
              placeholder="Asal usul barang"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Harga (Rp)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={formData.price}
              onChange={(e) => handleFieldChange('price', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionYear">Tahun Perolehan</Label>
            <Input
              id="acquisitionYear"
              type="number"
              value={formData.acquisitionYear}
              onChange={(e) => handleFieldChange('acquisitionYear', e.target.value)}
              placeholder="Tahun"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomId">Lokasi (Ruangan)</Label>
            <Select
              value={formData.roomId}
              onValueChange={(val) => handleFieldChange('roomId', val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih ruangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tidak ada</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}{room.building ? ` - ${room.building}` : ''}{room.floor ? ` Lantai ${room.floor}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Keterangan</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Keterangan tambahan"
              rows={2}
            />
          </div>
        </div>
      </>
    )
  }

  function renderKibAFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="landCertificate">Sertifikat</Label>
          <Input
            id="landCertificate"
            value={formData.landCertificate}
            onChange={(e) => handleFieldChange('landCertificate', e.target.value)}
            placeholder="Nomor sertifikat"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landArea">Luas (m²)</Label>
          <Input
            id="landArea"
            type="number"
            min={0}
            value={formData.landArea}
            onChange={(e) => handleFieldChange('landArea', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landStatus">Status Tanah</Label>
          <Input
            id="landStatus"
            value={formData.landStatus}
            onChange={(e) => handleFieldChange('landStatus', e.target.value)}
            placeholder="Status tanah"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landUsage">Penggunaan</Label>
          <Input
            id="landUsage"
            value={formData.landUsage}
            onChange={(e) => handleFieldChange('landUsage', e.target.value)}
            placeholder="Penggunaan tanah"
          />
        </div>
      </div>
    )
  }

  function renderKibBFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="brand">Merk</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => handleFieldChange('brand', e.target.value)}
            placeholder="Merk barang"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            placeholder="Model barang"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">No. Seri Pabrik</Label>
          <Input
            id="serialNumber"
            value={formData.serialNumber}
            onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
            placeholder="Nomor seri"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="material">Bahan</Label>
          <Input
            id="material"
            value={formData.material}
            onChange={(e) => handleFieldChange('material', e.target.value)}
            placeholder="Bahan"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearMade">Tahun Pembuatan</Label>
          <Input
            id="yearMade"
            type="number"
            value={formData.yearMade}
            onChange={(e) => handleFieldChange('yearMade', e.target.value)}
            placeholder="Tahun"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">Ukuran</Label>
          <Input
            id="size"
            value={formData.size}
            onChange={(e) => handleFieldChange('size', e.target.value)}
            placeholder="Ukuran"
          />
        </div>
      </div>
    )
  }

  function renderKibCFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="buildingLevel">Tingkat</Label>
          <Input
            id="buildingLevel"
            value={formData.buildingLevel}
            onChange={(e) => handleFieldChange('buildingLevel', e.target.value)}
            placeholder="Jumlah tingkat"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buildingConcrete">Beton</Label>
          <Input
            id="buildingConcrete"
            value={formData.buildingConcrete}
            onChange={(e) => handleFieldChange('buildingConcrete', e.target.value)}
            placeholder="Beton"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buildingArea">Luas (m²)</Label>
          <Input
            id="buildingArea"
            type="number"
            min={0}
            value={formData.buildingArea}
            onChange={(e) => handleFieldChange('buildingArea', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buildingLocation">Letak</Label>
          <Input
            id="buildingLocation"
            value={formData.buildingLocation}
            onChange={(e) => handleFieldChange('buildingLocation', e.target.value)}
            placeholder="Letak bangunan"
          />
        </div>
      </div>
    )
  }

  function renderKibDFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="roadLength">Panjang (km)</Label>
          <Input
            id="roadLength"
            type="number"
            min={0}
            value={formData.roadLength}
            onChange={(e) => handleFieldChange('roadLength', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadWidth">Lebar (m)</Label>
          <Input
            id="roadWidth"
            type="number"
            min={0}
            value={formData.roadWidth}
            onChange={(e) => handleFieldChange('roadWidth', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadArea">Luas (m²)</Label>
          <Input
            id="roadArea"
            type="number"
            min={0}
            value={formData.roadArea}
            onChange={(e) => handleFieldChange('roadArea', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadLocation">Letak</Label>
          <Input
            id="roadLocation"
            value={formData.roadLocation}
            onChange={(e) => handleFieldChange('roadLocation', e.target.value)}
            placeholder="Letak"
          />
        </div>
      </div>
    )
  }

  function renderKibEFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="brand">Merk</Label>
          <Input
            id="brand-e"
            value={formData.brand}
            onChange={(e) => handleFieldChange('brand', e.target.value)}
            placeholder="Merk barang"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model-e"
            value={formData.model}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            placeholder="Model barang"
          />
        </div>
      </div>
    )
  }

  function renderKibFFields() {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="contractNumber">Nomor Kontrak</Label>
          <Input
            id="contractNumber"
            value={formData.contractNumber}
            onChange={(e) => handleFieldChange('contractNumber', e.target.value)}
            placeholder="Nomor kontrak"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="implementationYear">Tahun Pelaksanaan</Label>
          <Input
            id="implementationYear"
            type="number"
            value={formData.implementationYear}
            onChange={(e) => handleFieldChange('implementationYear', e.target.value)}
            placeholder="Tahun"
          />
        </div>
      </div>
    )
  }

  function renderTypeSpecificFields() {
    switch (kibType) {
      case 'A': return renderKibAFields()
      case 'B': return renderKibBFields()
      case 'C': return renderKibCFields()
      case 'D': return renderKibDFields()
      case 'E': return renderKibEFields()
      case 'F': return renderKibFFields()
      default: return null
    }
  }

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns = getColumns(kibType)

  // ─── Total price ─────────────────────────────────────────────────────────

  const totalPrice = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // ─── Print handler ───────────────────────────────────────────────────────

  async function handlePrint() {
    const printCols = getPrintColumns(kibType)
    const title = `KARTU INVENTARIS BARANG (KIB ${kibType}) - ${label}`

    // Build table header
    const headerCells = printCols.map(col => `<th>${col.label}</th>`).join('')

    // Build table rows
    const rows = filteredItems.map((item, idx) => {
      const cells = printCols.map(col => {
        const value = getPrintCellValue(item, col, idx)
        const align = col.key === 'price' || col.key === 'quantity' || col.key === 'no'
          ? 'text-center'
          : col.key === 'landArea' || col.key === 'buildingArea' || col.key === 'roadArea' || col.key === 'roadLength' || col.key === 'roadWidth'
            ? 'text-right'
            : ''
        return `<td class="${align}">${value}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    }).join('')

    // Summary row: calculate column spans
    const totalCols = printCols.length
    const priceColIdx = printCols.findIndex(c => c.key === 'price')
    // Fill cells before price column with empty/spans
    let summaryBeforePrice = ''
    if (priceColIdx > 0) {
      summaryBeforePrice = `<td colspan="${priceColIdx}" class="font-bold text-right">Total (${filteredItems.length} barang)</td>`
    } else {
      // Fallback: just put in first cell
      summaryBeforePrice = `<td class="font-bold">Total (${filteredItems.length} barang)</td>`
    }
    // Fill any cells between priceColIdx+1 and totalCols
    const afterPriceCount = totalCols - priceColIdx - 1
    const afterPriceCells = afterPriceCount > 0
      ? `<td colspan="${afterPriceCount}"></td>`
      : ''

    const summaryRow = priceColIdx >= 0
      ? `<tr style="background-color: #f0f0f0;">${summaryBeforePrice}<td class="font-bold text-right">${formatRupiahPrint(totalPrice)}</td>${afterPriceCells}</tr>`
      : `<tr style="background-color: #f0f0f0;"><td colspan="${totalCols}" class="font-bold">Total: ${filteredItems.length} barang | ${formatRupiahPrint(totalPrice)}</td></tr>`

    const contentHtml = `
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${rows}
          ${summaryRow}
        </tbody>
      </table>
    `

    await printWithKop(title, contentHtml)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            KIB {kibType} - {label}
          </h2>
          <p className="text-muted-foreground">
            Manajemen Kartu Inventaris Barang - KIB {kibType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={filteredItems.length === 0}>
            <Printer className="size-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="size-4 mr-2" />
            Tambah Barang
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              <div>
                <CardTitle>KIB {kibType} - {label}</CardTitle>
                <CardDescription>
                  Kelola data inventaris barang untuk KIB {kibType} ({label})
                </CardDescription>
              </div>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">
                {search
                  ? 'Tidak ditemukan barang yang sesuai dengan pencarian'
                  : `Klik "Tambah Barang" untuk menambahkan data KIB ${kibType}`}
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key} className={col.className}>
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        {columns.map((col) => (
                          <TableCell key={col.key} className={col.className}>
                            {renderCell(item, col, idx)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                <span>
                  Total {filteredItems.length} barang
                </span>
                <span className="font-semibold text-foreground">
                  Total Harga: {formatRupiah(totalPrice)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Barang' : 'Tambah Barang'} - KIB {kibType} ({label})
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Perbarui data barang inventaris'
                : 'Isi data barang inventaris baru'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {renderCommonFields()}
              {renderTypeSpecificFields()}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null)
            setDeleteName('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus barang{' '}
              <span className="font-semibold">{deleteName}</span>? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
