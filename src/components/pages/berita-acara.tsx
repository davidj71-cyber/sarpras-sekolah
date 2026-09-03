'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Printer,
  X,
  FileText,
  ArrowLeftRight,
  UserPlus,
  ClipboardCheck,
} from 'lucide-react'
import {
  printWithKop,
  formatDatePrint,
  fetchPrintSettings,
} from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import { MasterCombobox } from '@/components/ui/master-combobox'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Borrower {
  id: string
  name: string
  organization: string
  address: string
  phone: string
  role: string
  _count?: { borrowings: number }
}

interface BorrowingItemData {
  id: string
  borrowingId: string
  itemName: string
  registrationNumber: string
  quantity: number
  unit: string
  condition: string
  notes: string
}

interface BorrowingData {
  id: string
  baNumber: string
  borrowDate: string
  expectedReturnDate: string | null
  actualReturnDate: string | null
  borrowerId: string
  borrower: Borrower
  purpose: string
  notes: string
  status: string
  lenderName: string
  lenderNip: string
  items: BorrowingItemData[]
  returnEntry: ReturnData | null
}

interface ReturnItemParsed {
  itemName: string
  condition: string
  notes: string
}

interface ReturnData {
  id: string
  baNumber: string
  returnDate: string
  borrowingId: string
  borrowing?: BorrowingData
  notes: string
  receiverName: string
  receiverNip: string
  returnItems: string
}

interface BorrowingItemForm {
  itemName: string
  registrationNumber: string
  quantity: number
  unit: string
  condition: string
  notes: string
}

interface ReturnItemForm {
  itemName: string
  registrationNumber: string
  quantity: number
  unit: string
  originalCondition: string
  returnCondition: string
  notes: string
}

const conditionOptions = ['Baik', 'Rusak Ringan', 'Rusak Berat']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDayNameDateMonthYear(dateStr: string): {
  day: string
  dateNum: string
  month: string
  year: string
} {
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('id-ID', { weekday: 'long' }),
    dateNum: String(d.getDate()),
    month: d.toLocaleDateString('id-ID', { month: 'long' }),
    year: String(d.getFullYear()),
  }
}

function parseReturnItems(raw: string): ReturnItemParsed[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is ReturnItemParsed =>
        typeof x === 'object' && x !== null && typeof x.itemName === 'string'
      )
    }
  } catch {
    /* ignore */
  }
  return []
}

