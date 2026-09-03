'use client'

// ─── Galon Page ──────────────────────────────────────────────────────────────
// Sub-menu Toko. Catatan penerimaan & pembayaran galon (Cash/Bon).
//
// Field (sesuai permintaan user):
//   1. Galon kosong       (emptyCount)   — jumlah galon kosong diterima
//   2. Galon di isi       (filledCount)  — jumlah galon isi ditukar/diterima
//   3. Toko               (storeId)      — relasi ke Store, dropdown
//   4. Pengantar/Penandatangan (courier) — siapa yang mengantar
//   5. Penerima           (recipient)    — nama media/penerima galon
//   6. Tanggal terima     (receivedDate) — tanggal galon diterima
//   7. Cash atau Bon      (paymentMethod)— Cash = langsung lunas, Bon = utang
//   8. Tanggal bayar      (paidAt)       — otomatis = tanggal terima jika Cash;
//                                           diisi manual saat Bon dilunasi.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PageHeader,
  PageContainer,
} from '@/components/ui/page-header'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Droplet,
  CheckCircle2,
  XCircle,
  Calendar,
  Printer,
  FileSpreadsheet,
  Camera,
} from 'lucide-react'
import { resizeImageFile } from '@/lib/resize-image'
import { printWithKop, sanitizeFilename, type PrintOrientation } from '@/lib/print-utils'
import { exportToExcel, getSchoolMeta } from '@/lib/export-excel'

interface StoreOption {
  id: string
  name: string
}

interface GalonData {
  id: string
  emptyCount: number
  filledCount: number
  storeId: string | null
  storeName: string
  store?: { id: string; name: string } | null
  courier: string
  recipient: string
  receivedDate: string
  paymentMethod: string
  paymentStatus: string
  paidAt: string | null
  deliveryPhotos: string // JSON array of base64 data URLs
  notes: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  emptyCount: string
  filledCount: string
  storeId: string
  courier: string
  recipient: string
  receivedDate: string
  paymentMethod: string
  paidAt: string
  notes: string
  deliveryPhotos: string[] // base64 data URLs
}

const emptyForm: FormData = {
  emptyCount: '0',
  filledCount: '0',
  storeId: '',
  courier: '',
  recipient: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Cash',
  paidAt: '',
  notes: '',
  deliveryPhotos: [],
}

// Photo upload config
const MAX_DELIVERY_PHOTOS = 5
const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10 MB input file limit
const PHOTO_MAX_DIMENSION = 1024
const PHOTO_QUALITY = 0.85

function formatDateShort(s: string | null): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

