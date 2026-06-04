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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  FileText,
  Printer,
  X,
} from 'lucide-react'

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

interface OrderItemData {
  id: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes: string
}

interface OrderData {
  id: string
  orderNumber: string
  orderDate: string
  storeId: string
  employeeId: string | null
  status: string
  notes: string
  totalAmount: number
  store?: StoreData
  employee?: EmployeeData
  items?: OrderItemData[]
  createdAt: string
}

interface KopLine {
  text: string
  style: 'header' | 'detail'
  bold: boolean
}

interface SettingsData {
  schoolName: string
  logo: string | null
  logoWidth: number
  logoHeight: number
  fontFamily: string
  fontSize: number
  isBold: boolean
  textTransform: string
  underlineThickness: number
  underlineWidth: number
  address: string | null
  phone: string | null
  email: string | null
  npsn: string | null
  kopLines: string | KopLine[]
}

interface OrderItemForm {
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Dikirim: 'outline',
  Diterima: 'default',
  Selesai: 'default',
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

// ─── Parse kopLines helper ──────────────────────────────────────────────────

function parseKopLines(raw: unknown): KopLine[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') {
        return { text: item, style: 'detail' as const, bold: false }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return {
          text: String(obj.text ?? ''),
          style: (obj.style === 'header' ? 'header' : 'detail') as 'header' | 'detail',
          bold: Boolean(obj.bold ?? false),
        }
      }
      return { text: '', style: 'detail' as const, bold: false }
    })
  } catch {
    return []
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderData[]>([])
  const [stores, setStores] = useState<StoreData[]>([])
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null)
  const [saving, setSaving] = useState(false)

  // Order form
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [storeId, setStoreId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [orderStatus, setOrderStatus] = useState('Draft')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([
    { itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 },
  ])

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Status change
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setOrders(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data pesanan', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchSupporting = useCallback(async () => {
    try {
      const [storeRes, empRes] = await Promise.all([fetch('/api/stores'), fetch('/api/employees')])
      if (storeRes.ok) setStores(await storeRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch {
      // silent
    }
  }, [])

  useEffect(() => { fetchOrders(); fetchSupporting() }, [fetchOrders, fetchSupporting])

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingOrder(null)
    setOrderNumber('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setStoreId('')
    setEmployeeId('')
    setOrderStatus('Draft')
    setOrderNotes('')
    setOrderItems([{ itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 }])
    setDialogOpen(true)
  }

  function openEditDialog(order: OrderData) {
    setEditingOrder(order)
    setOrderNumber(order.orderNumber)
    setOrderDate(order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '')
    setStoreId(order.storeId)
    setEmployeeId(order.employeeId || '')
    setOrderStatus(order.status)
    setOrderNotes(order.notes)
    setOrderItems(
      order.items?.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
      })) || [{ itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 }]
    )
    setDialogOpen(true)
  }

  function addItemRow() {
    setOrderItems([...orderItems, { itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 }])
  }

  function removeItemRow(index: number) {
    if (orderItems.length <= 1) return
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof OrderItemForm, value: string | number) {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice
    }
    setOrderItems(updated)
  }

  function getGrandTotal() {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  async function handleSubmit() {
    if (!orderNumber.trim()) {
      toast({ title: 'Validasi', description: 'Nomor surat pesanan wajib diisi', variant: 'destructive' })
      return
    }
    if (!storeId) {
      toast({ title: 'Validasi', description: 'Pilih toko terlebih dahulu', variant: 'destructive' })
      return
    }
    if (orderItems.some((i) => !i.itemName.trim())) {
      toast({ title: 'Validasi', description: 'Nama barang pada setiap item wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        orderNumber,
        orderDate: orderDate || new Date().toISOString(),
        storeId,
        employeeId: employeeId || null,
        status: orderStatus,
        notes: orderNotes,
        totalAmount: getGrandTotal(),
        items: orderItems.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
          notes: '',
        })),
      }

      const url = editingOrder ? `/api/orders/${editingOrder.id}` : '/api/orders'
      const method = editingOrder ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingOrder ? 'Pesanan berhasil diperbarui' : 'Pesanan berhasil ditambahkan' })
      setDialogOpen(false)
      fetchOrders()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan pesanan', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Pesanan berhasil dihapus' })
      fetchOrders()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus pesanan', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  async function handleStatusChange() {
    if (!statusOrderId || !newStatus) return
    try {
      const order = orders.find((o) => o.id === statusOrderId)
      if (!order) return
      const res = await fetch(`/api/orders/${statusOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Status pesanan diperbarui' })
      setStatusDialogOpen(false)
      fetchOrders()
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  // ─── Print Surat Pesanan ────────────────────────────────────────────────

  async function handlePrint(order: OrderData) {
    // Fetch full order with items
    const orderRes = await fetch(`/api/orders/${order.id}`)
    if (!orderRes.ok) {
      toast({ title: 'Error', description: 'Gagal mengambil data pesanan', variant: 'destructive' })
      return
    }
    const fullOrder: OrderData = await orderRes.json()

    // Fetch settings for KOP
    const settingsRes = await fetch('/api/settings')
    const rawSettings: SettingsData = settingsRes.ok ? await settingsRes.json() : {
      schoolName: '', logo: null, logoWidth: 3, logoHeight: 3, fontFamily: 'Times New Roman',
      fontSize: 14, isBold: false, textTransform: 'none', underlineThickness: 1, underlineWidth: 100,
      address: null, phone: null, email: null, npsn: null, kopLines: [],
    }

    // Parse kopLines
    const kopLines = parseKopLines(rawSettings.kopLines)
    const headerLines = kopLines.filter(l => l.style === 'header' && l.text.trim())
    const detailLines = kopLines.filter(l => l.style === 'detail' && l.text.trim())

    const store = fullOrder.store || stores.find((s) => s.id === fullOrder.storeId)
    const employee = fullOrder.employee || employees.find((e) => e.id === fullOrder.employeeId)

    // ─── Build KOP HTML ─────────────────────────────────────────────────────
    const cmToPx = 37.8
    const logoWidthPx = rawSettings.logoWidth * cmToPx
    const logoHeightPx = rawSettings.logoHeight * cmToPx

    let textTransformCSS = 'none'
    switch (rawSettings.textTransform) {
      case 'uppercase': textTransformCSS = 'uppercase'; break
      case 'capitalize': textTransformCSS = 'capitalize'; break
      case 'lowercase': textTransformCSS = 'lowercase'; break
    }

    // Header lines HTML (above school name, same font size)
    const headerLinesHtml = headerLines.map(line => `
      <div style="
        font-family: '${rawSettings.fontFamily}', serif;
        font-size: ${rawSettings.fontSize}pt;
        font-weight: ${line.bold ? 'bold' : 'normal'};
        text-transform: ${textTransformCSS};
        line-height: 1.3;
        margin-top: 1px;
      ">${line.text}</div>
    `).join('\n')

    // School name HTML
    const schoolNameHtml = `
      <div style="
        font-family: '${rawSettings.fontFamily}', serif;
        font-size: ${rawSettings.fontSize}pt;
        font-weight: ${rawSettings.isBold ? 'bold' : 'normal'};
        text-transform: ${textTransformCSS};
        line-height: 1.3;
        margin-top: ${headerLines.length > 0 ? '1px' : '0'};
      ">${rawSettings.schoolName || 'NAMA SEKOLAH'}</div>
    `

    // Detail lines HTML (below school name, smaller font)
    const detailLinesHtml = detailLines.map(line => `
      <div style="
        font-family: Arial, sans-serif;
        font-size: ${Math.max(Math.round(rawSettings.fontSize * 0.55), 7)}pt;
        font-weight: ${line.bold ? 'bold' : 'normal'};
        line-height: 1.4;
        margin-top: 1px;
      ">${line.text}</div>
    `).join('\n')

    const kopHtml = `
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 2px;">
        ${rawSettings.logo ? `<img src="${rawSettings.logo}" style="width: ${logoWidthPx}px; height: ${logoHeightPx}px; object-fit: contain;" />` : `<div style="width: ${logoWidthPx}px; height: ${logoHeightPx}px;"></div>`}
        <div style="flex: 1; text-align: center;">
          ${headerLinesHtml}
          ${schoolNameHtml}
          ${detailLinesHtml}
        </div>
        ${rawSettings.logo ? `<div style="width: ${logoWidthPx}px;"></div>` : ''}
      </div>
      <div style="border-bottom: ${rawSettings.underlineThickness}px solid black; width: ${rawSettings.underlineWidth}%; margin: 6px auto 0;"></div>
    `

    // ─── Build items rows ──────────────────────────────────────────────────
    let itemsHtml = ''
    let grandTotal = 0
    fullOrder.items?.forEach((item, idx) => {
      const total = item.quantity * item.unitPrice
      grandTotal += total
      itemsHtml += `
        <tr>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 4px 8px;">${item.itemName}</td>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: center;">${item.quantity}</td>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: center;">${item.unit}</td>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: right;">Rp ${formatNumber(item.unitPrice)}</td>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: right;">Rp ${formatNumber(total)}</td>
        </tr>
      `
    })

    // ─── Format date ──────────────────────────────────────────────────────
    const orderDateStr = fullOrder.orderDate
      ? new Date(fullOrder.orderDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    // Extract city from school address or use default
    const city = rawSettings.address ? rawSettings.address.split(',').pop()?.trim() || '___________' : '___________'

    // ─── Build full print HTML ─────────────────────────────────────────────
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Pesanan - ${fullOrder.orderNumber}</title>
        <style>
          @page { size: A4; margin: 20mm 25mm 20mm 25mm; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            margin: 0;
            padding: 0;
            color: #000;
            line-height: 1.4;
          }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #e8e8e8; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <!-- KOP Surat -->
        ${kopHtml}

        <!-- Judul Surat -->
        <div style="text-align: center; margin-top: 16px; margin-bottom: 12px;">
          <span style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT PESANAN</span>
        </div>

        <!-- Tanggal -->
        <div style="text-align: right; margin-bottom: 12px; font-size: 12pt;">
          ${city}, ${orderDateStr}
        </div>

        <!-- No dan Perihal -->
        <table style="width: auto; border: none; margin-bottom: 8px; font-size: 12pt;">
          <tr>
            <td style="border: none; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap;">No</td>
            <td style="border: none; padding: 2px 4px; vertical-align: top;">:</td>
            <td style="border: none; padding: 2px 0;">${fullOrder.orderNumber}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 2px 8px 2px 0; vertical-align: top; white-space: nowrap;">Perihal</td>
            <td style="border: none; padding: 2px 4px; vertical-align: top;">:</td>
            <td style="border: none; padding: 2px 0; font-weight: bold;">Pemesanan Barang</td>
          </tr>
        </table>

        <!-- Kepada -->
        <div style="margin-bottom: 16px; font-size: 12pt;">
          <div>Kepada Yth, Pimpinan ${store?.name || '-'}</div>
          <div style="padding-left: 16px;">di</div>
          <div style="padding-left: 32px;">Tempat</div>
        </div>

        <!-- Salam Pembuka -->
        <div style="margin-bottom: 12px; font-size: 12pt;">
          Dengan Hormat,
        </div>

        <!-- Isi Surat -->
        <div style="margin-bottom: 12px; font-size: 12pt; text-align: justify;">
          Bersamaan dengan surat ini kami memohon bantuan saudara untuk menyediakan ATK untuk ${rawSettings.schoolName || 'Sekolah'}
          dengan rincian berikut :
        </div>

        <!-- Tabel Pesanan -->
        <table style="margin: 12px 0; font-size: 11pt;">
          <thead>
            <tr>
              <th style="border: 1px solid #333; padding: 6px 8px; width: 35px; text-align: center;">No</th>
              <th style="border: 1px solid #333; padding: 6px 8px;">Nama Barang</th>
              <th style="border: 1px solid #333; padding: 6px 8px; width: 55px; text-align: center;">Jumlah</th>
              <th style="border: 1px solid #333; padding: 6px 8px; width: 55px; text-align: center;">Satuan</th>
              <th style="border: 1px solid #333; padding: 6px 8px; width: 100px; text-align: center;">Harga Satuan</th>
              <th style="border: 1px solid #333; padding: 6px 8px; width: 100px; text-align: center;">Total Harga</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background-color: #e8e8e8;">
              <td colspan="2" style="border: 1px solid #333; padding: 6px 8px; font-weight: bold; text-align: right;">Total</td>
              <td style="border: 1px solid #333; padding: 6px 8px; text-align: center; font-weight: bold;">${fullOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0}</td>
              <td style="border: 1px solid #333; padding: 6px 8px; text-align: center;">-</td>
              <td style="border: 1px solid #333; padding: 6px 8px;">Rp</td>
              <td style="border: 1px solid #333; padding: 6px 8px; text-align: right; font-weight: bold;">Rp ${formatNumber(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Penutup -->
        <div style="margin-top: 16px; font-size: 12pt; text-align: justify;">
          Demikian surat pesanan ini kami sampaikan, atas terlaksananya pesanan ini kami ucapkan terima kasih.
        </div>

        <!-- Tanda Tangan -->
        <div style="margin-top: 32px; font-size: 12pt;">
          <div style="display: inline-block; min-width: 200px;">
            <div>an. Kepala Sekolah</div>
            <div>Bendahara ${rawSettings.schoolName || 'Sekolah'}</div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${employee?.name || '____________________'}</div>
            <div>${employee?.nip ? `NIP. ${employee.nip}` : '&nbsp;'}</div>
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print() }, 500)
    }
  }

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || (o.store?.name || '').toLowerCase().includes(q)
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pesanan</h2>
          <p className="text-muted-foreground">Manajemen surat pesanan dan pencetakan</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="size-4 mr-2" />
          Tambah Pesanan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-5" />
              <div>
                <CardTitle>Data Pesanan</CardTitle>
                <CardDescription>Kelola surat pesanan dan cetak dokumen</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari pesanan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">{search ? 'Tidak ditemukan pesanan yang sesuai' : 'Klik "Tambah Pesanan" untuk menambahkan'}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Nomor Surat</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[140px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order, idx) => (
                    <TableRow key={order.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.orderDate ? formatDate(order.orderDate) : '-'}</TableCell>
                      <TableCell>{order.store?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColors[order.status] || 'secondary'}
                          className="cursor-pointer"
                          onClick={() => {
                            setStatusOrderId(order.id)
                            setNewStatus(order.status)
                            setStatusDialogOpen(true)
                          }}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatRupiah(order.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(order)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => handlePrint(order)} title="Cetak Surat Pesanan">
                            <Printer className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(order.id); setDeleteName(order.orderNumber) }} title="Hapus">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Edit Pesanan' : 'Tambah Pesanan'}</DialogTitle>
            <DialogDescription>{editingOrder ? 'Perbarui data pesanan' : 'Isi data pesanan baru'}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nomor Surat Pesanan *</Label>
                  <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="9/PB/SMAN1TLD-TU/XI/2025" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Pesanan</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Toko *</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pegawai (Bendahara)</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}{e.position ? ` - ${e.position}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={orderStatus} onValueChange={setOrderStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Dikirim">Dikirim</SelectItem>
                      <SelectItem value="Diterima">Diterima</SelectItem>
                      <SelectItem value="Selesai">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Keterangan pesanan" rows={2} />
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Daftar Barang</Label>
                  <Button size="sm" variant="outline" onClick={addItemRow}>
                    <Plus className="size-4 mr-1" /> Tambah Item
                  </Button>
                </div>

                {orderItems.map((item, idx) => (
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
                      <Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="h-9" />
                    </div>
                    <div className="col-span-3 sm:col-span-3 space-y-1">
                      <Label className="text-xs">Harga Satuan</Label>
                      <Input type="number" min={0} value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        onClick={() => removeItemRow(idx)}
                        disabled={orderItems.length <= 1}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="text-right text-lg font-semibold">
                  Grand Total: {formatRupiah(getGrandTotal())}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingOrder ? 'Simpan Perubahan' : 'Tambah Pesanan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Status Pesanan</DialogTitle>
            <DialogDescription>Pilih status baru untuk pesanan ini</DialogDescription>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Dikirim">Dikirim</SelectItem>
              <SelectItem value="Diterima">Diterima</SelectItem>
              <SelectItem value="Selesai">Selesai</SelectItem>
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
              Apakah Anda yakin ingin menghapus pesanan <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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
