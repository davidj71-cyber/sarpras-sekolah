'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Search,
  Loader2,
  PackagePlus,
  Printer,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { printWithKop, formatDatePrint, fetchPrintSettings } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { exportToExcel, getSchoolMeta, type ExcelColumn } from '@/lib/export-excel'
import { PrintDialog } from '@/components/print-dialog'
import { MasterCombobox } from '@/components/ui/master-combobox'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreData {
  id: string
  name: string
  ownerName: string
  npwp: string
  phone: string
  address: string
}

interface EmployeeData {
  id: string
  name: string
  nip: string
  position: string
}

interface BarangMasukItemData {
  id: string
  itemName: string
  quantity: number
  unit: string
  condition: string
  notes: string
}

interface OrderData {
  id: string
  orderNumber: string
  orderDate: string
  storeId: string
  store?: { id: string; name: string }
  items: Array<{ itemName: string; quantity: number; unit: string }>
}

interface BarangMasukData {
  id: string
  documentNumber: string
  entryDate: string
  storeId: string | null
  employeeId: string | null
  source: string
  notes: string
  status: string
  store?: StoreData
  employee?: EmployeeData
  items?: BarangMasukItemData[]
  orderId?: string | null
  order?: OrderData | null
  senderName?: string
  storageLocation?: string
  createdAt: string
}

interface BarangMasukItemForm {
  itemName: string
  quantity: number
  unit: string
  condition: string
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Diterima: 'default',
  Ditolak: 'destructive',
}