export function GalonPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<GalonData[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GalonData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLabel, setDeleteLabel] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Filter
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Mark-as-paid dialog
  const [payEntry, setPayEntry] = useState<GalonData | null>(null)
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [paying, setPaying] = useState(false)

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0)

  // Print state
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printing, setPrinting] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/galon')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setEntries(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat data galon', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/stores')
      if (!res.ok) return
      const data = await res.json()
      setStores(data.map((s: StoreOption) => ({ id: s.id, name: s.name })))
    } catch {
      // ignore — toko opsional
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchStores()
  }, [fetchEntries, fetchStores])

  // Filtered list
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase().trim()
      const matchSearch = !q
        || e.storeName.toLowerCase().includes(q)
        || e.courier.toLowerCase().includes(q)
        || e.recipient.toLowerCase().includes(q)
        || e.notes.toLowerCase().includes(q)
      const matchMethod = methodFilter === 'all' || e.paymentMethod === methodFilter
      const matchStatus = statusFilter === 'all' || e.paymentStatus === statusFilter
      return matchSearch && matchMethod && matchStatus
    })
  }, [entries, search, methodFilter, statusFilter])

  // Stats
  const stats = useMemo(() => {
    const totalEmpty = entries.reduce((s, e) => s + e.emptyCount, 0)
    const totalFilled = entries.reduce((s, e) => s + e.filledCount, 0)
    const totalBon = entries
      .filter((e) => e.paymentMethod === 'Bon')
      .reduce((s, e) => s + e.emptyCount + e.filledCount, 0)
    const totalUnpaid = entries.filter((e) => e.paymentStatus === 'BELUM_BAYAR').length
    return { totalEmpty, totalFilled, totalBon, totalUnpaid }
  }, [entries])

  function openAddDialog() {
    setEditing(null)
    setFormData({ ...emptyForm, receivedDate: new Date().toISOString().slice(0, 10), deliveryPhotos: [] })
    setDialogOpen(true)
  }

  function openEditDialog(entry: GalonData) {
    setEditing(entry)
    let photos: string[] = []
    try {
      const parsed = JSON.parse(entry.deliveryPhotos || '[]')
      if (Array.isArray(parsed)) {
        photos = parsed.filter((p: unknown) => typeof p === 'string')
      }
    } catch {
      // ignore
    }
    setFormData({
      emptyCount: String(entry.emptyCount),
      filledCount: String(entry.filledCount),
      storeId: entry.storeId || '',
      courier: entry.courier,
      recipient: entry.recipient,
      receivedDate: new Date(entry.receivedDate).toISOString().slice(0, 10),
      paymentMethod: entry.paymentMethod,
      paidAt: entry.paidAt ? new Date(entry.paidAt).toISOString().slice(0, 10) : '',
      notes: entry.notes,
      deliveryPhotos: photos,
    })
    setDialogOpen(true)
  }

  // ── Photo upload handlers ─────────────────────────────────────────────────
  async function handlePhotoUpload(files: FileList, source: 'file' | 'camera') {
    if (formData.deliveryPhotos.length + files.length > MAX_DELIVERY_PHOTOS) {
      toast({
        title: 'Batas Foto Tercapai',
        description: `Maksimal ${MAX_DELIVERY_PHOTOS} foto. Saat ini sudah ada ${formData.deliveryPhotos.length} foto.`,
        variant: 'destructive',
      })
      // Reset input value supaya user bisa re-upload file yang sama
      if (source === 'file' && fileInputRef.current) fileInputRef.current.value = ''
      if (source === 'camera' && cameraInputRef.current) cameraInputRef.current.value = ''
      return
    }

    setPhotoUploading(true)
    const newPhotos: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: bukan gambar`)
        continue
      }
      // Maks 10MB per foto (input file, sebelum resize)
      if (file.size > MAX_PHOTO_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        errors.push(`${file.name}: ${sizeMB}MB (maks 10MB)`)
        continue
      }
      if (file.size === 0) {
        errors.push(`${file.name}: file kosong`)
        continue
      }
      try {
        const { dataUrl } = await resizeImageFile(file, PHOTO_MAX_DIMENSION, PHOTO_QUALITY)
        newPhotos.push(dataUrl)
      } catch {
        errors.push(`${file.name}: gagal diproses`)
      }
    }

    if (newPhotos.length > 0) {
      setFormData((d) => ({ ...d, deliveryPhotos: [...d.deliveryPhotos, ...newPhotos] }))
      toast({
        title: 'Foto ditambahkan',
        description: `${newPhotos.length} foto bukti pengantaran ditambahkan`,
      })
    }
    if (errors.length > 0) {
      toast({
        title: 'Beberapa foto gagal',
        description: errors.join('; '),
        variant: 'destructive',
      })
    }

    // Reset input value supaya user bisa re-upload file yang sama
    if (source === 'file' && fileInputRef.current) fileInputRef.current.value = ''
    if (source === 'camera' && cameraInputRef.current) cameraInputRef.current.value = ''
    setPhotoUploading(false)
  }

  function removePhoto(idx: number) {
    setFormData((d) => ({
      ...d,
      deliveryPhotos: d.deliveryPhotos.filter((_, i) => i !== idx),
    }))
  }

  // ── Print Laporan ──────────────────────────────────────────────────────────
  async function handlePrint(orientation: PrintOrientation = 'landscape') {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data galon untuk dicetak' })
      return
    }

    setPrinting(true)
    try {
      // Build table rows
      const rowsHtml = filteredEntries
        .map((e, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${e.emptyCount > 0 ? e.emptyCount : '-'}</td>
            <td class="text-center">${e.filledCount > 0 ? e.filledCount : '-'}</td>
            <td>${e.storeName || e.store?.name || '-'}</td>
            <td>${e.courier || '-'}</td>
            <td>${e.recipient}</td>
            <td class="text-center">${formatDateShort(e.receivedDate)}</td>
            <td class="text-center">${e.paymentMethod}</td>
            <td class="text-center">${e.paymentStatus === 'LUNAS' ? 'Lunas' : 'Belum'}</td>
            <td class="text-center">${formatDateShort(e.paidAt)}</td>
            <td>${e.notes || '-'}</td>
          </tr>
        `)
        .join('')

      const totalEmpty = filteredEntries.reduce((s, e) => s + e.emptyCount, 0)
      const totalFilled = filteredEntries.reduce((s, e) => s + e.filledCount, 0)
      const totalCash = filteredEntries.filter((e) => e.paymentMethod === 'Cash').length
      const totalBon = filteredEntries.filter((e) => e.paymentMethod === 'Bon').length
      const totalUnpaid = filteredEntries.filter((e) => e.paymentStatus === 'BELUM_BAYAR').length

      const contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 7%;">Galon Kosong</th>
              <th style="width: 7%;">Galon Isi</th>
              <th style="width: 14%;">Toko</th>
              <th style="width: 11%;">Pengantar</th>
              <th style="width: 12%;">Penerima</th>
              <th style="width: 9%;">Tgl Terima</th>
              <th style="width: 6%;">Metode</th>
              <th style="width: 7%;">Status</th>
              <th style="width: 9%;">Tgl Bayar</th>
              <th style="width: 13%;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="margin-top: 12px; font-size: 10pt;">
          <strong>Ringkasan:</strong> ${filteredEntries.length} transaksi ·
          ${totalEmpty} galon kosong · ${totalFilled} galon isi ·
          ${totalCash} Cash · ${totalBon} Bon · ${totalUnpaid} belum lunas.
        </div>
      `

      const filename = sanitizeFilename(`Laporan_Galon_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}`)
      await printWithKop('LAPORAN PENERIMAAN & PEMBAYARAN GALON', contentHtml, orientation, {
        appendSignature: true,
        signatureOptions: {
          rightTitle: 'Bendahara',
          rightSigner: 'treasurer',
        },
      })
      // Set title for PDF filename
      if (typeof document !== 'undefined') {
        // Title is set by printWithKop via the print window's document.title
      }
      toast({ title: 'Laporan dicetak', description: `${filteredEntries.length} transaksi` })
    } catch (err) {
      console.error('Print error:', err)
      toast({ title: 'Gagal mencetak', description: 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setPrinting(false)
      setPrintDialogOpen(false)
    }
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  async function handleExportExcel() {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data galon untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      meta.push({ label: 'Total Transaksi', value: `${filteredEntries.length} entry` })
      const totalEmpty = filteredEntries.reduce((s, e) => s + e.emptyCount, 0)
      const totalFilled = filteredEntries.reduce((s, e) => s + e.filledCount, 0)
      meta.push({ label: 'Total Galon Kosong', value: String(totalEmpty) })
      meta.push({ label: 'Total Galon Isi', value: String(totalFilled) })

      await exportToExcel({
        filename: `Laporan_Galon_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Laporan Galon',
        title: 'LAPORAN PENERIMAAN & PEMBAYARAN GALON',
        meta,
        columns: [
          { header: 'No', key: (_, idx) => String(idx + 1), width: 6 },
          { header: 'Galon Kosong', key: (e) => String(e.emptyCount), width: 12 },
          { header: 'Galon Isi', key: (e) => String(e.filledCount), width: 12 },
          { header: 'Toko', key: (e) => e.storeName || e.store?.name || '-', width: 22 },
          { header: 'Pengantar/Penandatangan', key: (e) => e.courier || '-', width: 18 },
          { header: 'Penerima', key: (e) => e.recipient || '-', width: 18 },
          { header: 'Tanggal Terima', key: (e) => formatDateShort(e.receivedDate), width: 14 },
          { header: 'Metode', key: (e) => e.paymentMethod, width: 10 },
          { header: 'Status', key: (e) => e.paymentStatus === 'LUNAS' ? 'Lunas' : 'Belum Bayar', width: 12 },
          { header: 'Tanggal Bayar', key: (e) => formatDateShort(e.paidAt), width: 14 },
          { header: 'Catatan', key: (e) => e.notes || '-', width: 24 },
        ],
        data: filteredEntries,
      })
      toast({ title: 'Berhasil', description: 'Laporan galon berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  async function handleSubmit() {
    if (!formData.recipient.trim()) {
      toast({ title: 'Validasi', description: 'Penerima wajib diisi', variant: 'destructive' })
      return
    }
    if (Number(formData.emptyCount) < 0 || Number(formData.filledCount) < 0) {
      toast({ title: 'Validasi', description: 'Jumlah galon tidak boleh negatif', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        emptyCount: Number(formData.emptyCount),
        filledCount: Number(formData.filledCount),
        storeName: stores.find((s) => s.id === formData.storeId)?.name || '',
      }
      const url = editing ? `/api/galon/${editing.id}` : '/api/galon'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal menyimpan')
      }

      toast({
        title: editing ? 'Data diperbarui' : 'Data ditambahkan',
        description: `Galon ${formData.recipient} — ${formData.paymentMethod}`,
      })
      setDialogOpen(false)
      fetchEntries()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/galon/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      toast({ title: 'Dihapus', description: 'Data galon berhasil dihapus' })
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  async function handleMarkPaid() {
    if (!payEntry) return
    setPaying(true)
    try {
      const res = await fetch(`/api/galon/${payEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: payDate }),
      })
      if (!res.ok) throw new Error('Gagal menandai lunas')
      toast({
        title: 'Bon dilunasi',
        description: `Galon ${payEntry.recipient} — ${formatDateShort(payDate)}`,
      })
      setPayEntry(null)
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menandai lunas', variant: 'destructive' })
    } finally {
      setPaying(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Galon"
        description="Catatan penerimaan & pembayaran galon (Cash / Bon)"
        icon={Droplet}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => handlePrint('landscape')}
              disabled={loading || filteredEntries.length === 0 || printing}
            >
              {printing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
              Cetak PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={loading || filteredEntries.length === 0}
            >
              <FileSpreadsheet className="size-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4 mr-2" />
              Tambah Data
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Droplet className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalEmpty}</div>
                <div className="text-xs text-muted-foreground">Galon Kosong</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
                <Droplet className="size-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalFilled}</div>
                <div className="text-xs text-muted-foreground">Galon Di Isi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                <Calendar className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{entries.length}</div>
                <div className="text-xs text-muted-foreground">Total Transaksi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalUnpaid}</div>
                <div className="text-xs text-muted-foreground">Bon Belum Lunas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="size-5" />
              <div>
                <CardTitle>Daftar Galon</CardTitle>
                <CardDescription>Riwayat penerimaan & pembayaran galon</CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bon">Bon</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="LUNAS">Lunas</SelectItem>
                  <SelectItem value="BELUM_BAYAR">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari toko / pengantar / penerima..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data galon..." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={Droplet}
              title="Belum ada data"
              description={search || methodFilter !== 'all' || statusFilter !== 'all' ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Data" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] text-left">Aksi</TableHead>
                    <TableHead className="w-[60px] text-center">No</TableHead>
                    <TableHead className="text-center">Galon Kosong</TableHead>
                    <TableHead className="text-center">Galon Isi</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Pengantar</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead className="text-center">Tgl Terima</TableHead>
                    <TableHead className="text-center">Metode</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Tgl Bayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={e.id} className="h-14">
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-1">
                          {e.paymentMethod === 'Bon' && e.paymentStatus === 'BELUM_BAYAR' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              onClick={() => {
                                setPayEntry(e)
                                setPayDate(new Date().toISOString().slice(0, 10))
                              }}
                              title="Tandai lunas"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditDialog(e)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteId(e.id)
                              setDeleteLabel(`${e.recipient} (${formatDateShort(e.receivedDate)})`)
                            }}
                            title="Hapus"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{idx + 1}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {e.emptyCount > 0 ? e.emptyCount : '-'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {e.filledCount > 0 ? e.filledCount : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{e.storeName || e.store?.name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.courier || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.recipient}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">{formatDateShort(e.receivedDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={e.paymentMethod === 'Cash' ? 'secondary' : 'outline'}>
                          {e.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.paymentStatus === 'LUNAS' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">
                            <CheckCircle2 className="size-3 mr-1" />
                            Lunas
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="size-3 mr-1" />
                            Belum
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">{formatDateShort(e.paidAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add/Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplet className="size-5" />
              {editing ? 'Edit Data Galon' : 'Tambah Data Galon'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui data penerimaan galon' : 'Catat penerimaan galon baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Kuantitas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-empty">Galon Kosong</Label>
                <Input
                  id="g-empty"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={formData.emptyCount}
                  onChange={(e) => setFormData((d) => ({ ...d, emptyCount: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-filled">Galon Di Isi</Label>
                <Input
                  id="g-filled"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={formData.filledCount}
                  onChange={(e) => setFormData((d) => ({ ...d, filledCount: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </div>
            </div>

            {/* Toko + Pengantar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-store">Toko</Label>
                <Select
                  value={formData.storeId || '__none__'}
                  onValueChange={(v) => setFormData((d) => ({ ...d, storeId: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger id="g-store">
                    <SelectValue placeholder="Pilih toko (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tidak ada toko —</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-courier">Pengantar / Penandatangan</Label>
                <Input
                  id="g-courier"
                  placeholder="mis. Bapak Rahmat"
                  value={formData.courier}
                  onChange={(e) => setFormData((d) => ({ ...d, courier: e.target.value }))}
                />
              </div>
            </div>

            {/* Penerima + Tanggal Terima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-recipient">Penerima (nama media)</Label>
                <Input
                  id="g-recipient"
                  placeholder="mis. TU Sekolah / Bapak ..."
                  value={formData.recipient}
                  onChange={(e) => setFormData((d) => ({ ...d, recipient: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-received-date">Tanggal Terima</Label>
                <Input
                  id="g-received-date"
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData((d) => ({ ...d, receivedDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Metode pembayaran */}
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="g-method">Cash atau Bon</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v) => setFormData((d) => ({ ...d, paymentMethod: v }))}
                  >
                    <SelectTrigger id="g-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash (Langsung Lunas)</SelectItem>
                      <SelectItem value="Bon">Bon (Belum Bayar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.paymentMethod === 'Bon' && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="g-paid-at">Tanggal Bayar</Label>
                    <Input
                      id="g-paid-at"
                      type="date"
                      value={formData.paidAt}
                      onChange={(e) => setFormData((d) => ({ ...d, paidAt: e.target.value }))}
                      placeholder="Kosongkan jika belum lunas"
                    />
                    <p className="text-xs text-muted-foreground">
                      Kosongkan jika Bon belum dilunasi. Bisa diisi nanti lewat tombol ✓ di tabel.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Foto Bukti Pengantaran */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Foto Bukti Pengantaran (opsional)</Label>
              <p className="text-xs text-muted-foreground">
                Foto galon saat diterima/diangkut sebagai bukti. Maks {MAX_DELIVERY_PHOTOS} foto, 10MB per foto.
                Mendukung kamera Android.
              </p>
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handlePhotoUpload(e.target.files, 'file')
                  }
                }}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handlePhotoUpload(e.target.files, 'camera')
                  }
                }}
                className="hidden"
              />
              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading || formData.deliveryPhotos.length >= MAX_DELIVERY_PHOTOS}
                >
                  {photoUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                  Pilih File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={photoUploading || formData.deliveryPhotos.length >= MAX_DELIVERY_PHOTOS}
                >
                  <Camera className="size-4 mr-2" />
                  Ambil Foto
                </Button>
                {formData.deliveryPhotos.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {formData.deliveryPhotos.length} / {MAX_DELIVERY_PHOTOS} foto
                  </span>
                )}
              </div>
              {/* Photo thumbnails */}
              {formData.deliveryPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
                  {formData.deliveryPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-md border overflow-hidden bg-muted"
                    >
                      <img
                        src={photo}
                        alt={`Bukti ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setPhotoViewerIndex(idx)
                          setPhotoViewerOpen(true)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus foto"
                      >
                        <XCircle className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan */}
            <div className="grid gap-1.5">
              <Label htmlFor="g-notes">Catatan (opsional)</Label>
              <Textarea
                id="g-notes"
                placeholder="Catatan tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editing ? 'Simpan Perubahan' : 'Tambah Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteLabel('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data galon <span className="font-semibold">{deleteLabel}</span>?
              Tindakan ini tidak dapat dibatalkan.
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

      {/* ─── Mark-as-Paid Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!payEntry} onOpenChange={(open) => { if (!paying) setPayEntry(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Tandai Bon Sebagai Lunas
            </DialogTitle>
            <DialogDescription>
              {payEntry && (
                <span>
                  Galon <strong>{payEntry.recipient}</strong> ({payEntry.emptyCount + payEntry.filledCount} unit) —
                  diterima {formatDateShort(payEntry.receivedDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="g-pay-date">Tanggal Pembayaran</Label>
            <Input
              id="g-pay-date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayEntry(null)} disabled={paying}>Batal</Button>
            <Button onClick={handleMarkPaid} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700">
              {paying && <Loader2 className="size-4 mr-2 animate-spin" />}
              <CheckCircle2 className="size-4 mr-2" />
              Tandai Lunas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Photo Viewer Dialog ─────────────────────────────────────────────── */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Pratinjau Foto Bukti</DialogTitle>
          {formData.deliveryPhotos.length > 0 && (
            <div className="relative">
              <img
                src={formData.deliveryPhotos[photoViewerIndex]}
                alt={`Bukti ${photoViewerIndex + 1}`}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {/* Navigation */}
              {formData.deliveryPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhotoViewerIndex((i) => (i - 1 + formData.deliveryPhotos.length) % formData.deliveryPhotos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoViewerIndex((i) => (i + 1) % formData.deliveryPhotos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    ›
                  </button>
                </>
              )}
              {/* Counter */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
                {photoViewerIndex + 1} / {formData.deliveryPhotos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
