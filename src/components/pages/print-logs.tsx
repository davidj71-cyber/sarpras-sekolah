'use client'

// ─── Rekap Pencetakan ────────────────────────────────────────────────────────
// Halaman riwayat pencetakan untuk 3 fitur cetak utama:
//   1. Rekening Koran (Surat Permohonan ke Bank)
//   2. Cetak Gaji (mode Tanda Tangan / Bank)
//   3. Media (Koran & Majalah)
//
// Setiap entri menyimpan full HTML body (termasuk KOP) sehingga tombol
// "Cetak Ulang" akan menghasilkan output IDENTIK dengan cetakan asli —
// bahkan jika settings sekolah (KOP, nama kepala, dll) sudah berubah.
//
// Struktur:
//   - 3 Tabs sesuai kategori
//   - Tabel riwayat dengan kolom Tanggal Cetak, info kategori, dan Aksi
//   - Aksi: Cetak Ulang (fetch full record → openPrintWindow) + Hapus (AlertDialog)
//
// Data fetching:
//   - GET /api/print-logs?category=<cat>      (list, tanpa contentHtml)
//   - GET /api/print-logs/[id]                (full record, dengan contentHtml)
//   - DELETE /api/print-logs/[id]             (hapus record)

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { Badge } from '@/components/ui/badge'
import {
  History,
  Landmark,
  Wallet,
  Newspaper,
  Printer,
  Trash2,
  Loader2,
  RotateCw,
} from 'lucide-react'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { openPrintWindow } from '@/lib/print-utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrintLogListItem {
  id: string
  category: string
  printDate: string
  periodLabel: string
  letterNumber: string
  bankName: string
  printMode: string
  title: string
  orientation: string
  createdAt: string
}

interface PrintLogFull extends PrintLogListItem {
  contentHtml: string
}

type Category = 'rekening-koran' | 'salary' | 'media'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
  } catch {
    return '-'
  }
}

function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