function generateBaNumber(prefix: 'BA-PIN' | 'BA-PENG', existingCount: number): string {
  const num = String(existingCount + 1).padStart(3, '0')
  const year = new Date().getFullYear()
  return `${num}/${prefix}/${year}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BeritaAcaraPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>('borrow')

  // ── Shared state ──
  const [borrowers, setBorrowers] = useState<Borrower[]>([])

  // ── Peminjaman state ──
  const [borrowings, setBorrowings] = useState<BorrowingData[]>([])
  const [loadingBorrowings, setLoadingBorrowings] = useState(true)
  const [searchBorrowings, setSearchBorrowings] = useState('')

  const [dialogBorrowOpen, setDialogBorrowOpen] = useState(false)
  const [editingBorrowing, setEditingBorrowing] = useState<BorrowingData | null>(null)
  const [savingBorrow, setSavingBorrow] = useState(false)

  const [baNumberBorrow, setBaNumberBorrow] = useState('')
  const [borrowDate, setBorrowDate] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [borrowerId, setBorrowerId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [borrowNotes, setBorrowNotes] = useState('')
  const [lenderName, setLenderName] = useState('')
  const [lenderNip, setLenderNip] = useState('')
  const [borrowItems, setBorrowItems] = useState<BorrowingItemForm[]>([
    { itemName: '', registrationNumber: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' },
  ])

  // Add borrower inline dialog
  const [addBorrowerOpen, setAddBorrowerOpen] = useState(false)
  const [newBorrowerName, setNewBorrowerName] = useState('')
  const [newBorrowerOrg, setNewBorrowerOrg] = useState('')
  const [newBorrowerAddress, setNewBorrowerAddress] = useState('')
  const [newBorrowerPhone, setNewBorrowerPhone] = useState('')
  const [newBorrowerRole, setNewBorrowerRole] = useState('Eksternal')
  const [savingBorrower, setSavingBorrower] = useState(false)

  // Delete borrowing
  const [deleteBorrowId, setDeleteBorrowId] = useState<string | null>(null)
  const [deletingBorrow, setDeletingBorrow] = useState(false)

  // Print dialogs for borrow
  const [printBorrowListOpen, setPrintBorrowListOpen] = useState(false)
  const [printBorrowDetailOpen, setPrintBorrowDetailOpen] = useState(false)
  const [printBorrowDetailRecord, setPrintBorrowDetailRecord] = useState<BorrowingData | null>(null)

  // ── Pengembalian state ──
  const [returns, setReturns] = useState<ReturnData[]>([])
  const [loadingReturns, setLoadingReturns] = useState(true)
  const [searchReturns, setSearchReturns] = useState('')

  const [dialogReturnOpen, setDialogReturnOpen] = useState(false)
  const [savingReturn, setSavingReturn] = useState(false)

  const [baNumberReturn, setBaNumberReturn] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [returnBorrowingId, setReturnBorrowingId] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverNip, setReceiverNip] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItemForm[]>([])

  // Delete return
  const [deleteReturnId, setDeleteReturnId] = useState<string | null>(null)
  const [deletingReturn, setDeletingReturn] = useState(false)

  // Print dialogs for return
  const [printReturnListOpen, setPrintReturnListOpen] = useState(false)
  const [printReturnDetailOpen, setPrintReturnDetailOpen] = useState(false)
  const [printReturnDetailRecord, setPrintReturnDetailRecord] = useState<ReturnData | null>(null)

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchBorrowings = useCallback(async () => {
    setLoadingBorrowings(true)
    try {
      const res = await fetch('/api/borrowings')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setBorrowings(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data peminjaman', variant: 'destructive' })
    } finally {
      setLoadingBorrowings(false)
    }
  }, [toast])

  const fetchBorrowers = useCallback(async () => {
    try {
      const res = await fetch('/api/borrowers')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setBorrowers(Array.isArray(data) ? data : [])
    } catch {
      /* silent */
    }
  }, [])

  const fetchReturns = useCallback(async () => {
    setLoadingReturns(true)
    try {
      const res = await fetch('/api/returns')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setReturns(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data pengembalian', variant: 'destructive' })
    } finally {
      setLoadingReturns(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBorrowings()
    fetchBorrowers()
    fetchReturns()
  }, [fetchBorrowings, fetchBorrowers, fetchReturns])

  // ─── Peminjaman handlers ───────────────────────────────────────────────────

  function openAddBorrowDialog() {
    setEditingBorrowing(null)
    setBaNumberBorrow(generateBaNumber('BA-PIN', borrowings.length))
    setBorrowDate(new Date().toISOString().split('T')[0])
    setExpectedReturnDate('')
    setBorrowerId('')
    setPurpose('')
    setBorrowNotes('')
    setBorrowItems([
      { itemName: '', registrationNumber: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' },
    ])
    setDialogBorrowOpen(true)
    fetchPrintSettings().then((s) => {
      setLenderName(s.principalName || '')
      setLenderNip(s.principalNip || '')
    })
  }

  function openEditBorrowDialog(record: BorrowingData) {
    setEditingBorrowing(record)
    setBaNumberBorrow(record.baNumber)
    setBorrowDate(record.borrowDate ? new Date(record.borrowDate).toISOString().split('T')[0] : '')
    setExpectedReturnDate(
      record.expectedReturnDate ? new Date(record.expectedReturnDate).toISOString().split('T')[0] : ''
    )
    setBorrowerId(record.borrowerId)
    setPurpose(record.purpose || '')
    setBorrowNotes(record.notes || '')
    setLenderName(record.lenderName || '')
    setLenderNip(record.lenderNip || '')
    setBorrowItems(
      record.items?.length
        ? record.items.map((i) => ({
            itemName: i.itemName,
            registrationNumber: i.registrationNumber || '',
            quantity: i.quantity,
            unit: i.unit || 'Unit',
            condition: i.condition || 'Baik',
            notes: i.notes || '',
          }))
        : [{ itemName: '', registrationNumber: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' }]
    )
    setDialogBorrowOpen(true)
  }

  function addBorrowItemRow() {
    setBorrowItems([
      ...borrowItems,
      { itemName: '', registrationNumber: '', quantity: 1, unit: 'Unit', condition: 'Baik', notes: '' },
    ])
  }

  function removeBorrowItemRow(index: number) {
    if (borrowItems.length <= 1) return
    setBorrowItems(borrowItems.filter((_, i) => i !== index))
  }

  function updateBorrowItem(index: number, field: keyof BorrowingItemForm, value: string | number) {
    const updated = [...borrowItems]
    updated[index] = { ...updated[index], [field]: value }
    setBorrowItems(updated)
  }

  async function handleAddBorrower() {
    if (!newBorrowerName.trim()) {
      toast({ title: 'Validasi', description: 'Nama peminjam wajib diisi', variant: 'destructive' })
      return
    }
    setSavingBorrower(true)
    try {
      const res = await fetch('/api/borrowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBorrowerName,
          organization: newBorrowerOrg,
          address: newBorrowerAddress,
          phone: newBorrowerPhone,
          role: newBorrowerRole || 'Eksternal',
        }),
      })
      if (!res.ok) throw new Error('Gagal')
      const created: Borrower = await res.json()
      toast({ title: 'Berhasil', description: `Peminjam "${created.name}" ditambahkan` })
      setBorrowers((prev) => [created, ...prev])
      setBorrowerId(created.id)
      setAddBorrowerOpen(false)
      setNewBorrowerName('')
      setNewBorrowerOrg('')
      setNewBorrowerAddress('')
      setNewBorrowerPhone('')
      setNewBorrowerRole('Eksternal')
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah peminjam', variant: 'destructive' })
    } finally {
      setSavingBorrower(false)
    }
  }

  async function handleSaveBorrow() {
    if (!borrowerId) {
      toast({ title: 'Validasi', description: 'Peminjam wajib dipilih', variant: 'destructive' })
      return
    }
    if (borrowItems.some((i) => !i.itemName.trim())) {
      toast({ title: 'Validasi', description: 'Nama barang pada setiap item wajib diisi', variant: 'destructive' })
      return
    }

    setSavingBorrow(true)
    try {
      const body = {
        baNumber: baNumberBorrow,
        borrowDate: borrowDate || new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || null,
        borrowerId,
        purpose,
        notes: borrowNotes,
        lenderName,
        lenderNip,
        items: borrowItems.map((i) => ({
          itemName: i.itemName,
          registrationNumber: i.registrationNumber,
          quantity: i.quantity,
          unit: i.unit,
          condition: i.condition,
          notes: i.notes,
        })),
      }
      const url = editingBorrowing ? `/api/borrowings/${editingBorrowing.id}` : '/api/borrowings'
      const method = editingBorrowing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Berhasil',
        description: editingBorrowing ? 'BA Peminjaman diperbarui' : 'BA Peminjaman dibuat',
      })
      setDialogBorrowOpen(false)
      fetchBorrowings()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan BA Peminjaman', variant: 'destructive' })
    } finally {
      setSavingBorrow(false)
    }
  }

  async function handleDeleteBorrow() {
    if (!deleteBorrowId) return
    setDeletingBorrow(true)
    try {
      const res = await fetch(`/api/borrowings/${deleteBorrowId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'BA Peminjaman dihapus' })
      fetchBorrowings()
      fetchReturns()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus BA Peminjaman', variant: 'destructive' })
    } finally {
      setDeletingBorrow(false)
      setDeleteBorrowId(null)
    }
  }

  // ─── Pengembalian handlers ─────────────────────────────────────────────────

  function openAddReturnDialog() {
    setBaNumberReturn(generateBaNumber('BA-PENG', returns.length))
    setReturnDate(new Date().toISOString().split('T')[0])
    setReturnBorrowingId('')
    setReturnNotes('')
    setReturnItems([])
    setDialogReturnOpen(true)
    fetchPrintSettings().then((s) => {
      setReceiverName(s.principalName || '')
      setReceiverNip(s.principalNip || '')
    })
  }

  function handleSelectBorrowingForReturn(selectedId: string) {
    if (!selectedId || selectedId === '__none__') {
      setReturnBorrowingId('')
      setReturnItems([])
      return
    }
    setReturnBorrowingId(selectedId)
    const borrowing = borrowings.find((b) => b.id === selectedId)
    if (borrowing && borrowing.items?.length) {
      setReturnItems(
        borrowing.items.map((i) => ({
          itemName: i.itemName,
          registrationNumber: i.registrationNumber || '',
          quantity: i.quantity,
          unit: i.unit || 'Unit',
          originalCondition: i.condition || 'Baik',
          returnCondition: i.condition || 'Baik',
          notes: '',
        }))
      )
    } else {
      setReturnItems([])
    }
  }

  function updateReturnItem(index: number, field: keyof ReturnItemForm, value: string) {
    const updated = [...returnItems]
    updated[index] = { ...updated[index], [field]: value }
    setReturnItems(updated)
  }

  async function handleSaveReturn() {
    if (!returnBorrowingId) {
      toast({ title: 'Validasi', description: 'BA Peminjaman wajib dipilih', variant: 'destructive' })
      return
    }

    setSavingReturn(true)
    try {
      const body = {
        baNumber: baNumberReturn,
        returnDate: returnDate || new Date().toISOString(),
        borrowingId: returnBorrowingId,
        notes: returnNotes,
        receiverName,
        receiverNip,
        returnItems: returnItems.map((i) => ({
          itemName: i.itemName,
          condition: i.returnCondition,
          notes: i.notes,
        })),
      }
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'BA Pengembalian dibuat' })
      setDialogReturnOpen(false)
      fetchReturns()
      fetchBorrowings()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan BA Pengembalian', variant: 'destructive' })
    } finally {
      setSavingReturn(false)
    }
  }

  async function handleDeleteReturn() {
    if (!deleteReturnId) return
    setDeletingReturn(true)
    try {
      const res = await fetch(`/api/returns/${deleteReturnId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'BA Pengembalian dihapus' })
      fetchReturns()
      fetchBorrowings()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus BA Pengembalian', variant: 'destructive' })
    } finally {
      setDeletingReturn(false)
      setDeleteReturnId(null)
    }
  }

  // ─── Print handlers ───────────────────────────────────────────────────────

  async function handlePrintBorrowList(orientation: PrintOrientation = 'portrait') {
    if (filteredBorrowings.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }

    const rowsHtml = filteredBorrowings.map((record, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${record.baNumber}</td>
        <td class="text-center">${record.borrowDate ? formatDatePrint(record.borrowDate) : '-'}</td>
        <td>${record.borrower?.name || '-'}</td>
        <td>${record.purpose || '-'}</td>
        <td class="text-center">${record.items?.length || 0}</td>
        <td class="text-center">${record.status}</td>
      </tr>
    `).join('')

    const totalItems = filteredBorrowings.reduce((sum, r) => sum + (r.items?.length || 0), 0)

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th>No. BA</th>
            <th style="width: 110px;">Tanggal Pinjam</th>
            <th>Peminjam</th>
            <th>Keperluan</th>
            <th style="width: 80px;">Jumlah Item</th>
            <th style="width: 90px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total Data:</strong> ${filteredBorrowings.length} dokumen &nbsp;|&nbsp; <strong>Total Item:</strong> ${totalItems} item
      </div>
    `

    await printWithKop('DAFTAR BERITA ACARA PEMINJAMAN', contentHtml, orientation, {
      appendSignature: true,
      signatureOptions: { rightTitle: 'Pengurus Barang', rightSigner: 'goodsManager' },
    })
  }

  async function handlePrintBorrowDetail(record: BorrowingData, orientation: PrintOrientation = 'portrait') {
    try {
      const res = await fetch(`/api/borrowings/${record.id}`)
      if (!res.ok) throw new Error('Gagal')
      const detail: BorrowingData = await res.json()
      const settings = await fetchPrintSettings()
      const borrower = detail.borrower

      const { day, dateNum, month, year } = getDayNameDateMonthYear(detail.borrowDate)

      const lenderNameDisplay = detail.lenderName || settings.principalName || '________________________'
      const lenderNipDisplay = detail.lenderNip || settings.principalNip || ''

      const itemsHtml = (detail.items || []).map((item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.itemName}</td>
          <td class="text-center">${item.registrationNumber || '-'}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${item.unit || '-'}</td>
          <td class="text-center">${item.condition || '-'}</td>
          <td>${item.notes || '-'}</td>
        </tr>
      `).join('')

      const expectedReturnLine = detail.expectedReturnDate
        ? `<tr><td style="width: 30px;"></td><td style="width: 150px;">Tanggal Rencana Kembali</td><td style="width: 10px;">:</td><td>${formatDatePrint(detail.expectedReturnDate)}</td></tr>`
        : ''

      const signatureHtml = `
        <div class="signature-block">
          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <div style="text-align: center; width: 45%;">
              <div>Pemberi Pinjaman,</div>
              <div style="margin-top: 4px;">PIC Sekolah</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">${lenderNameDisplay}</div>
              <div>NIP. ${lenderNipDisplay || '________________________'}</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div>Peminjam,</div>
              <div style="margin-top: 4px;">${borrower?.organization || '&nbsp;'}</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">${borrower?.name || '________________________'}</div>
              <div>${borrower?.phone || '&nbsp;'}</div>
            </div>
          </div>
        </div>
      `

      const contentHtml = `
        <div style="text-align: center; font-size: 11pt; margin-top: 8px; margin-bottom: 12px;">
          Nomor: ${detail.baNumber}
        </div>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          Pada hari ini, <strong>${day}</strong>, tanggal <strong>${dateNum}</strong> bulan <strong>${month}</strong> tahun <strong>${year}</strong>, yang bertanda tangan di bawah ini:
        </p>
        <table class="meta-table" style="margin-top: 6px;">
          <tr>
            <td style="width: 30px;">1.</td>
            <td style="width: 150px;">Nama</td>
            <td style="width: 10px;">:</td>
            <td><strong>${lenderNameDisplay}</strong></td>
          </tr>
          <tr>
            <td></td>
            <td>NIP</td>
            <td>:</td>
            <td>${lenderNipDisplay || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td>Jabatan</td>
            <td>:</td>
            <td>Pemberi Pinjaman (PIC Sekolah)</td>
          </tr>
          <tr><td style="height: 6px;"></td></tr>
          <tr>
            <td>2.</td>
            <td>Nama</td>
            <td>:</td>
            <td><strong>${borrower?.name || '-'}</strong></td>
          </tr>
          <tr>
            <td></td>
            <td>Institusi</td>
            <td>:</td>
            <td>${borrower?.organization || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td>Alamat</td>
            <td>:</td>
            <td>${borrower?.address || '-'}</td>
          </tr>
          ${expectedReturnLine}
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;">
          Telah meminjamkan barang-barang inventaris kepada peminjam dengan rincian sebagai berikut:
        </p>
        <table style="margin-top: 8px;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Nama Barang</th>
              <th style="width: 100px;">No. Register</th>
              <th style="width: 60px;">Jumlah</th>
              <th style="width: 70px;">Satuan</th>
              <th style="width: 100px;">Kondisi</th>
              <th style="width: 150px;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 12px;">
          Barang-barang tersebut di atas akan dikembalikan dalam keadaan baik sesuai dengan jadwal pengembalian. Apabila terjadi kerusakan atau kehilangan, peminjam bertanggung jawab untuk mengganti sesuai dengan nilai barang.
        </p>
        ${signatureHtml}
      `

      await printWithKop('BERITA ACARA PEMINJAMAN BARANG', contentHtml, orientation)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak BA Peminjaman', variant: 'destructive' })
    }
  }

  async function handlePrintReturnList(orientation: PrintOrientation = 'portrait') {
    if (filteredReturns.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }

    const rowsHtml = filteredReturns.map((record, idx) => {
      const borrowBa = record.borrowing?.baNumber || '-'
      const borrowerName = record.borrowing?.borrower?.name || '-'
      const itemCount = record.borrowing?.items?.length || 0
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-center">${record.baNumber}</td>
          <td class="text-center">${record.returnDate ? formatDatePrint(record.returnDate) : '-'}</td>
          <td class="text-center">${borrowBa}</td>
          <td>${borrowerName}</td>
          <td class="text-center">${itemCount}</td>
        </tr>
      `
    }).join('')

    const totalItems = filteredReturns.reduce(
      (sum, r) => sum + (r.borrowing?.items?.length || 0),
      0
    )

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th>No. BA Pengembalian</th>
            <th style="width: 110px;">Tanggal Kembali</th>
            <th>No. BA Peminjaman</th>
            <th>Peminjam</th>
            <th style="width: 80px;">Jumlah Item</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total Data:</strong> ${filteredReturns.length} dokumen &nbsp;|&nbsp; <strong>Total Item:</strong> ${totalItems} item
      </div>
    `

    await printWithKop('DAFTAR BERITA ACARA PENGEMBALIAN', contentHtml, orientation, {
      appendSignature: true,
      signatureOptions: { rightTitle: 'Pengurus Barang', rightSigner: 'goodsManager' },
    })
  }

  async function handlePrintReturnDetail(record: ReturnData, orientation: PrintOrientation = 'portrait') {
    try {
      const res = await fetch('/api/returns')
      if (!res.ok) throw new Error('Gagal')
      const all: ReturnData[] = await res.json()
      const detail = all.find((r) => r.id === record.id)
      if (!detail) throw new Error('Tidak ditemukan')
      const settings = await fetchPrintSettings()

      const borrowing = detail.borrowing
      const borrower = borrowing?.borrower
      const borrowItems = borrowing?.items || []
      const returnItemsParsed = parseReturnItems(detail.returnItems)

      const { day, dateNum, month, year } = getDayNameDateMonthYear(detail.returnDate)

      const receiverNameDisplay = detail.receiverName || settings.principalName || '________________________'
      const receiverNipDisplay = detail.receiverNip || settings.principalNip || ''

      // Build items table rows: pair original item with return condition
      const itemsHtml = borrowItems.map((item, idx) => {
        const matched = returnItemsParsed.find((r) => r.itemName === item.itemName) || returnItemsParsed[idx]
        const returnCond = matched?.condition || item.condition || '-'
        const noteText = matched?.notes || '-'
        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${item.itemName}</td>
            <td class="text-center">${item.registrationNumber || '-'}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-center">${item.condition || '-'}</td>
            <td class="text-center">${returnCond}</td>
            <td>${noteText}</td>
          </tr>
        `
      }).join('')

      const signatureHtml = `
        <div class="signature-block">
          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <div style="text-align: center; width: 45%;">
              <div>Penerima,</div>
              <div style="margin-top: 4px;">PIC Sekolah</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">${receiverNameDisplay}</div>
              <div>NIP. ${receiverNipDisplay || '________________________'}</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div>Peminjam,</div>
              <div style="margin-top: 4px;">${borrower?.organization || '&nbsp;'}</div>
              <div style="height: 60px;"></div>
              <div style="text-decoration: underline; font-weight: bold;">${borrower?.name || '________________________'}</div>
              <div>${borrower?.phone || '&nbsp;'}</div>
            </div>
          </div>
        </div>
      `

      const contentHtml = `
        <div style="text-align: center; font-size: 11pt; margin-top: 8px; margin-bottom: 12px;">
          Nomor: ${detail.baNumber}
        </div>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          Pada hari ini, <strong>${day}</strong>, tanggal <strong>${dateNum}</strong> bulan <strong>${month}</strong> tahun <strong>${year}</strong>, yang bertanda tangan di bawah ini:
        </p>
        <table class="meta-table" style="margin-top: 6px;">
          <tr>
            <td style="width: 30px;">1.</td>
            <td style="width: 150px;">Nama</td>
            <td style="width: 10px;">:</td>
            <td><strong>${receiverNameDisplay}</strong></td>
          </tr>
          <tr>
            <td></td>
            <td>NIP</td>
            <td>:</td>
            <td>${receiverNipDisplay || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td>Jabatan</td>
            <td>:</td>
            <td>Penerima Pengembalian (PIC Sekolah)</td>
          </tr>
          <tr><td style="height: 6px;"></td></tr>
          <tr>
            <td>2.</td>
            <td>Nama</td>
            <td>:</td>
            <td><strong>${borrower?.name || '-'}</strong></td>
          </tr>
          <tr>
            <td></td>
            <td>Institusi</td>
            <td>:</td>
            <td>${borrower?.organization || '-'}</td>
          </tr>
          <tr>
            <td></td>
            <td>Alamat</td>
            <td>:</td>
            <td>${borrower?.address || '-'}</td>
          </tr>
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;">
          Telah menerima kembali barang-barang inventaris yang sebelumnya dipinjam (No. BA Peminjaman: <strong>${borrowing?.baNumber || '-'}</strong>) dengan rincian sebagai berikut:
        </p>
        <table style="margin-top: 8px;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Nama Barang</th>
              <th style="width: 100px;">No. Register</th>
              <th style="width: 60px;">Jumlah</th>
              <th style="width: 110px;">Kondisi Saat Dipinjam</th>
              <th style="width: 120px;">Kondisi Saat Dikembalikan</th>
              <th style="width: 130px;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ${detail.notes ? `<p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;"><strong>Catatan:</strong> ${detail.notes}</p>` : ''}
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 12px;">
          Demikian berita acara pengembalian barang ini dibuat dengan sebenar-benarnya. Barang-barang tersebut telah diterima kembali dalam keadaan baik.
        </p>
        ${signatureHtml}
      `

      await printWithKop('BERITA ACARA PENGEMBALIAN BARANG', contentHtml, orientation)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencetak BA Pengembalian', variant: 'destructive' })
    }
  }

  // ─── Filters ──────────────────────────────────────────────────────────────

  const filteredBorrowings = borrowings.filter((b) => {
    if (!searchBorrowings.trim()) return true
    const q = searchBorrowings.toLowerCase()
    return (
      b.baNumber.toLowerCase().includes(q) ||
      (b.borrower?.name || '').toLowerCase().includes(q) ||
      (b.purpose || '').toLowerCase().includes(q)
    )
  })

  const filteredReturns = returns.filter((r) => {
    if (!searchReturns.trim()) return true
    const q = searchReturns.toLowerCase()
    return (
      r.baNumber.toLowerCase().includes(q) ||
      (r.borrowing?.baNumber || '').toLowerCase().includes(q) ||
      (r.borrowing?.borrower?.name || '').toLowerCase().includes(q)
    )
  })

  // Borrowings yang masih berstatus "Dipinjam" (untuk dropdown di form Pengembalian)
  const availableBorrowingsForReturn = borrowings.filter((b) => b.status === 'Dipinjam')

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title="Berita Acara Peminjaman & Pengembalian"
        description="Pencatatan berita acara peminjaman dan pengembalian barang inventaris"
        icon={ClipboardCheck}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="borrow">
            <FileText className="size-4" />
            Peminjaman
          </TabsTrigger>
          <TabsTrigger value="return">
            <ArrowLeftRight className="size-4" />
            Pengembalian
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: PEMINJAMAN ─────────────────────────────────────────────── */}
        <TabsContent value="borrow" className="space-y-4">
          <Card className="card-pro">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-5" />
                  <div>
                    <CardTitle>Daftar BA Peminjaman</CardTitle>
                    <CardDescription>Riwayat berita acara peminjaman barang</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari BA / peminjam..."
                      value={searchBorrowings}
                      onChange={(e) => setSearchBorrowings(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPrintBorrowListOpen(true)}
                    disabled={loadingBorrowings || filteredBorrowings.length === 0}
                  >
                    <Printer className="size-4 mr-2" />
                    Cetak Daftar
                  </Button>
                  <Button onClick={openAddBorrowDialog}>
                    <Plus className="size-4 mr-2" />
                    Tambah BA Peminjaman
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBorrowings ? (
                <PageLoading label="Memuat data BA Peminjaman..." />
              ) : filteredBorrowings.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Belum ada data"
                  description={
                    searchBorrowings
                      ? 'Tidak ditemukan data yang sesuai'
                      : 'Klik "Tambah BA Peminjaman" untuk membuat berita acara baru'
                  }
                />
              ) : (
                <div className="max-h-[520px] overflow-y-auto rounded-md border">
                  <Table className="table-pro">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px] text-left">Aksi</TableHead>
                        <TableHead className="w-[50px]">No</TableHead>
                        <TableHead>No. BA</TableHead>
                        <TableHead>Tanggal Pinjam</TableHead>
                        <TableHead>Peminjam</TableHead>
                        <TableHead>Keperluan</TableHead>
                        <TableHead className="text-right">Jumlah Item</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBorrowings.map((record, idx) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => {
                                  setPrintBorrowDetailRecord(record)
                                  setPrintBorrowDetailOpen(true)
                                }}
                                title="Cetak BA"
                              >
                                <Printer className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openEditBorrowDialog(record)}
                                title="Edit"
                                disabled={record.status === 'Dikembalikan'}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => {
                                  setActiveTab('return')
                                  setTimeout(() => openAddReturnDialog(), 50)
                                  // Pre-select this borrowing in return form
                                  setTimeout(() => {
                                    setReturnBorrowingId(record.id)
                                    if (record.items?.length) {
                                      setReturnItems(
                                        record.items.map((i) => ({
                                          itemName: i.itemName,
                                          registrationNumber: i.registrationNumber || '',
                                          quantity: i.quantity,
                                          unit: i.unit || 'Unit',
                                          originalCondition: i.condition || 'Baik',
                                          returnCondition: i.condition || 'Baik',
                                          notes: '',
                                        }))
                                      )
                                    }
                                  }, 100)
                                }}
                                title="Buat BA Pengembalian"
                                disabled={record.status === 'Dikembalikan'}
                              >
                                <ArrowLeftRight className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteBorrowId(record.id)}
                                title="Hapus"
                                disabled={record.status === 'Dikembalikan'}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{record.baNumber}</TableCell>
                          <TableCell>{formatDate(record.borrowDate)}</TableCell>
                          <TableCell>{record.borrower?.name || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={record.purpose || ''}>
                            {record.purpose || '-'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {record.items?.length || 0}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={record.status === 'Dipinjam' ? 'secondary' : 'default'}
                              className={
                                record.status === 'Dipinjam'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }
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
        </TabsContent>

        {/* ─── TAB 2: PENGEMBALIAN ──────────────────────────────────────────── */}
        <TabsContent value="return" className="space-y-4">
          <Card className="card-pro">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="size-5" />
                  <div>
                    <CardTitle>Daftar BA Pengembalian</CardTitle>
                    <CardDescription>Riwayat berita acara pengembalian barang</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari BA / peminjam..."
                      value={searchReturns}
                      onChange={(e) => setSearchReturns(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPrintReturnListOpen(true)}
                    disabled={loadingReturns || filteredReturns.length === 0}
                  >
                    <Printer className="size-4 mr-2" />
                    Cetak Daftar
                  </Button>
                  <Button onClick={openAddReturnDialog} disabled={availableBorrowingsForReturn.length === 0}>
                    <Plus className="size-4 mr-2" />
                    Tambah BA Pengembalian
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReturns ? (
                <PageLoading label="Memuat data BA Pengembalian..." />
              ) : filteredReturns.length === 0 ? (
                <EmptyState
                  icon={ArrowLeftRight}
                  title="Belum ada data"
                  description={
                    searchReturns
                      ? 'Tidak ditemukan data yang sesuai'
                      : availableBorrowingsForReturn.length === 0
                        ? 'Belum ada BA Peminjaman yang berstatus "Dipinjam". Buat BA Peminjaman terlebih dahulu.'
                        : 'Klik "Tambah BA Pengembalian" untuk membuat berita acara baru'
                  }
                />
              ) : (
                <div className="max-h-[520px] overflow-y-auto rounded-md border">
                  <Table className="table-pro">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] text-left">Aksi</TableHead>
                        <TableHead className="w-[50px]">No</TableHead>
                        <TableHead>No. BA Pengembalian</TableHead>
                        <TableHead>Tanggal Kembali</TableHead>
                        <TableHead>No. BA Peminjaman</TableHead>
                        <TableHead>Peminjam</TableHead>
                        <TableHead className="text-right">Jumlah Item</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReturns.map((record, idx) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => {
                                  setPrintReturnDetailRecord(record)
                                  setPrintReturnDetailOpen(true)
                                }}
                                title="Cetak BA"
                              >
                                <Printer className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteReturnId(record.id)}
                                title="Hapus"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{record.baNumber}</TableCell>
                          <TableCell>{formatDate(record.returnDate)}</TableCell>
                          <TableCell>{record.borrowing?.baNumber || '-'}</TableCell>
                          <TableCell>{record.borrowing?.borrower?.name || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {record.borrowing?.items?.length || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Dialog: Add/Edit BA Peminjaman ────────────────────────────────── */}
      <Dialog open={dialogBorrowOpen} onOpenChange={setDialogBorrowOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{editingBorrowing ? 'Edit BA Peminjaman' : 'Tambah BA Peminjaman'}</DialogTitle>
            <DialogDescription>
              {editingBorrowing ? 'Perbarui data berita acara peminjaman' : 'Isi data berita acara peminjaman baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Section: Identitas */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Identitas
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nomor BA</Label>
                    <Input
                      value={baNumberBorrow}
                      onChange={(e) => setBaNumberBorrow(e.target.value)}
                      placeholder="mis. 001/BA-PIN/2026"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Pinjam *</Label>
                    <Input
                      type="date"
                      value={borrowDate}
                      onChange={(e) => setBorrowDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Rencana Kembali</Label>
                    <Input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Keperluan</Label>
                    <Input
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="mis. Kegiatan upacara, Lomba, dll."
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Peminjam *</Label>
                    <div className="flex gap-2">
                      <Select value={borrowerId} onValueChange={setBorrowerId}>
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue placeholder="Pilih peminjam" />
                        </SelectTrigger>
                        <SelectContent>
                          {borrowers.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                              {b.organization ? ` · ${b.organization}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 shrink-0"
                        onClick={() => setAddBorrowerOpen(true)}
                        title="Tambah peminjam baru"
                      >
                        <UserPlus className="size-4 mr-1.5" />
                        Tambah Peminjam
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Daftar Barang */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Daftar Barang
                  </div>
                  <Button size="sm" variant="outline" onClick={addBorrowItemRow}>
                    <Plus className="size-4 mr-1" />
                    Tambah Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {borrowItems.map((item, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2 bg-background">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-4 space-y-1">
                          <Label className="text-xs">Nama Barang</Label>
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateBorrowItem(idx, 'itemName', e.target.value)}
                            placeholder="Nama barang"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3 space-y-1">
                          <Label className="text-xs">No. Register</Label>
                          <Input
                            value={item.registrationNumber}
                            onChange={(e) => updateBorrowItem(idx, 'registrationNumber', e.target.value)}
                            placeholder="mis. INV-001"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2 space-y-1">
                          <Label className="text-xs">Jumlah</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateBorrowItem(idx, 'quantity', Number(e.target.value) || 1)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2 space-y-1">
                          <Label className="text-xs">Satuan</Label>
                          <MasterCombobox
                            category="satuan"
                            value={item.unit}
                            onChange={(val) => updateBorrowItem(idx, 'unit', val)}
                            placeholder="Satuan"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-destructive hover:text-destructive"
                            onClick={() => removeBorrowItemRow(idx)}
                            disabled={borrowItems.length <= 1}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-6 space-y-1">
                          <Label className="text-xs">Kondisi</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(val) => updateBorrowItem(idx, 'condition', val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
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
                        <div className="col-span-12 sm:col-span-6 space-y-1">
                          <Label className="text-xs">Catatan (opsional)</Label>
                          <Input
                            value={item.notes}
                            onChange={(e) => updateBorrowItem(idx, 'notes', e.target.value)}
                            placeholder="Catatan item"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold">
                    Total: {borrowItems.reduce((sum, i) => sum + i.quantity, 0)} unit ({borrowItems.length} jenis)
                  </div>
                </div>
              </div>

              {/* Section: Penandatangan */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Penandatangan
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nama Pemberi Pinjaman (PIC Sekolah)</Label>
                    <Input
                      value={lenderName}
                      onChange={(e) => setLenderName(e.target.value)}
                      placeholder="Default: Kepala Sekolah"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">NIP</Label>
                    <Input
                      value={lenderNip}
                      onChange={(e) => setLenderNip(e.target.value)}
                      placeholder="NIP"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label className="text-xs">Catatan (opsional)</Label>
                <Textarea
                  value={borrowNotes}
                  onChange={(e) => setBorrowNotes(e.target.value)}
                  placeholder="Catatan tambahan"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
            <Button variant="outline" onClick={() => setDialogBorrowOpen(false)} disabled={savingBorrow}>
              Batal
            </Button>
            <Button onClick={handleSaveBorrow} disabled={savingBorrow}>
              {savingBorrow && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingBorrowing ? 'Simpan Perubahan' : 'Simpan BA Peminjaman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Add Borrower (inline, di atas dialog BA) ────────────────── */}
      <Dialog open={addBorrowerOpen} onOpenChange={setAddBorrowerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Tambah Peminjam Baru
            </DialogTitle>
            <DialogDescription>
              Data peminjam akan disimpan ke master peminjam untuk digunakan kembali.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Peminjam *</Label>
              <Input
                value={newBorrowerName}
                onChange={(e) => setNewBorrowerName(e.target.value)}
                placeholder="Nama lengkap peminjam"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Institusi / Organisasi</Label>
                <Input
                  value={newBorrowerOrg}
                  onChange={(e) => setNewBorrowerOrg(e.target.value)}
                  placeholder="mis. SMA Negeri 1"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No. HP / Telp</Label>
                <Input
                  value={newBorrowerPhone}
                  onChange={(e) => setNewBorrowerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alamat</Label>
              <Textarea
                value={newBorrowerAddress}
                onChange={(e) => setNewBorrowerAddress(e.target.value)}
                placeholder="Alamat peminjam"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori Peminjam</Label>
              <Select value={newBorrowerRole} onValueChange={setNewBorrowerRole}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eksternal">Eksternal</SelectItem>
                  <SelectItem value="Pegawai">Pegawai</SelectItem>
                  <SelectItem value="Siswa">Siswa</SelectItem>
                  <SelectItem value="Instansi Lain">Instansi Lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBorrowerOpen(false)} disabled={savingBorrower}>
              Batal
            </Button>
            <Button onClick={handleAddBorrower} disabled={savingBorrower}>
              {savingBorrower && <Loader2 className="size-4 mr-2 animate-spin" />}
              Simpan Peminjam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Add BA Pengembalian ────────────────────────────────────── */}
      <Dialog open={dialogReturnOpen} onOpenChange={setDialogReturnOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Tambah BA Pengembalian</DialogTitle>
            <DialogDescription>
              Pilih BA Peminjaman yang akan dikembalikan dan isi kondisi barang saat diterima.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Section: Pilih BA Peminjaman */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Pilih BA Peminjaman
                </div>
                <div className="space-y-2">
                  <Select
                    value={returnBorrowingId || '__none__'}
                    onValueChange={handleSelectBorrowingForReturn}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih BA Peminjaman yang berstatus Dipinjam" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Pilih BA Peminjaman —</SelectItem>
                      {availableBorrowingsForReturn.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.baNumber} · {b.borrower?.name || '-'}
                          {b.borrowDate ? ` · ${formatDate(b.borrowDate)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableBorrowingsForReturn.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Tidak ada BA Peminjaman yang berstatus &quot;Dipinjam&quot;.
                    </p>
                  )}
                </div>
              </div>

              {/* Section: Tanggal & Catatan */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Tanggal & Catatan
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nomor BA Pengembalian</Label>
                    <Input
                      value={baNumberReturn}
                      onChange={(e) => setBaNumberReturn(e.target.value)}
                      placeholder="mis. 001/BA-PENG/2026"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tanggal Pengembalian *</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 mt-3">
                  <Label className="text-xs">Catatan (opsional)</Label>
                  <Textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Catatan tambahan pengembalian"
                    rows={2}
                  />
                </div>
              </div>

              {/* Section: Daftar Barang + Kondisi Saat Dikembalikan */}
              {returnItems.length > 0 && (
                <div className="rounded-md border p-3 bg-muted/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Daftar Barang & Kondisi Saat Dikembalikan
                  </div>
                  <div className="space-y-2">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="border rounded-md p-3 space-y-2 bg-background">
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 sm:col-span-4 space-y-1">
                            <Label className="text-xs">Nama Barang</Label>
                            <Input
                              value={item.itemName}
                              onChange={(e) => updateReturnItem(idx, 'itemName', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-3 space-y-1">
                            <Label className="text-xs">No. Register</Label>
                            <Input
                              value={item.registrationNumber}
                              onChange={(e) => updateReturnItem(idx, 'registrationNumber', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2 space-y-1">
                            <Label className="text-xs">Jumlah</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              readOnly
                              className="h-9 bg-muted/40"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2 space-y-1">
                            <Label className="text-xs">Kondisi Awal</Label>
                            <Input
                              value={item.originalCondition}
                              readOnly
                              className="h-9 bg-muted/40"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 sm:col-span-6 space-y-1">
                            <Label className="text-xs">Kondisi Saat Dikembalikan</Label>
                            <Select
                              value={item.returnCondition}
                              onValueChange={(val) => updateReturnItem(idx, 'returnCondition', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
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
                          <div className="col-span-12 sm:col-span-6 space-y-1">
                            <Label className="text-xs">Catatan (opsional)</Label>
                            <Input
                              value={item.notes}
                              onChange={(e) => updateReturnItem(idx, 'notes', e.target.value)}
                              placeholder="Catatan item saat dikembalikan"
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Penandatangan */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Penandatangan
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nama Penerima (PIC Sekolah)</Label>
                    <Input
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Default: Kepala Sekolah"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">NIP</Label>
                    <Input
                      value={receiverNip}
                      onChange={(e) => setReceiverNip(e.target.value)}
                      placeholder="NIP"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
            <Button variant="outline" onClick={() => setDialogReturnOpen(false)} disabled={savingReturn}>
              Batal
            </Button>
            <Button onClick={handleSaveReturn} disabled={savingReturn || !returnBorrowingId}>
              {savingReturn && <Loader2 className="size-4 mr-2 animate-spin" />}
              Simpan BA Pengembalian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation: BA Peminjaman ────────────────────────────── */}
      <AlertDialog
        open={!!deleteBorrowId}
        onOpenChange={(open) => {
          if (!open) setDeleteBorrowId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus BA Peminjaman ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBorrow}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBorrow}
              disabled={deletingBorrow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBorrow && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Confirmation: BA Pengembalian ───────────────────────────── */}
      <AlertDialog
        open={!!deleteReturnId}
        onOpenChange={(open) => {
          if (!open) setDeleteReturnId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus BA Pengembalian ini? Status peminjaman terkait akan kembali menjadi &quot;Dipinjam&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingReturn}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReturn}
              disabled={deletingReturn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingReturn && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Print Dialogs ──────────────────────────────────────────────────── */}
      <PrintDialog
        open={printBorrowListOpen}
        onOpenChange={setPrintBorrowListOpen}
        onPrint={handlePrintBorrowList}
        title="Cetak Daftar BA Peminjaman"
      />
      <PrintDialog
        open={printBorrowDetailOpen}
        onOpenChange={(open) => {
          setPrintBorrowDetailOpen(open)
          if (!open) setPrintBorrowDetailRecord(null)
        }}
        onPrint={(orientation: PrintOrientation) => {
          if (printBorrowDetailRecord) handlePrintBorrowDetail(printBorrowDetailRecord, orientation)
        }}
        title="Cetak BA Peminjaman"
        description="Pilih orientasi halaman sebelum mencetak BA Peminjaman"
      />
      <PrintDialog
        open={printReturnListOpen}
        onOpenChange={setPrintReturnListOpen}
        onPrint={handlePrintReturnList}
        title="Cetak Daftar BA Pengembalian"
      />
      <PrintDialog
        open={printReturnDetailOpen}
        onOpenChange={(open) => {
          setPrintReturnDetailOpen(open)
          if (!open) setPrintReturnDetailRecord(null)
        }}
        onPrint={(orientation: PrintOrientation) => {
          if (printReturnDetailRecord) handlePrintReturnDetail(printReturnDetailRecord, orientation)
        }}
        title="Cetak BA Pengembalian"
        description="Pilih orientasi halaman sebelum mencetak BA Pengembalian"
      />
    </PageContainer>
  )
}
