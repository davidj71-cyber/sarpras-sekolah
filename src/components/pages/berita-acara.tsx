'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Camera,
  Upload,
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
import { resizeImageFile } from '@/lib/resize-image'
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
  // Foto bukti peminjaman — JSON array of base64 data URLs
  proofPhotos?: string
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
  // Foto bukti pengembalian — JSON array of base64 data URLs
  proofPhotos?: string
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

// Photo upload config: maks 5 foto, 10MB per foto, auto-resize ke 1024px JPEG 0.85.
const MAX_PROOF_PHOTOS = 5
const MAX_PROOF_SIZE = 10 * 1024 * 1024 // 10 MB input file limit

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

// Parse kolom proofPhotos (JSON array of base64 data URLs) menjadi string[].
function parsePhotosArray(raw: string | undefined | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((p: unknown) => typeof p === 'string')
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

  // ── Foto bukti (base64 data URLs) ──
  // Foto barang saat dipinjam/dikembalikan sebagai pelengkap BA.
  // Maks 5 foto, 10MB per foto. Auto-resize ke 1024px JPEG 0.85.
  // Mendukung kamera Android via capture="environment".
  const [borrowPhotos, setBorrowPhotos] = useState<string[]>([])
  const [borrowPhotoUploading, setBorrowPhotoUploading] = useState(false)
  const [returnPhotos, setReturnPhotos] = useState<string[]>([])
  const [returnPhotoUploading, setReturnPhotoUploading] = useState(false)
  const borrowFileInputRef = useRef<HTMLInputElement | null>(null)
  const borrowCameraInputRef = useRef<HTMLInputElement | null>(null)
  const returnFileInputRef = useRef<HTMLInputElement | null>(null)
  const returnCameraInputRef = useRef<HTMLInputElement | null>(null)
  // Shared photo viewer dialog (dipakai untuk thumbnail borrow & return)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoViewerImages, setPhotoViewerImages] = useState<string[]>([])
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0)

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
    setBorrowPhotos([])
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
    setBorrowPhotos(parsePhotosArray(record.proofPhotos))
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

  // ── Photo upload handlers (bukti peminjaman) ──────────────────────────────
  // Maks 5 foto, 10MB per foto. Auto-resize ke 1024px JPEG 0.85.
  // Mendukung kamera Android via capture="environment".
  async function handleBorrowPhotoUpload(files: FileList, source: 'file' | 'camera') {
    if (borrowPhotos.length + files.length > MAX_PROOF_PHOTOS) {
      toast({
        title: 'Batas Foto Tercapai',
        description: `Maksimal ${MAX_PROOF_PHOTOS} foto. Saat ini sudah ada ${borrowPhotos.length} foto.`,
        variant: 'destructive',
      })
      if (source === 'file' && borrowFileInputRef.current) borrowFileInputRef.current.value = ''
      if (source === 'camera' && borrowCameraInputRef.current) borrowCameraInputRef.current.value = ''
      return
    }

    setBorrowPhotoUploading(true)
    const newPhotos: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: bukan gambar`)
        continue
      }
      if (file.size > MAX_PROOF_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        errors.push(`${file.name}: ${sizeMB}MB (maks 10MB)`)
        continue
      }
      if (file.size === 0) {
        errors.push(`${file.name}: file kosong`)
        continue
      }
      try {
        const { dataUrl } = await resizeImageFile(file, 1024, 0.85)
        newPhotos.push(dataUrl)
      } catch {
        errors.push(`${file.name}: gagal diproses`)
      }
    }

    if (newPhotos.length > 0) {
      setBorrowPhotos((prev) => [...prev, ...newPhotos])
      toast({ title: 'Foto ditambahkan', description: `${newPhotos.length} foto bukti peminjaman` })
    }
    if (errors.length > 0) {
      toast({ title: 'Beberapa foto gagal', description: errors.join('; '), variant: 'destructive' })
    }

    if (source === 'file' && borrowFileInputRef.current) borrowFileInputRef.current.value = ''
    if (source === 'camera' && borrowCameraInputRef.current) borrowCameraInputRef.current.value = ''
    setBorrowPhotoUploading(false)
  }

  function removeBorrowPhoto(idx: number) {
    setBorrowPhotos((prev) => prev.filter((_, i) => i !== idx))
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
        proofPhotos: borrowPhotos,
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
    setReturnPhotos([])
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

  // ── Photo upload handlers (bukti pengembalian) ────────────────────────────
  // Maks 5 foto, 10MB per foto. Auto-resize ke 1024px JPEG 0.85.
  async function handleReturnPhotoUpload(files: FileList, source: 'file' | 'camera') {
    if (returnPhotos.length + files.length > MAX_PROOF_PHOTOS) {
      toast({
        title: 'Batas Foto Tercapai',
        description: `Maksimal ${MAX_PROOF_PHOTOS} foto. Saat ini sudah ada ${returnPhotos.length} foto.`,
        variant: 'destructive',
      })
      if (source === 'file' && returnFileInputRef.current) returnFileInputRef.current.value = ''
      if (source === 'camera' && returnCameraInputRef.current) returnCameraInputRef.current.value = ''
      return
    }

    setReturnPhotoUploading(true)
    const newPhotos: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: bukan gambar`)
        continue
      }
      if (file.size > MAX_PROOF_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        errors.push(`${file.name}: ${sizeMB}MB (maks 10MB)`)
        continue
      }
      if (file.size === 0) {
        errors.push(`${file.name}: file kosong`)
        continue
      }
      try {
        const { dataUrl } = await resizeImageFile(file, 1024, 0.85)
        newPhotos.push(dataUrl)
      } catch {
        errors.push(`${file.name}: gagal diproses`)
      }
    }

    if (newPhotos.length > 0) {
      setReturnPhotos((prev) => [...prev, ...newPhotos])
      toast({ title: 'Foto ditambahkan', description: `${newPhotos.length} foto bukti pengembalian` })
    }
    if (errors.length > 0) {
      toast({ title: 'Beberapa foto gagal', description: errors.join('; '), variant: 'destructive' })
    }

    if (source === 'file' && returnFileInputRef.current) returnFileInputRef.current.value = ''
    if (source === 'camera' && returnCameraInputRef.current) returnCameraInputRef.current.value = ''
    setReturnPhotoUploading(false)
  }

  function removeReturnPhoto(idx: number) {
    setReturnPhotos((prev) => prev.filter((_, i) => i !== idx))
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
        proofPhotos: returnPhotos,
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
      showPrintDate: false,
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
      const lenderJabatan = settings.principalName ? 'Kepala Sekolah' : 'Pemberi Pinjaman'

      const itemsHtml = (detail.items || []).map((item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.itemName}</td>
          <td class="text-center">${item.registrationNumber || ''}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${item.unit || ''}</td>
          <td class="text-center">${item.condition || ''}</td>
          <td>${item.notes || ''}</td>
        </tr>
      `).join('')

      const expectedReturnLine = detail.expectedReturnDate
        ? `<tr><td style="width: 30px;"></td><td style="width: 150px;">Tanggal Rencana Kembali</td><td style="width: 10px;">:</td><td>${formatDatePrint(detail.expectedReturnDate)}</td></tr>`
        : ''

      // Signature block mengikuti format BA Pinjam-Pakai:
      // Kiri = PIHAK PERTAMA (Pemberi/PIC Sekolah), Kanan = PIHAK KEDUA (Peminjam)
      const signatureHtml = `
        <div style="text-align: right; margin-top: 20px; font-size: 11pt;">
          ${settings.address ? (settings.address.split(',').pop()?.trim() || '___________') : '___________'}, ${formatDatePrint(detail.borrowDate)}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 11pt;">
          <div style="text-align: center; width: 45%;">
            <div><strong>PIHAK PERTAMA,</strong></div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${lenderNameDisplay}</div>
            <div style="font-weight: bold; text-decoration: underline;">NIP. ${lenderNipDisplay || '________________________'}</div>
          </div>
          <div style="text-align: center; width: 45%;">
            <div><strong>PIHAK KEDUA,</strong></div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${borrower?.name || '________________________'}</div>
            <div>${borrower?.organization || '&nbsp;'}</div>
          </div>
        </div>
      `

      // Foto bukti peminjaman (jika ada) — render grid di bawah signature
      const borrowPhotosParsed = parsePhotosArray(detail.proofPhotos)
      const borrowPhotosHtml = borrowPhotosParsed.length > 0
        ? `
            <div style="margin-top: 16px;">
              <div style="font-weight: bold; font-size: 11pt; margin-bottom: 8px;">Foto Bukti Peminjaman:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${borrowPhotosParsed.map((p) => `<img src="${p}" style="width: 150px; height: 150px; object-fit: cover; border: 1px solid #333;" />`).join('')}
              </div>
            </div>
          `
        : ''

      const contentHtml = `
        <div style="text-align: center; margin-top: 8px; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">BERITA ACARA PINJAM-PAKAI</div>
          <div style="font-size: 11pt; margin-top: 6px;">Nomor: ${detail.baNumber}</div>
        </div>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          Pada hari ini, <strong>${day}</strong>, tanggal <strong>${dateNum}</strong> bulan <strong>${month}</strong> tahun <strong>${year}</strong>, kami yang bertanda tangan di bawah ini masing-masing:
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
            <td>${lenderJabatan}</td>
          </tr>
          <tr>
            <td></td>
            <td style="vertical-align: top;">Instansi</td>
            <td>:</td>
            <td>${settings.schoolName || '-'}</td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
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
          <tr>
            <td></td>
            <td>No. HP/Telp</td>
            <td>:</td>
            <td>${borrower?.phone || '-'}</td>
          </tr>
          ${expectedReturnLine}
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;">
          Dalam rangka menunjang kelancaran tugas dan ketertiban administrasi ${settings.schoolName || 'sekolah'}, maka <strong>PIHAK PERTAMA</strong> telah menyerahkan kepada <strong>PIHAK KEDUA</strong> barang-barang inventaris dengan kondisi baik dan rincian sebagai berikut:
        </p>
        <table style="margin-top: 8px;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Nama Barang</th>
              <th style="width: 100px;">No. Register</th>
              <th style="width: 60px;">Jumlah</th>
              <th style="width: 60px;">Satuan</th>
              <th style="width: 80px;">Kondisi</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 12px;">
          Selanjutnya segala biaya pemeliharaan, perbaikan dan sebagainya ditanggung oleh <strong>PIHAK KEDUA</strong>, dan terhitung sejak Berita Acara Pinjam-Pakai ini ditanda tangani segala tugas/kewajiban serta tanggung jawab atas penggunaan barang tersebut beralih dari <strong>PIHAK PERTAMA</strong> kepada <strong>PIHAK KEDUA</strong>. Apabila terjadi kerusakan atau kehilangan, <strong>PIHAK KEDUA</strong> bertanggung jawab untuk mengganti sesuai dengan nilai barang.
        </p>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 8px;">
          Demikian Berita Acara Pinjam-Pakai ini dibuat dan ditanda tangani untuk dipergunakan sebagaimana mestinya.
        </p>
        ${signatureHtml}
        ${borrowPhotosHtml}
      `

      await printWithKop('', contentHtml, orientation, { showPrintDate: false })
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
      showPrintDate: false,
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
      const receiverJabatan = settings.principalName ? 'Kepala Sekolah' : 'Penerima Pengembalian'

      // Build items table rows: pair original item with return condition
      const itemsHtml = borrowItems.map((item, idx) => {
        const matched = returnItemsParsed.find((r) => r.itemName === item.itemName) || returnItemsParsed[idx]
        const returnCond = matched?.condition || item.condition || ''
        const noteText = matched?.notes || ''
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

      // Signature block: PIHAK PERTAMA (Penerima = sekolah), PIHAK KEDUA (Peminjam)
      const signatureHtml = `
        <div style="text-align: right; margin-top: 20px; font-size: 11pt;">
          ${settings.address ? (settings.address.split(',').pop()?.trim() || '___________') : '___________'}, ${formatDatePrint(detail.returnDate)}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 11pt;">
          <div style="text-align: center; width: 45%;">
            <div><strong>PIHAK PERTAMA,</strong></div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${receiverNameDisplay}</div>
            <div style="font-weight: bold; text-decoration: underline;">NIP. ${receiverNipDisplay || '________________________'}</div>
          </div>
          <div style="text-align: center; width: 45%;">
            <div><strong>PIHAK KEDUA,</strong></div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${borrower?.name || '________________________'}</div>
            <div>${borrower?.organization || '&nbsp;'}</div>
          </div>
        </div>
      `

      // Foto bukti pengembalian (jika ada) — render grid di bawah signature
      const returnPhotosParsed = parsePhotosArray(detail.proofPhotos)
      const returnPhotosHtml = returnPhotosParsed.length > 0
        ? `
            <div style="margin-top: 16px;">
              <div style="font-weight: bold; font-size: 11pt; margin-bottom: 8px;">Foto Bukti Pengembalian:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${returnPhotosParsed.map((p) => `<img src="${p}" style="width: 150px; height: 150px; object-fit: cover; border: 1px solid #333;" />`).join('')}
              </div>
            </div>
          `
        : ''

      const contentHtml = `
        <div style="text-align: center; margin-top: 8px; margin-bottom: 12px;">
          <div style="font-size: 13pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">BERITA ACARA PENGEMBALIAN BARANG</div>
          <div style="font-size: 11pt; margin-top: 6px;">Nomor: ${detail.baNumber}</div>
        </div>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          Pada hari ini, <strong>${day}</strong>, tanggal <strong>${dateNum}</strong> bulan <strong>${month}</strong> tahun <strong>${year}</strong>, kami yang bertanda tangan di bawah ini masing-masing:
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
            <td>${receiverJabatan}</td>
          </tr>
          <tr>
            <td></td>
            <td style="vertical-align: top;">Instansi</td>
            <td>:</td>
            <td>${settings.schoolName || '-'}</td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
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
          <tr>
            <td></td>
            <td>No. HP/Telp</td>
            <td>:</td>
            <td>${borrower?.phone || '-'}</td>
          </tr>
        </table>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;">
          Telah menerima kembali barang-barang inventaris yang sebelumnya dipinjamkan (No. BA Pinjam-Pakai: <strong>${borrowing?.baNumber || '-'}</strong>) oleh <strong>PIHAK PERTAMA</strong> kepada <strong>PIHAK KEDUA</strong>, dengan rincian sebagai berikut:
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
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ${detail.notes ? `<p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;"><strong>Catatan:</strong> ${detail.notes}</p>` : ''}
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 12px;">
          Barang-barang tersebut telah diterima kembali oleh <strong>PIHAK PERTAMA</strong> dari <strong>PIHAK KEDUA</strong> dalam keadaan baik. Segala tugas/kewajiban serta tanggung jawab atas penggunaan barang tersebut beralih kembali dari <strong>PIHAK KEDUA</strong> kepada <strong>PIHAK PERTAMA</strong>.
        </p>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 8px;">
          Demikian Berita Acara Pengembalian barang ini dibuat dan ditanda tangani untuk dipergunakan sebagaimana mestinya.
        </p>
        ${signatureHtml}
        ${returnPhotosHtml}
      `

      await printWithKop('', contentHtml, orientation, { showPrintDate: false })
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

              {/* Section: Foto Bukti Peminjaman */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Foto Bukti Peminjaman (opsional)</div>
                <p className="text-xs text-muted-foreground mb-2">
                  Foto barang saat dipinjam. Maks {MAX_PROOF_PHOTOS} foto, 10MB per foto.
                </p>
                {/* Hidden file inputs */}
                <input
                  ref={borrowFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleBorrowPhotoUpload(e.target.files, 'file')
                    }
                  }}
                  className="hidden"
                />
                <input
                  ref={borrowCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleBorrowPhotoUpload(e.target.files, 'camera')
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
                    onClick={() => borrowFileInputRef.current?.click()}
                    disabled={borrowPhotoUploading || borrowPhotos.length >= MAX_PROOF_PHOTOS}
                  >
                    {borrowPhotoUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                    Pilih File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => borrowCameraInputRef.current?.click()}
                    disabled={borrowPhotoUploading || borrowPhotos.length >= MAX_PROOF_PHOTOS}
                  >
                    <Camera className="size-4 mr-2" />
                    Ambil Foto
                  </Button>
                  {borrowPhotos.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {borrowPhotos.length} / {MAX_PROOF_PHOTOS} foto
                    </span>
                  )}
                </div>
                {/* Photo thumbnails */}
                {borrowPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
                    {borrowPhotos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-md border overflow-hidden bg-muted"
                      >
                        <img
                          src={photo}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setPhotoViewerImages(borrowPhotos)
                            setPhotoViewerIndex(idx)
                            setPhotoViewerOpen(true)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeBorrowPhoto(idx)}
                          className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus foto"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

              {/* Section: Foto Bukti Pengembalian */}
              <div className="rounded-md border p-3 bg-muted/20">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Foto Bukti Pengembalian (opsional)</div>
                <p className="text-xs text-muted-foreground mb-2">
                  Foto barang saat dikembalikan. Maks {MAX_PROOF_PHOTOS} foto, 10MB per foto.
                </p>
                {/* Hidden file inputs */}
                <input
                  ref={returnFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleReturnPhotoUpload(e.target.files, 'file')
                    }
                  }}
                  className="hidden"
                />
                <input
                  ref={returnCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleReturnPhotoUpload(e.target.files, 'camera')
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
                    onClick={() => returnFileInputRef.current?.click()}
                    disabled={returnPhotoUploading || returnPhotos.length >= MAX_PROOF_PHOTOS}
                  >
                    {returnPhotoUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                    Pilih File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => returnCameraInputRef.current?.click()}
                    disabled={returnPhotoUploading || returnPhotos.length >= MAX_PROOF_PHOTOS}
                  >
                    <Camera className="size-4 mr-2" />
                    Ambil Foto
                  </Button>
                  {returnPhotos.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {returnPhotos.length} / {MAX_PROOF_PHOTOS} foto
                    </span>
                  )}
                </div>
                {/* Photo thumbnails */}
                {returnPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
                    {returnPhotos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-md border overflow-hidden bg-muted"
                      >
                        <img
                          src={photo}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setPhotoViewerImages(returnPhotos)
                            setPhotoViewerIndex(idx)
                            setPhotoViewerOpen(true)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeReturnPhoto(idx)}
                          className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus foto"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* ─── Photo Viewer Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={photoViewerOpen}
        onOpenChange={(open) => {
          setPhotoViewerOpen(open)
          if (!open) setPhotoViewerIndex(0)
        }}
      >
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Pratinjau Foto Bukti</DialogTitle>
          {photoViewerImages.length > 0 && (
            <div className="relative">
              <img
                src={photoViewerImages[photoViewerIndex]}
                alt={`Bukti ${photoViewerIndex + 1}`}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {photoViewerImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhotoViewerIndex((i) => (i - 1 + photoViewerImages.length) % photoViewerImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoViewerIndex((i) => (i + 1) % photoViewerImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    ›
                  </button>
                </>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
                {photoViewerIndex + 1} / {photoViewerImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