function modeLabel(mode: string): string {
  if (mode === 'signature') return 'Tanda Tangan'
  if (mode === 'bank') return 'Bank'
  return mode || '-'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PrintLogsPage() {
  const { toast: showToast } = useToast()

  const [activeTab, setActiveTab] = useState<Category>('rekening-koran')

  // Data per tab — di-cache supaya switching tab cepat (tidak re-fetch).
  const [rekeningLogs, setRekeningLogs] = useState<PrintLogListItem[]>([])
  const [salaryLogs, setSalaryLogs] = useState<PrintLogListItem[]>([])
  const [mediaLogs, setMediaLogs] = useState<PrintLogListItem[]>([])

  const [loading, setLoading] = useState<Record<Category, boolean>>({
    'rekening-koran': true,
    salary: true,
    media: true,
  })

  // Re-print state — ID yang sedang di-fetch untuk re-print (spinner per row).
  const [reprintingId, setReprintingId] = useState<string | null>(null)

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch per category ────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (category: Category) => {
    setLoading((prev) => ({ ...prev, [category]: true }))
    try {
      const res = await fetch(`/api/print-logs?category=${encodeURIComponent(category)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal')
      const data: PrintLogListItem[] = await res.json()
      if (category === 'rekening-koran') setRekeningLogs(data)
      else if (category === 'salary') setSalaryLogs(data)
      else setMediaLogs(data)
    } catch {
      showToast({
        title: 'Error',
        description: 'Gagal mengambil riwayat pencetakan',
        variant: 'destructive',
      })
    } finally {
      setLoading((prev) => ({ ...prev, [category]: false }))
    }
  }, [showToast])

  // Fetch all categories on mount, plus re-fetch active tab on tab change
  // supaya data selalu fresh saat user pindah tab (mis. setelah ada cetak baru
  // dari halaman Gaji/Media → Rekap Pencetakan akan langsung dapat data baru).
  useEffect(() => {
    fetchLogs('rekening-koran')
    fetchLogs('salary')
    fetchLogs('media')
  }, [fetchLogs])

  useEffect(() => {
    // Refetch active tab saat user pindah tab — supaya kalau ada cetak baru
    // dari page lain (Gaji/Media/Rekening Koran), datanya langsung terlihat
    // tanpa perlu klik "Segarkan" manual.
    fetchLogs(activeTab)
  }, [activeTab, fetchLogs])

  // ─── Re-print handler ───────────────────────────────────────────────────────
  async function handleReprint(log: PrintLogListItem) {
    setReprintingId(log.id)
    try {
      // Fetch full record (with contentHtml) — list endpoint excludes contentHtml
      const res = await fetch(`/api/print-logs/${log.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Gagal')
      const full: PrintLogFull = await res.json()
      if (!full.contentHtml) {
        throw new Error('Konten cetak tidak ditemukan')
      }

      // Re-open print window with stored HTML — identik dengan cetakan asli.
      // Title digunakan sebagai filename PDF saat user "Save as PDF".
      openPrintWindow(
        log.title || 'Cetak Ulang',
        full.contentHtml,
        full.orientation === 'landscape' ? 'landscape' : 'portrait',
      )

      showToast({
        title: 'Cetak Ulang Berhasil',
        description: log.title || 'Dokumen siap dicetak ulang.',
      })
    } catch {
      showToast({
        title: 'Gagal Cetak Ulang',
        description: 'Tidak dapat mengambil dokumen untuk dicetak ulang.',
        variant: 'destructive',
      })
    } finally {
      setReprintingId(null)
    }
  }

  // ─── Delete handler ─────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/print-logs/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      showToast({
        title: 'Berhasil',
        description: 'Riwayat pencetakan berhasil dihapus.',
      })
      // Refresh ketiga kategori supaya konsisten (data hilang dari tab aktif)
      fetchLogs('rekening-koran')
      fetchLogs('salary')
      fetchLogs('media')
    } catch {
      showToast({
        title: 'Error',
        description: 'Gagal menghapus riwayat pencetakan',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteTitle('')
    }
  }

  function openDeleteDialog(log: PrintLogListItem) {
    setDeleteId(log.id)
    setDeleteTitle(log.title || `${log.category} - ${log.periodLabel}`)
  }

  // ─── Render helper untuk satu tabel kategori ────────────────────────────────
  function renderRekeningKoranTable() {
    if (loading['rekening-koran']) {
      return <PageLoading label="Memuat riwayat Rekening Koran..." />
    }
    if (rekeningLogs.length === 0) {
      return (
        <EmptyState
          icon={Landmark}
          title="Belum ada riwayat pencetakan"
          description="Riwayat cetak Surat Permohonan Rekening Koran akan muncul di sini."
        />
      )
    }
    return (
      <div className="max-h-96 overflow-y-auto rounded-md border">
        <Table className="table-pro">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
              <TableHead className="min-w-[110px]">Tanggal Cetak</TableHead>
              <TableHead className="min-w-[180px]">Nomor Surat</TableHead>
              <TableHead className="min-w-[150px]">Bank</TableHead>
              <TableHead className="min-w-[150px]">Periode</TableHead>
              <TableHead className="w-[160px] text-left">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rekeningLogs.map((log, idx) => (
              <TableRow key={log.id} className="align-top">
                <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{formatDateShort(log.printDate)}</div>
                  <div className="text-xs text-muted-foreground">{formatDateLong(log.printDate)}</div>
                </TableCell>
                <TableCell>
                  <code className="break-all rounded bg-muted px-2 py-0.5 text-xs">
                    {log.letterNumber || '-'}
                  </code>
                </TableCell>
                <TableCell className="text-sm">{log.bankName || '-'}</TableCell>
                <TableCell className="text-sm">{log.periodLabel || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleReprint(log)}
                      disabled={reprintingId === log.id}
                      title="Cetak Ulang"
                    >
                      {reprintingId === log.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <RotateCw className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(log)}
                      disabled={reprintingId === log.id}
                      title="Hapus"
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

  function renderSalaryTable() {
    if (loading.salary) {
      return <PageLoading label="Memuat riwayat Cetak Gaji..." />
    }
    if (salaryLogs.length === 0) {
      return (
        <EmptyState
          icon={Wallet}
          title="Belum ada riwayat pencetakan"
          description="Riwayat cetak Daftar Pembayaran Gaji akan muncul di sini."
        />
      )
    }
    return (
      <div className="max-h-96 overflow-y-auto rounded-md border">
        <Table className="table-pro">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
              <TableHead className="min-w-[110px]">Tanggal Cetak</TableHead>
              <TableHead className="min-w-[110px]">Mode</TableHead>
              <TableHead className="min-w-[150px]">Periode</TableHead>
              <TableHead className="min-w-[200px]">Judul</TableHead>
              <TableHead className="w-[160px] text-left">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryLogs.map((log, idx) => (
              <TableRow key={log.id} className="align-top">
                <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{formatDateShort(log.printDate)}</div>
                  <div className="text-xs text-muted-foreground">{formatDateLong(log.printDate)}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={log.printMode === 'bank' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    <Wallet className="size-3" />
                    {modeLabel(log.printMode)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.periodLabel || '-'}</TableCell>
                <TableCell className="text-sm">{log.title || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleReprint(log)}
                      disabled={reprintingId === log.id}
                      title="Cetak Ulang"
                    >
                      {reprintingId === log.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <RotateCw className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(log)}
                      disabled={reprintingId === log.id}
                      title="Hapus"
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

  function renderMediaTable() {
    if (loading.media) {
      return <PageLoading label="Memuat riwayat Media..." />
    }
    if (mediaLogs.length === 0) {
      return (
        <EmptyState
          icon={Newspaper}
          title="Belum ada riwayat pencetakan"
          description="Riwayat cetak Daftar Pembayaran Media akan muncul di sini."
        />
      )
    }
    return (
      <div className="max-h-96 overflow-y-auto rounded-md border">
        <Table className="table-pro">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
              <TableHead className="min-w-[110px]">Tanggal Cetak</TableHead>
              <TableHead className="min-w-[150px]">Periode</TableHead>
              <TableHead className="min-w-[200px]">Judul</TableHead>
              <TableHead className="w-[160px] text-left">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mediaLogs.map((log, idx) => (
              <TableRow key={log.id} className="align-top">
                <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{formatDateShort(log.printDate)}</div>
                  <div className="text-xs text-muted-foreground">{formatDateLong(log.printDate)}</div>
                </TableCell>
                <TableCell className="text-sm">{log.periodLabel || '-'}</TableCell>
                <TableCell className="text-sm">{log.title || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleReprint(log)}
                      disabled={reprintingId === log.id}
                      title="Cetak Ulang"
                    >
                      {reprintingId === log.id
                        ? <Loader2 className="size-4 animate-spin" />
                        : <RotateCw className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(log)}
                      disabled={reprintingId === log.id}
                      title="Hapus"
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader
        title="Rekap Pencetakan"
        description="Riwayat pencetakan Rekening Koran, Gaji, dan Media — cetak ulang kapan saja dengan hasil identik."
        icon={History}
        actions={
          <Button variant="outline" size="sm" onClick={() => {
            fetchLogs(activeTab)
          }} className="gap-1.5">
            <RotateCw className="size-3.5" />
            Segarkan
          </Button>
        }
      />

      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Printer className="size-5" />
            <div>
              <CardTitle>Riwayat Pencetakan</CardTitle>
              <CardDescription>
                Klik &quot;Cetak Ulang&quot; untuk mencetak ulang dokumen dengan
                hasil identik dengan cetakan asli.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as Category)}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="rekening-koran" className="gap-1.5">
                <Landmark className="size-3.5" />
                Rekening Koran
              </TabsTrigger>
              <TabsTrigger value="salary" className="gap-1.5">
                <Wallet className="size-3.5" />
                Cetak Gaji
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-1.5">
                <Newspaper className="size-3.5" />
                Media
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rekening-koran">
              {renderRekeningKoranTable()}
            </TabsContent>
            <TabsContent value="salary">
              {renderSalaryTable()}
            </TabsContent>
            <TabsContent value="media">
              {renderMediaTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null)
            setDeleteTitle('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus riwayat pencetakan{' '}
              <span className="font-semibold">{deleteTitle}</span>?
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
    </PageContainer>
  )
}