const conditionOptions = ['Baik', 'Rusak Ringan', 'Rusak Berat']

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BarangMasukPage() {
  const { toast } = useToast()
  const [data, setData] = useState<BarangMasukData[]>([])
  const [stores, setStores] = useState<StoreData[]>([])
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<BarangMasukData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [documentNumber, setDocumentNumber] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [storeId, setStoreId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [source, setSource] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [entryStatus, setEntryStatus] = useState('Draft')
  // ── Field baru ──
  // orderId: jika di-set, auto-fill toko + items dari pesanan, sembunyikan field pengirim
  const [orderId, setOrderId] = useState('')
  // senderName: pengirim barang (hanya tampil jika BUKAN dari pesanan)
  const [senderName, setSenderName] = useState('')
  // storageLocation: tempat penyimpanan (MasterCombobox category "tempatPenyimpanan")
  const [storageLocation, setStorageLocation] = useState('')
  const [items, setItems] = useState<BarangMasukItemForm[]>([
    { itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' },
  ])

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Print dialog
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printDetailDialogOpen, setPrintDetailDialogOpen] = useState(false)
  const [printDetailRecord, setPrintDetailRecord] = useState<BarangMasukData | null>(null)

  // Status change
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusDataId, setStatusDataId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/barang-masuk')
      if (!res.ok) throw new Error('Gagal')
      const result = await res.json()
      setData(result)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data barang masuk', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchSupporting = useCallback(async () => {
    try {
      const [storeRes, empRes, orderRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/employees'),
        fetch('/api/orders'),
      ])
      if (storeRes.ok) setStores(await storeRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
      if (orderRes.ok) {
        const orderData = await orderRes.json()
        // Hanya tampilkan pesanan yang status-nya Dikirim/Diterima (sudah Final),
        // bukan Draft. Pesanan Draft belum final → belum relevan untuk barang masuk.
        // Tapi tetap tampilkan semua biar user fleksibel.
        setOrders(orderData)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => { fetchData(); fetchSupporting() }, [fetchData, fetchSupporting])

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingData(null)
    setDocumentNumber('')
    setEntryDate(new Date().toISOString().split('T')[0])
    setStoreId('')
    setEmployeeId('')
    setSource('')
    setEntryNotes('')
    setEntryStatus('Draft')
    setOrderId('')
    setSenderName('')
    setStorageLocation('')
    setItems([{ itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }])
    setDialogOpen(true)
    // Auto-generate nomor dokumen berdasarkan format dari Pengaturan
    fetch('/api/barang-masuk/generate-doc-number')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.documentNumber) {
          setDocumentNumber(data.documentNumber)
        }
      })
      .catch(() => { /* silent — user bisa input manual */ })
  }

  function openEditDialog(record: BarangMasukData) {
    setEditingData(record)
    setDocumentNumber(record.documentNumber)
    setEntryDate(record.entryDate ? new Date(record.entryDate).toISOString().split('T')[0] : '')
    setStoreId(record.storeId || '')
    setEmployeeId(record.employeeId || '')
    setSource(record.source)
    setEntryNotes(record.notes)
    setEntryStatus(record.status)
    setOrderId(record.orderId || '')
    setSenderName(record.senderName || '')
    setStorageLocation(record.storageLocation || '')
    setItems(
      record.items?.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unit: i.unit,
        condition: i.condition,
      })) || [{ itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }]
    )
    setDialogOpen(true)
  }

  // ── Handle pilih pesanan: auto-fill toko + items ──────────────────────────
  // Saat user pilih pesanan dari dropdown:
  // 1. set orderId
  // 2. auto-fill storeId dari pesanan (toko saja, tanpa pengirim)
  // 3. auto-fill items dari OrderItem pesanan
  // 4. clear senderName (pesanan sudah punya toko, tidak perlu pengirim)
  function handleSelectOrder(selectedOrderId: string) {
    setOrderId(selectedOrderId)
    if (!selectedOrderId || selectedOrderId === '__none__') {
      // Clear selection — kembali ke mode lepas (tampilkan toko + pengirim)
      setOrderId('')
      setSenderName('')
      return
    }
    const order = orders.find((o) => o.id === selectedOrderId)
    if (order) {
      // Auto-fill toko dari pesanan
      setStoreId(order.storeId)
      // Clear pengirim (pesanan sudah punya toko)
      setSenderName('')
      // Auto-fill items dari OrderItem
      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((oi) => ({
            itemName: oi.itemName,
            quantity: oi.quantity,
            unit: oi.unit || 'Unit',
            condition: 'Baik',
          }))
        )
      }
      // Auto-set source ke "Pembelian" kalau kosong
      if (!source.trim()) setSource('Pembelian')
    }
  }

  function addItemRow() {
    setItems([...items, { itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }])
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof BarangMasukItemForm, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit() {
    if (!documentNumber.trim()) {
      toast({ title: 'Validasi', description: 'Nomor dokumen wajib diisi', variant: 'destructive' })
      return
    }
    if (items.some((i) => !i.itemName.trim())) {
      toast({ title: 'Validasi', description: 'Nama barang pada setiap item wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        documentNumber,
        entryDate: entryDate || new Date().toISOString(),
        storeId: storeId || null,
        employeeId: employeeId || null,
        source,
        notes: entryNotes,
        status: entryStatus,
        orderId: orderId || null,
        senderName: orderId ? '' : senderName.trim(), // hanya jika bukan dari pesanan
        storageLocation: storageLocation.trim(),
        items: items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit,
          condition: i.condition,
          notes: '',
        })),
      }

      const url = editingData ? `/api/barang-masuk/${editingData.id}` : '/api/barang-masuk'
      const method = editingData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingData ? 'Barang masuk berhasil diperbarui' : 'Barang masuk berhasil ditambahkan' })
      setDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan barang masuk', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/barang-masuk/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Barang masuk berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus barang masuk', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  async function handleStatusChange() {
    if (!statusDataId || !newStatus) return
    try {
      const res = await fetch(`/api/barang-masuk/${statusDataId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Status barang masuk diperbarui' })
      setStatusDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  // ─── Print handlers ───────────────────────────────────────────────────────

  async function handlePrintList(orientation: PrintOrientation = 'portrait') {
    if (filteredData.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }

    const rowsHtml = filteredData.map((record, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${record.documentNumber}</td>
        <td>${record.entryDate ? formatDatePrint(record.entryDate) : '-'}</td>
        <td>${record.source || '-'}</td>
        <td>${record.store?.name || '-'}</td>
        <td class="text-center">${record.items?.length || 0}</td>
        <td class="text-center">${record.status}</td>
      </tr>
    `).join('')

    const totalItems = filteredData.reduce((sum, r) => sum + (r.items?.length || 0), 0)

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th>No. Dokumen</th>
            <th>Tanggal</th>
            <th>Sumber</th>
            <th>Toko</th>
            <th style="width: 80px;">Jumlah Item</th>
            <th style="width: 80px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total Data:</strong> ${filteredData.length} dokumen &nbsp;|&nbsp; <strong>Total Item:</strong> ${totalItems} item
      </div>
    `

    await printWithKop('DAFTAR BARANG MASUK', contentHtml, orientation, {
      appendSignature: true,
      signatureOptions: { rightTitle: 'Pengurus Barang', rightSigner: 'goodsManager' },
    })
  }

  async function handleExportExcelList() {
    if (filteredData.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      const totalItems = filteredData.reduce((sum, r) => sum + (r.items?.length || 0), 0)
      meta.push({ label: 'Total Data', value: `${filteredData.length} dokumen` })
      meta.push({ label: 'Total Item', value: `${totalItems} item` })
      const columns: ExcelColumn<BarangMasukData>[] = [
        { header: 'No', key: (record) => String(filteredData.indexOf(record) + 1), width: 6 },
        { header: 'No. Dokumen', key: (record) => record.documentNumber || '-', width: 20 },
        { header: 'Tanggal', key: (record) => record.entryDate ? formatDatePrint(record.entryDate) : '-', width: 16 },
        { header: 'Sumber', key: (record) => record.source || '-', width: 18 },
        { header: 'Toko', key: (record) => record.store?.name || '-', width: 20 },
        { header: 'Penerima', key: (record) => record.employee?.name || '-', width: 18 },
        { header: 'Jumlah Item', key: (record) => record.items?.length || 0, width: 12 },
        { header: 'Status', key: (record) => record.status || '-', width: 12 },
        { header: 'Keterangan', key: (record) => record.notes || '-', width: 24 },
      ]
      await exportToExcel({
        filename: 'Daftar_Barang_Masuk.xlsx',
        sheetName: 'Barang Masuk',
        title: 'DAFTAR BARANG MASUK',
        meta,
        columns,
        data: filteredData,
      })
      toast({ title: 'Berhasil', description: 'Data barang masuk berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  async function handleExportExcelDetail(record: BarangMasukData) {
    try {
      const res = await fetch(`/api/barang-masuk/${record.id}`)
      if (!res.ok) throw new Error('Gagal')
      const detail: BarangMasukData = await res.json()
      const items = detail.items || []
      const meta = await getSchoolMeta()
      meta.unshift(
        { label: 'No. Dokumen', value: detail.documentNumber || '-' },
        { label: 'Tanggal', value: detail.entryDate ? formatDatePrint(detail.entryDate) : '-' },
        { label: 'Sumber', value: detail.source || '-' },
        { label: 'Toko', value: detail.store?.name || '-' },
        { label: 'Penerima', value: detail.employee?.name || '-' },
        { label: 'Status', value: detail.status || '-' },
      )
      const columns: ExcelColumn<BarangMasukItemData>[] = [
        { header: 'No', key: (item) => String(items.indexOf(item) + 1), width: 6 },
        { header: 'Nama Barang', key: 'itemName', width: 30 },
        { header: 'Jumlah', key: 'quantity', width: 10 },
        { header: 'Satuan', key: 'unit', width: 10 },
        { header: 'Kondisi', key: (item) => item.condition || '-', width: 14 },
        { header: 'Keterangan', key: (item) => item.notes || '-', width: 24 },
      ]
      await exportToExcel({
        filename: `Barang_Masuk_${detail.documentNumber || detail.id}.xlsx`,
        sheetName: 'Barang Masuk',
        title: `LAPORAN BARANG MASUK - ${detail.documentNumber}`,
        meta,
        columns,
        data: items,
      })
      toast({ title: 'Berhasil', description: 'Detail barang masuk berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor detail ke Excel', variant: 'destructive' })
    }
  }

  async function handlePrintDetail(record: BarangMasukData, orientation: PrintOrientation = 'portrait') {
    try {
      const res = await fetch(`/api/barang-masuk/${record.id}`)
      if (!res.ok) throw new Error('Gagal')
      const detail: BarangMasukData = await res.json()

      const settings = await fetchPrintSettings()
      const penerimaName = detail.employee?.name || 'Pegawai'
      const penerimaNip = detail.employee?.nip || ''
      const signatureHtml = `
        <div class="signature-block">
          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <div style="text-align: center; width: 45%;">
              <div>Mengetahui,</div>
              <div style="margin-top: 4px;">Kepala Sekolah</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">${settings.principalName || '________________________'}</div>
              <div>NIP. ${settings.principalNip || '________________________'}</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div>Penerima,</div>
              <div style="margin-top: 4px;">${penerimaName}</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">________________________</div>
              <div>NIP. ${penerimaNip}</div>
            </div>
          </div>
        </div>
      `

      const itemsHtml = (detail.items || []).map((item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.itemName}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${item.unit}</td>
          <td class="text-center">${item.condition}</td>
          <td>${item.notes || '-'}</td>
        </tr>
      `).join('')

      const totalQuantity = (detail.items || []).reduce((sum, i) => sum + i.quantity, 0)

      const contentHtml = `
        <table class="meta-table">
          <tr><td style="width:140px;"><strong>No. Dokumen</strong></td><td>: ${detail.documentNumber}</td></tr>
          <tr><td><strong>Tanggal</strong></td><td>: ${detail.entryDate ? formatDatePrint(detail.entryDate) : '-'}</td></tr>
          <tr><td><strong>Sumber</strong></td><td>: ${detail.source || '-'}</td></tr>
          <tr><td><strong>Toko</strong></td><td>: ${detail.store?.name || '-'}</td></tr>
          <tr><td><strong>Pegawai Penerima</strong></td><td>: ${detail.employee?.name || '-'}${detail.employee?.position ? ` (${detail.employee.position})` : ''}</td></tr>
          <tr><td><strong>Keterangan</strong></td><td>: ${detail.notes || '-'}</td></tr>
          <tr><td><strong>Status</strong></td><td>: ${detail.status}</td></tr>
        </table>

        <div style="margin-top: 16px; font-weight: bold; font-size: 10pt;">Daftar Barang:</div>
        <table style="margin-top: 4px;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Nama Barang</th>
              <th style="width: 60px;">Jumlah</th>
              <th style="width: 60px;">Satuan</th>
              <th style="width: 100px;">Kondisi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="margin-top: 8px; font-size: 10pt;">
          <strong>Total:</strong> ${detail.items?.length || 0} jenis barang, ${totalQuantity} unit
        </div>

        ${signatureHtml}
      `

      await printWithKop(`LAPORAN BARANG MASUK - ${detail.documentNumber}`, contentHtml, orientation)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak detail barang masuk', variant: 'destructive' })
    }
  }

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filteredData = data.filter((d) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return d.documentNumber.toLowerCase().includes(q) ||
      d.source.toLowerCase().includes(q) ||
      (d.store?.name || '').toLowerCase().includes(q)
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title="Barang Masuk"
        description="Pencatatan barang masuk dan penerimaan"
        icon={PackagePlus}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)} disabled={loading || filteredData.length === 0}>
              <Printer className="size-4 mr-2" />
              Cetak
            </Button>
            <Button variant="outline" onClick={handleExportExcelList} disabled={loading || filteredData.length === 0}>
              <FileSpreadsheet className="size-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4 mr-2" />
              Tambah Barang Masuk
            </Button>
          </>
        }
      />

      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <PackagePlus className="size-5" />
              <div>
                <CardTitle>Data Barang Masuk</CardTitle>
                <CardDescription>Kelola pencatatan barang masuk</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari barang masuk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data barang masuk..." />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={PackagePlus}
              title="Belum ada data"
              description={search ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Barang Masuk" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px] text-left">Aksi</TableHead>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>No. Dokumen</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead className="text-right">Jumlah Item</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => { setPrintDetailRecord(record); setPrintDetailDialogOpen(true) }} title="Cetak">
                            <Printer className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => handleExportExcelDetail(record)} title="Export Excel">
                            <FileSpreadsheet className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(record)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(record.id); setDeleteName(record.documentNumber) }} title="Hapus">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{record.documentNumber}</TableCell>
                      <TableCell>{record.entryDate ? formatDate(record.entryDate) : '-'}</TableCell>
                      <TableCell>{record.source || '-'}</TableCell>
                      <TableCell>{record.store?.name || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{record.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColors[record.status] || 'secondary'}
                          className="cursor-pointer"
                          onClick={() => {
                            setStatusDataId(record.id)
                            setNewStatus(record.status)
                            setStatusDialogOpen(true)
                          }}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{editingData ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}</DialogTitle>
            <DialogDescription>{editingData ? 'Perbarui data barang masuk' : 'Isi data barang masuk baru'}</DialogDescription>
          </DialogHeader>

          {/* Scrollable body — flex-1 supaya ambil sisa tinggi, overflow-y-auto
              supaya konten panjang bisa di-scroll tanpa menumpuk footer. */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* ─── Entry Info (layout rapih, tidak menumpuk) ─────────────────── */}
              {/* Section 1: Identitas dokumen */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Identitas Dokumen</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nomor Dokumen *</Label>
                    <div className="flex gap-2">
                      <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="BM/001/2025" className="h-9 flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 shrink-0"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/barang-masuk/generate-doc-number')
                            if (res.ok) {
                              const data = await res.json()
                              if (data.documentNumber) setDocumentNumber(data.documentNumber)
                            }
                          } catch { /* silent */ }
                        }}
                        title="Generate nomor otomatis"
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Masuk</Label>
                    <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-9" />
                  </div>
                </div>
              </div>

              {/* Section 2: Relasi dengan Pesanan Barang */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pesanan Barang (opsional)</div>
                <div className="space-y-2">
                  <Select value={orderId || '__none__'} onValueChange={handleSelectOrder}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Pilih pesanan (auto-fill toko + items)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Tidak ada (barang masuk lepas) —</SelectItem>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.orderNumber}{o.store ? ` · ${o.store.name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pilih pesanan untuk <strong>auto-fill toko & items</strong>. Jika dari pesanan, field pengirim disembunyikan (cukup toko saja).
                    Jika tidak ada pesanan, isi toko + pengirim manual di bawah.
                  </p>
                </div>
              </div>

              {/* Section 3: Sumber & Penerima */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sumber & Penerima</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Toko — disable jika sudah ada pesanan (auto-fill dari pesanan) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Toko {orderId ? '(dari pesanan)' : '(opsional)'}
                    </Label>
                    <Select value={storeId} onValueChange={setStoreId} disabled={!!orderId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tidak ada</SelectItem>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Pengirim — HANYA tampil jika BUKAN dari pesanan */}
                  {!orderId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pengirim (siapa yang mengantar)</Label>
                      <Input
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="mis. Pak Rahmat / Kurir JNE"
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sumber Barang</Label>
                    <MasterCombobox
                      category="sumberBarang"
                      value={source}
                      onChange={setSource}
                      placeholder="Pembelian, Donasi, Hibah, dll."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pegawai Penerima</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tidak ada</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}{e.position ? ` - ${e.position}` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 4: Tempat Penyimpanan & Status */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Penyimpanan & Status</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tempat Penyimpanan</Label>
                    <MasterCombobox
                      category="tempatPenyimpanan"
                      value={storageLocation}
                      onChange={setStorageLocation}
                      placeholder="Gudang A, Ruang TU, Lemari 3, dll."
                    />
                    <p className="text-xs text-muted-foreground">
                      Bisa pilih dari daftar atau ketik baru (otomatis tersimpan ke daftar pilihan).
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={entryStatus} onValueChange={setEntryStatus}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Diterima">Diterima</SelectItem>
                        <SelectItem value="Ditolak">Ditolak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 5: Keterangan */}
              <div className="space-y-2">
                <Label className="text-xs">Keterangan (opsional)</Label>
                <Textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Keterangan tambahan" rows={2} />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Daftar Barang</Label>
                  <Button size="sm" variant="outline" onClick={addItemRow}>
                    <Plus className="size-4 mr-1" /> Tambah Item
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label className="text-xs">Nama Barang</Label>
                      <Input value={item.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} placeholder="Nama barang" className="h-9" />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Jumlah</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Satuan</Label>
                      <MasterCombobox
                        category="satuan"
                        value={item.unit}
                        onChange={(val) => updateItem(idx, 'unit', val)}
                        placeholder="Satuan"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3 space-y-1">
                      <Label className="text-xs">Kondisi</Label>
                      <Select value={item.condition} onValueChange={(value) => updateItem(idx, 'condition', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conditionOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="text-right text-base font-semibold">
                  Total Barang: {items.reduce((sum, i) => sum + i.quantity, 0)} ({items.length} jenis)
                </div>
              </div>
            </div>
          </div>

          {/* Footer — sticky di bawah dialog, tidak ikut scroll */}
          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingData ? 'Simpan Perubahan' : 'Tambah Barang Masuk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Status Barang Masuk</DialogTitle>
            <DialogDescription>Pilih status baru</DialogDescription>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Diterima">Diterima</SelectItem>
              <SelectItem value="Ditolak">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Batal</Button>
            <Button onClick={handleStatusChange}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteName('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus barang masuk <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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

      {/* Print Dialog - List */}
      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrintList}
        title="Cetak Daftar Barang Masuk"
      />

      {/* Print Dialog - Detail */}
      <PrintDialog
        open={printDetailDialogOpen}
        onOpenChange={(open) => { setPrintDetailDialogOpen(open); if (!open) setPrintDetailRecord(null) }}
        onPrint={(orientation: PrintOrientation) => { if (printDetailRecord) handlePrintDetail(printDetailRecord, orientation) }}
        title="Cetak Detail Barang Masuk"
        description="Pilih orientasi halaman sebelum mencetak detail"
      />
    </PageContainer>
  )
}
