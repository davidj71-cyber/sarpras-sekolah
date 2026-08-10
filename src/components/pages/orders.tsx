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
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  DollarSign,
  CreditCard,
  Wallet,
} from 'lucide-react'
import {
  fetchPrintSettings,
  buildKopHtml,
  openPrintWindow,
  formatRupiahPrint,
  formatDatePrint,
  formatNumberPrint,
} from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import { MasterCombobox } from '@/components/ui/master-combobox'

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
  paymentMethod: string
  paymentStatus: string
  paidAt: string | null
  notes: string
  totalAmount: number
  store?: StoreData
  employee?: EmployeeData
  items?: OrderItemData[]
  createdAt: string
}

interface OrderItemForm {
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
}

interface SettingsData {
  schoolCode: string
  letterUnitCode: string
  schoolName: string
  address: string | null
  [key: string]: unknown
}

type PaymentFilter = 'all' | 'cash' | 'bon_unpaid' | 'bon_paid'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Dikirim: 'outline',
  Diterima: 'default',
  Selesai: 'default',
}

// ─── Order Row Group ─────────────────────────────────────────────────────────

function OrderRowGroup({
  order,
  idx,
  isExpanded,
  items,
  onToggle,
  onStatusClick,
  onEdit,
  onPrint,
  onDelete,
  onMarkAsPaid,
}: {
  order: OrderData
  idx: number
  isExpanded: boolean
  items: OrderItemData[]
  onToggle: () => void
  onStatusClick: (orderId: string, status: string) => void
  onEdit: (order: OrderData) => void
  onPrint: (order: OrderData) => void
  onDelete: (id: string, name: string) => void
  onMarkAsPaid: (order: OrderData) => void
}) {
  const isBON = order.paymentMethod === 'BON'
  const isUnpaid = isBON && order.paymentStatus === 'BELUM_BAYAR'

  return (
    <>
      {/* Main Row */}
      <TableRow className={`cursor-pointer hover:bg-muted/50 ${isUnpaid ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`} onClick={onToggle}>
        <TableCell className="w-[40px]">
          <button className="flex items-center justify-center size-6 rounded hover:bg-muted">
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </TableCell>
        <TableCell>{idx + 1}</TableCell>
        <TableCell className="font-medium">{order.orderNumber}</TableCell>
        <TableCell>{order.orderDate ? formatDatePrint(order.orderDate) : '-'}</TableCell>
        <TableCell>{order.store?.name || '-'}</TableCell>
        <TableCell>
          <Badge
            variant={statusColors[order.status] || 'secondary'}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onStatusClick(order.id, order.status)
            }}
          >
            {order.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge variant={isBON ? 'outline' : 'default'}>
              {isBON ? '📝 BON' : '💵 Cash'}
            </Badge>
            {isBON && (
              <Badge
                variant={order.paymentStatus === 'LUNAS' ? 'default' : 'destructive'}
                className="text-[10px] px-1.5 py-0"
              >
                {order.paymentStatus === 'LUNAS' ? (
                  <><CheckCircle2 className="size-3 mr-0.5" />LUNAS</>
                ) : (
                  <><Clock className="size-3 mr-0.5" />BELUM BAYAR</>
                )}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{formatRupiahPrint(order.totalAmount)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isUnpaid && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onMarkAsPaid(order)}
                title="Tandai Lunas"
              >
                <CheckCircle2 className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(order)} title="Edit">
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onPrint(order)} title="Cetak Surat Pesanan">
              <Printer className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onDelete(order.id, order.orderNumber)} title="Hapus">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Items Row */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="p-0 border-0">
            <div className={`px-12 py-3 ${isUnpaid ? 'bg-amber-50/30 dark:bg-amber-950/10' : 'bg-muted/30'}`}>
              {/* BON payment info */}
              {isBON && (
                <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Status Pembayaran:
                    <Badge
                      variant={order.paymentStatus === 'LUNAS' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {order.paymentStatus === 'LUNAS' ? '✓ LUNAS' : '⏳ BELUM BAYAR'}
                    </Badge>
                  </span>
                  {order.paymentStatus === 'LUNAS' && order.paidAt && (
                    <span className="text-muted-foreground">
                      Tanggal Bayar: <span className="font-medium text-foreground">{formatDatePrint(order.paidAt)}</span>
                    </span>
                  )}
                </div>
              )}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Tidak ada item dalam pesanan ini</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] h-8 text-xs">No</TableHead>
                      <TableHead className="h-8 text-xs">Nama Barang</TableHead>
                      <TableHead className="h-8 text-xs w-[70px]">Jumlah</TableHead>
                      <TableHead className="h-8 text-xs w-[70px]">Satuan</TableHead>
                      <TableHead className="h-8 text-xs w-[110px]">Harga Satuan</TableHead>
                      <TableHead className="h-8 text-xs w-[110px]">Total Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, itemIdx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs py-1.5">{itemIdx + 1}</TableCell>
                        <TableCell className="text-xs py-1.5">{item.itemName}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">{item.quantity}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">{item.unit}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right">{formatRupiahPrint(item.unitPrice)}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right">{formatRupiahPrint(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs py-1.5 text-right font-semibold border-t">Total</TableCell>
                      <TableCell className="text-xs py-1.5 border-t"></TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-semibold border-t">{formatRupiahPrint(order.totalAmount)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toRoman(num: number): string {
  const romanNumerals = [
    { value: 12, symbol: 'XII' },
    { value: 11, symbol: 'XI' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 8, symbol: 'VIII' },
    { value: 7, symbol: 'VII' },
    { value: 6, symbol: 'VI' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 3, symbol: 'III' },
    { value: 2, symbol: 'II' },
    { value: 1, symbol: 'I' },
  ]
  for (const { value, symbol } of romanNumerals) {
    if (num === value) return symbol
  }
  return String(num)
}

function generateOrderNumber(
  num: string,
  schoolCode: string,
  letterUnitCode: string,
  dateStr: string
): string {
  if (!num.trim()) return ''
  const normalizedNum = parseInt(num, 10)
  if (isNaN(normalizedNum) || normalizedNum <= 0) return ''
  const date = dateStr ? new Date(dateStr) : new Date()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  const code = schoolCode || 'SEKOLAH'
  const unit = letterUnitCode || 'TU'
  return `${normalizedNum}/PB/${code}-${unit}/${toRoman(month)}/${year}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderData[]>([])
  const [stores, setStores] = useState<StoreData[]>([])
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null)
  const [saving, setSaving] = useState(false)

  // Order form
  const [orderNumberInput, setOrderNumberInput] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [storeId, setStoreId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [orderStatus, setOrderStatus] = useState('Draft')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentStatus, setPaymentStatus] = useState('LUNAS')
  const [paidAt, setPaidAt] = useState('')
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

  // Mark as paid dialog
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null)
  const [paidDate, setPaidDate] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)

  // Print dialog
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printOrderId, setPrintOrderId] = useState<string | null>(null)

  // ─── Computed order number ─────────────────────────────────────────────

  const generatedOrderNumber = generateOrderNumber(
    orderNumberInput,
    settings?.schoolCode || '',
    settings?.letterUnitCode || '',
    orderDate
  )

  // ─── BON Summary ────────────────────────────────────────────────────────

  const bonOrders = orders.filter(o => o.paymentMethod === 'BON')
  const bonUnpaid = bonOrders.filter(o => o.paymentStatus === 'BELUM_BAYAR')
  const bonPaid = bonOrders.filter(o => o.paymentStatus === 'LUNAS')
  const totalBonUnpaid = bonUnpaid.reduce((s, o) => s + o.totalAmount, 0)
  const totalBonPaid = bonPaid.reduce((s, o) => s + o.totalAmount, 0)
  const totalCash = orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0)

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
      const [storeRes, empRes, settingsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/employees'),
        fetch('/api/settings'),
      ])
      if (storeRes.ok) setStores(await storeRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setSettings({
          schoolCode: s.schoolCode || '',
          letterUnitCode: s.letterUnitCode || 'TU',
          schoolName: s.schoolName || '',
          address: s.address || null,
        })
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => { fetchOrders(); fetchSupporting() }, [fetchOrders, fetchSupporting])

  // ─── Toggle expand ─────────────────────────────────────────────────────

  function toggleExpand(orderId: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingOrder(null)
    setOrderNumberInput('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setStoreId('')
    setEmployeeId('')
    setOrderStatus('Draft')
    setPaymentMethod('Cash')
    setPaymentStatus('LUNAS')
    setPaidAt('')
    setOrderNotes('')
    setOrderItems([{ itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 }])
    setDialogOpen(true)
  }

  function openAddBonDialog() {
    setEditingOrder(null)
    setOrderNumberInput('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setStoreId('')
    setEmployeeId('')
    setOrderStatus('Diterima')
    setPaymentMethod('BON')
    setPaymentStatus('BELUM_BAYAR')
    setPaidAt('')
    setOrderNotes('')
    setOrderItems([{ itemName: '', quantity: 1, unit: 'Unit', unitPrice: 0 }])
    setDialogOpen(true)
  }

  function openEditDialog(order: OrderData) {
    setEditingOrder(order)
    // For BON auto-generated numbers, don't try to extract the number part
    const isBonAutoNumber = order.orderNumber.startsWith('BON/')
    const numPart = isBonAutoNumber ? '' : (order.orderNumber.split('/PB/')[0] || order.orderNumber)
    setOrderNumberInput(numPart)
    setOrderDate(order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '')
    setStoreId(order.storeId)
    setEmployeeId(order.employeeId || '')
    setOrderStatus(order.status)
    setPaymentMethod(order.paymentMethod || 'Cash')
    setPaymentStatus(order.paymentStatus || (order.paymentMethod === 'BON' ? 'BELUM_BAYAR' : 'LUNAS'))
    setPaidAt(order.paidAt ? new Date(order.paidAt).toISOString().split('T')[0] : '')
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

  // Handle payment method change
  function handlePaymentMethodChange(method: string) {
    setPaymentMethod(method)
    if (method === 'Cash') {
      setPaymentStatus('LUNAS')
      setPaidAt('')
    } else {
      // BON - default to BELUM_BAYAR for new, keep existing for edit
      if (!editingOrder) {
        setPaymentStatus('BELUM_BAYAR')
        setPaidAt('')
      }
    }
  }

  // Generate BON number automatically
  function generateBonNumber(): string {
    const date = orderDate ? new Date(orderDate) : new Date()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const bonCount = orders.filter(o => o.orderNumber.startsWith('BON/')).length + 1
    return `BON/${toRoman(month)}/${year}-${bonCount}`
  }

  async function handleSubmit() {
    // For BON entries, order number is optional - auto-generate if empty
    let fullOrderNumber: string
    if (editingOrder) {
      fullOrderNumber = orderNumberInput.includes('/PB/') ? orderNumberInput : generatedOrderNumber
    } else {
      fullOrderNumber = generatedOrderNumber
    }

    // If no order number and it's a BON, auto-generate
    if (!orderNumberInput.trim() && paymentMethod === 'BON') {
      fullOrderNumber = generateBonNumber()
    }

    // When editing BON with auto-generated number (no number input), keep the existing number
    if (editingOrder && !orderNumberInput.trim() && editingOrder.orderNumber.startsWith('BON/')) {
      fullOrderNumber = editingOrder.orderNumber
    }

    if (!fullOrderNumber) {
      toast({ title: 'Validasi', description: 'Nomor surat pesanan wajib diisi (atau pilih metode BON)', variant: 'destructive' })
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
        orderNumber: fullOrderNumber,
        orderDate: orderDate || new Date().toISOString(),
        storeId,
        employeeId: employeeId || null,
        status: orderStatus,
        paymentMethod,
        paymentStatus,
        paidAt: paymentMethod === 'BON' && paymentStatus === 'LUNAS' && paidAt ? paidAt : undefined,
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
      const result = await res.json()
      if (result.merged) {
        toast({ title: 'Berhasil', description: 'Item berhasil ditambahkan ke pesanan yang sudah ada' })
      } else {
        toast({ title: 'Berhasil', description: editingOrder ? 'Pesanan berhasil diperbarui' : 'Pesanan berhasil ditambahkan' })
      }
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

  // ─── Mark as Paid ────────────────────────────────────────────────────────

  function openMarkAsPaidDialog(order: OrderData) {
    setPaidOrderId(order.id)
    setPaidDate(new Date().toISOString().split('T')[0])
    setPaidDialogOpen(true)
  }

  async function handleMarkAsPaid() {
    if (!paidOrderId) return
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/orders/${paidOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAsPaid: true,
          paidAt: paidDate || new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'BON berhasil ditandai lunas' })
      setPaidDialogOpen(false)
      fetchOrders()
    } catch {
      toast({ title: 'Error', description: 'Gagal menandai BON sebagai lunas', variant: 'destructive' })
    } finally {
      setMarkingPaid(false)
      setPaidOrderId(null)
    }
  }

  // ─── Print Surat Pesanan ────────────────────────────────────────────────

  async function handlePrint(order: OrderData, orientation: PrintOrientation = 'portrait') {
    const orderRes = await fetch(`/api/orders/${order.id}`)
    if (!orderRes.ok) {
      toast({ title: 'Error', description: 'Gagal mengambil data pesanan', variant: 'destructive' })
      return
    }
    const fullOrder: OrderData = await orderRes.json()

    const settings = await fetchPrintSettings()
    const kopHtml = buildKopHtml(settings)

    const store = fullOrder.store || stores.find((s) => s.id === fullOrder.storeId)
    const employee = fullOrder.employee || employees.find((e) => e.id === fullOrder.employeeId)

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
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: right;">Rp ${formatNumberPrint(item.unitPrice)}</td>
          <td style="border: 1px solid #333; padding: 4px 8px; text-align: right;">Rp ${formatNumberPrint(total)}</td>
        </tr>
      `
    })

    const orderDateStr = fullOrder.orderDate
      ? formatDatePrint(fullOrder.orderDate)
      : formatDatePrint(new Date().toISOString())

    const city = settings.address ? settings.address.split(',').pop()?.trim() || '___________' : '___________'

    const bodyHtml = `
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
        Bersamaan dengan surat ini kami memohon bantuan saudara untuk menyediakan ATK untuk ${settings.schoolName || 'Sekolah'}
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
            <td style="border: 1px solid #333; padding: 6px 8px; text-align: right; font-weight: bold;">Rp ${formatNumberPrint(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Penutup -->
      <div style="margin-top: 16px; font-size: 12pt; text-align: justify;">
        Demikian surat pesanan ini kami sampaikan, atas terlaksananya pesanan ini kami ucapkan terima kasih.
      </div>

      <!-- Tanda Tangan -->
      <div style="margin-top: 32px; font-size: 12pt;">
        <table style="border: none; border-collapse: collapse; width: auto;">
          <tr>
            <td style="border: none; padding: 0; vertical-align: top; white-space: nowrap;">an.</td>
            <td style="border: none; padding: 0 0 0 6px; vertical-align: top;">Kepala Sekolah</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0 0 0 6px;">Bendahara ${settings.schoolName || 'Sekolah'}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0 0 0 6px; height: 60px;"></td>
          </tr>
          <tr>
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0 0 0 6px; text-decoration: underline; font-weight: bold;">${employee?.name || '____________________'}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0 0 0 6px;">${employee?.nip ? `NIP. ${employee.nip}` : '&nbsp;'}</td>
          </tr>
        </table>
      </div>
    `

    openPrintWindow(`Surat Pesanan - ${fullOrder.orderNumber}`, bodyHtml, orientation)
  }

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filteredOrders = orders.filter((o) => {
    // Payment filter
    if (paymentFilter === 'cash' && o.paymentMethod !== 'Cash') return false
    if (paymentFilter === 'bon_unpaid' && !(o.paymentMethod === 'BON' && o.paymentStatus === 'BELUM_BAYAR')) return false
    if (paymentFilter === 'bon_paid' && !(o.paymentMethod === 'BON' && o.paymentStatus === 'LUNAS')) return false

    // Search filter
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || (o.store?.name || '').toLowerCase().includes(q)
  })

  // ─── Filter tabs config ──────────────────────────────────────────────────

  const filterTabs: { key: PaymentFilter; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'all', label: 'Semua', icon: FileText, count: orders.length },
    { key: 'cash', label: 'Cash', icon: Wallet, count: orders.filter(o => o.paymentMethod === 'Cash').length },
    { key: 'bon_unpaid', label: 'BON Belum Bayar', icon: Clock, count: bonUnpaid.length },
    { key: 'bon_paid', label: 'BON Lunas', icon: CheckCircle2, count: bonPaid.length },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pesanan</h2>
          <p className="text-muted-foreground">Manajemen surat pesanan dan pencatatan BON</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAddBonDialog}>
            <CreditCard className="size-4 mr-2" />
            Catat BON
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="size-4 mr-2" />
            Tambah Pesanan
          </Button>
        </div>
      </div>

      {/* BON Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pesanan</p>
                <p className="text-lg font-bold">{formatRupiahPrint(orders.reduce((s, o) => s + o.totalAmount, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wallet className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash (Tunai)</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatRupiahPrint(totalCash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CreditCard className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BON Belum Bayar</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatRupiahPrint(totalBonUnpaid)}</p>
                <p className="text-xs text-muted-foreground">{bonUnpaid.length} pesanan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BON Lunas</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatRupiahPrint(totalBonPaid)}</p>
                <p className="text-xs text-muted-foreground">{bonPaid.length} pesanan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-5" />
              <div>
                <CardTitle>Data Pesanan</CardTitle>
                <CardDescription>Kelola surat pesanan, BON, dan cetak dokumen</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari pesanan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          {/* Payment filter tabs */}
          <div className="flex items-center gap-1 pt-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPaymentFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  paymentFilter === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
                }`}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  paymentFilter === tab.key ? 'bg-primary-foreground/20' : 'bg-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
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
            <div className="max-h-[600px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Nomor / Kode</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[160px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order, idx) => {
                    const isExpanded = expandedOrders.has(order.id)
                    const items = order.items || []
                    return (
                      <OrderRowGroup
                        key={order.id}
                        order={order}
                        idx={idx}
                        isExpanded={isExpanded}
                        items={items}
                        onToggle={() => toggleExpand(order.id)}
                        onStatusClick={(orderId: string, status: string) => {
                          setStatusOrderId(orderId)
                          setNewStatus(status)
                          setStatusDialogOpen(true)
                        }}
                        onEdit={openEditDialog}
                        onPrint={(order) => { setPrintOrderId(order.id); setPrintDialogOpen(true) }}
                        onDelete={(id, name) => { setDeleteId(id); setDeleteName(name) }}
                        onMarkAsPaid={openMarkAsPaidDialog}
                      />
                    )
                  })}
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
                  <Label>
                    Nomor Surat Pesanan
                    {paymentMethod === 'BON' && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">(opsional untuk BON)</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={orderNumberInput}
                    onChange={(e) => setOrderNumberInput(e.target.value)}
                    placeholder={paymentMethod === 'BON' ? 'Kosongkan untuk auto-generate' : 'Masukkan nomor surat (misal: 9)'}
                  />
                  {generatedOrderNumber && (
                    <p className="text-xs text-muted-foreground">
                      Format lengkap: <span className="font-mono font-medium text-foreground">{generatedOrderNumber}</span>
                    </p>
                  )}
                  {paymentMethod === 'BON' && !orderNumberInput.trim() && (
                    <p className="text-xs text-amber-600 font-medium">
                      Nomor akan otomatis tergenerate (format: BON/[bulan]/[tahun]-[no])
                    </p>
                  )}
                  {!generatedOrderNumber && paymentMethod !== 'BON' && settings?.schoolCode && (
                    <p className="text-xs text-muted-foreground">
                      Format: [No]/PB/{settings.schoolCode}-{settings.letterUnitCode}/[Bulan Romawi]/[Tahun]
                    </p>
                  )}
                  {!editingOrder && generatedOrderNumber && orders.some(o => o.orderNumber === generatedOrderNumber) && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠ Nomor surat ini sudah ada. Item akan ditambahkan ke pesanan yang sudah ada.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Pembelian</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                  {paymentMethod === 'BON' && (
                    <p className="text-xs text-amber-600">Isi tanggal ketika BON terjadi</p>
                  )}
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
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">💵 Cash — Tunai</SelectItem>
                      <SelectItem value="BON">📝 BON — Utang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* BON-specific fields */}
              {paymentMethod === 'BON' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <CreditCard className="size-4" />
                    <span className="text-sm font-semibold">Pengaturan BON</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status Pembayaran</Label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BELUM_BAYAR">⏳ Belum Bayar</SelectItem>
                          <SelectItem value="LUNAS">✓ Lunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentStatus === 'LUNAS' && (
                      <div className="space-y-2">
                        <Label>Tanggal Pelunasan</Label>
                        <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Untuk BON lama yang sudah dibayar, isi tanggal pelunasan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      <MasterCombobox
                        category="satuan"
                        value={item.unit}
                        onChange={(val) => updateItem(idx, 'unit', val)}
                        placeholder="Satuan"
                        className="h-9"
                      />
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
                  Grand Total: {formatRupiahPrint(getGrandTotal())}
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

      {/* Mark as Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tandai BON Lunas</DialogTitle>
            <DialogDescription>Konfirmasi pelunasan pembayaran BON</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">BON akan ditandai sebagai LUNAS</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Pelunasan</Label>
              <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>Batal</Button>
            <Button onClick={handleMarkAsPaid} disabled={markingPaid} className="bg-green-600 hover:bg-green-700">
              {markingPaid && <Loader2 className="size-4 mr-2 animate-spin" />}
              <CheckCircle2 className="size-4 mr-2" />
              Tandai Lunas
            </Button>
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
              {deleting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrintDialog
        open={printDialogOpen}
        onOpenChange={(open) => { setPrintDialogOpen(open); if (!open) setPrintOrderId(null) }}
        onPrint={(orientation: PrintOrientation) => {
          if (printOrderId) {
            const order = orders.find(o => o.id === printOrderId)
            if (order) handlePrint(order, orientation)
          }
          setPrintOrderId(null)
        }}
        title="Cetak Surat Pesanan"
      />
    </div>
  )
}
