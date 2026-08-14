'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Circle,
  Loader2,
  CalendarCheck,
  Plus,
  Trash2,
  X,
  ImageIcon,
} from 'lucide-react'
import { formatNumberPrint } from '@/lib/print-utils'
import { OrderPhotoUpload } from '@/components/order-photo-upload'

export interface PaymentRecord {
  id: string
  year: number
  month: number
  amount: number
  lessonCount?: number
  notes?: string
  paidAt?: string
  proofPhotos?: string[]
}

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Title for the dialog (e.g. "Media" or "Gaji") */
  kind: 'media' | 'salary'
  /** The owner entity ID */
  ownerId: string
  /** Display name of the owner (for the dialog header) */
  ownerName: string
  /** Subtitle (e.g. media name or NIP) */
  ownerSubtitle?: string
  /** Number of months the subscription/salary is for (1-12). When set,
   *  unpaid months beyond this range are shown dimmed. */
  durationMonths?: number
  /** Default amount per month (pre-fill when recording a payment) */
  defaultAmount: number
  /** For salary: optional default lesson count per month */
  defaultLessonCount?: number
  /** Show lesson count input (salary) or not (media) */
  showLessonCount?: boolean
  /** API endpoint base, e.g. "/api/media/abc123/payments" */
  apiBase: string
  /** Callback when a payment is added/removed (so parent can refresh totals) */
  onPaymentChange?: () => void
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function PaymentDialog({
  open,
  onOpenChange,
  kind,
  ownerId,
  ownerName,
  ownerSubtitle,
  durationMonths,
  defaultAmount,
  defaultLessonCount,
  showLessonCount = false,
  apiBase,
  onPaymentChange,
}: PaymentDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [year, setYear] = useState<number>(new Date().getFullYear())

  // "Catat Pembayaran" form state
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1)
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formAmount, setFormAmount] = useState<number>(0)
  const [formLessonCount, setFormLessonCount] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  // Proof photo dialog state
  const [proofDialogMonth, setProofDialogMonth] = useState<{ month: number; year: number } | null>(null)
  const [proofPhotos, setProofPhotos] = useState<string[]>([])
  const [savingProof, setSavingProof] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}?year=${year}`)
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setPayments(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil catatan pembayaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [apiBase, year, toast])

  useEffect(() => {
    if (open && ownerId) {
      fetchPayments()
    }
  }, [open, ownerId, year, fetchPayments])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date()
      setFormMonth(now.getMonth() + 1)
      setFormYear(now.getFullYear())
      setFormAmount(defaultAmount)
      setFormLessonCount(defaultLessonCount ?? 0)
      setYear(now.getFullYear())
    } else {
      setPayments([])
      setFormAmount(0)
      setFormLessonCount(0)
    }
  }, [open, defaultAmount, defaultLessonCount])

  // Helper: find payment record for a given month in the currently viewed year
  function paymentFor(month: number): PaymentRecord | undefined {
    return payments.find((p) => p.month === month && p.year === year)
  }

  // ── Catat Pembayaran ──
  async function handleAddPayment() {
    if (formAmount <= 0) {
      toast({ title: 'Validasi', description: 'Jumlah pembayaran harus > 0', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: { year: number; month: number; amount: number; notes?: string; lessonCount?: number } = {
        year: formYear,
        month: formMonth,
        amount: formAmount,
      }
      if (showLessonCount) payload.lessonCount = formLessonCount

      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Pembayaran Tercatat',
        description: `${MONTH_NAMES[formMonth - 1]} ${formYear}: Rp ${formatNumberPrint(formAmount)}`,
      })
      // Switch view to the year of the payment if different
      if (formYear !== year) setYear(formYear)
      await fetchPayments()
      onPaymentChange?.()
      // Auto-advance to next month for convenience
      if (formMonth < 12) {
        setFormMonth(formMonth + 1)
        setFormAmount(defaultAmount)
        setFormLessonCount(defaultLessonCount ?? 0)
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan pembayaran', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Hapus Pembayaran ──
  async function handleDeletePayment(month: number, paymentYear: number) {
    setRemoving(`${paymentYear}-${month}`)
    try {
      const res = await fetch(`${apiBase}?year=${paymentYear}&month=${month}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Pembayaran Dihapus',
        description: `${MONTH_NAMES[month - 1]} ${paymentYear} ditandai belum bayar`,
      })
      await fetchPayments()
      onPaymentChange?.()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus pembayaran', variant: 'destructive' })
    } finally {
      setRemoving(null)
    }
  }

  // ── Buka dialog foto bukti pembayaran ──
  function openProofDialog(month: number, paymentYear: number) {
    const payment = payments.find((p) => p.month === month && p.year === paymentYear)
    setProofPhotos(payment?.proofPhotos ?? [])
    setProofDialogMonth({ month, year: paymentYear })
  }

  // ── Simpan foto bukti pembayaran ──
  async function handleSaveProof() {
    if (!proofDialogMonth) return
    const { month, year: paymentYear } = proofDialogMonth
    setSavingProof(true)
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: paymentYear, month, proofPhotos }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Foto Bukti Tersimpan',
        description: `${MONTH_NAMES[month - 1]} ${paymentYear}: ${proofPhotos.length} foto`,
      })
      setProofDialogMonth(null)
      await fetchPayments()
      onPaymentChange?.()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan foto bukti', variant: 'destructive' })
    } finally {
      setSavingProof(false)
    }
  }

  // Generate year options: current year ± 2 years
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // Compute summary
  const paidCount = payments.length
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const expectedMonths = durationMonths && durationMonths > 0 ? Math.min(durationMonths, 12) : 12
  const unpaidCount = Math.max(0, expectedMonths - paidCount)

  // Check if the selected month/year is already paid
  const selectedAlreadyPaid = payments.some(
    (p) => p.month === formMonth && p.year === formYear
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5" />
            Catatan Pembayaran {kind === 'media' ? 'Media' : 'Gaji'}
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{ownerName}</span>
            {ownerSubtitle ? <span className="ml-2 text-muted-foreground">— {ownerSubtitle}</span> : null}
            <br />
            <span className="text-xs">
              Pilih bulan &amp; tahun, lalu klik &quot;Catat Pembayaran&quot;. Total penerimaan otomatis terupdate.
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* ── Catat Pembayaran form ── */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">Catat Pembayaran Baru</h4>
            {selectedAlreadyPaid && (
              <Badge variant="outline" className="ml-auto gap-1 border-amber-400 text-amber-600">
                <CheckCircle2 className="size-3" />
                Sudah dibayar — akan diperbarui
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bulan</Label>
              <Select value={String(formMonth)} onValueChange={(v) => setFormMonth(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tahun</Label>
              <Select value={String(formYear)} onValueChange={(v) => setFormYear(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showLessonCount ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Jml Les</Label>
                <Input
                  type="number"
                  min="0"
                  value={formLessonCount}
                  onChange={(e) => setFormLessonCount(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Jumlah (Rp)</Label>
              <CurrencyInput
                value={formAmount}
                onChange={(v) => setFormAmount(v)}
                className="h-9"
              />
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            onClick={handleAddPayment}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Catat Pembayaran {MONTH_NAMES[formMonth - 1]} {formYear}
          </Button>
        </div>

        {/* ── Summary + Year selector for grid ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Lihat tahun:</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3 text-emerald-600" />
              {paidCount} bulan dibayar
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Circle className="size-3 text-muted-foreground" />
              {unpaidCount} bulan belum
            </Badge>
            <Badge variant="secondary" className="font-semibold">
              Total: Rp {formatNumberPrint(paidTotal)}
            </Badge>
          </div>
        </div>

        {/* ── 12-month grid (status only) ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat catatan pembayaran...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {MONTH_NAMES.map((monthName, idx) => {
              const month = idx + 1
              const payment = paymentFor(month)
              const isPaid = !!payment
              const isOutOfRange = durationMonths && durationMonths > 0 && month > durationMonths

              return (
                <div
                  key={month}
                  className={`relative rounded-md border p-3 transition-colors ${
                    isPaid
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
                      : 'border-border bg-card'
                  } ${isOutOfRange && !isPaid ? 'opacity-40' : ''}`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{SHORT_MONTH[idx]}</span>
                      <span className="text-xs font-semibold">{monthName}</span>
                    </div>
                    {isPaid ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {isPaid ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Rp {formatNumberPrint(payment?.amount ?? 0)}
                      </div>
                      {showLessonCount && payment?.lessonCount !== undefined && (
                        <div className="text-[10px] text-muted-foreground">
                          {payment.lessonCount} les
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {payment?.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Lunas'}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 gap-1 text-[10px]"
                          onClick={() => openProofDialog(month, year)}
                        >
                          <ImageIcon className="size-3" />
                          {payment?.proofPhotos && payment.proofPhotos.length > 0
                            ? `${payment.proofPhotos.length} foto`
                            : 'Bukti'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePayment(month, year)}
                          disabled={removing === `${year}-${month}`}
                        >
                          {removing === `${year}-${month}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <X className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      {isOutOfRange ? 'Diluar jangka' : 'Belum dibayar'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Rincian Pembayaran table (expandable) ── */}
        {payments.length > 0 && (
          <details className="mt-2 rounded-md border" open>
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Rincian Pembayaran ({payments.length} catatan)
            </summary>
            <div className="max-h-48 overflow-y-auto px-3 pb-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2">Bulan</th>
                    <th className="py-2 pr-2 text-right">Jumlah</th>
                    {showLessonCount && <th className="py-2 pr-2 text-right">Les</th>}
                    <th className="py-2 text-right">Tgl Bayar</th>
                    <th className="py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .slice()
                    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
                    .map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">Rp {formatNumberPrint(p.amount)}</td>
                        {showLessonCount && <td className="py-1.5 pr-2 text-right tabular-nums">{p.lessonCount ?? 0}</td>}
                        <td className="py-1.5 text-right text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-1.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayment(p.month, p.year)}
                            disabled={removing === `${p.year}-${p.month}`}
                          >
                            {removing === `${p.year}-${p.month}` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>

      {/* ── Dialog Upload Foto Bukti Pembayaran ── */}
      <Dialog open={!!proofDialogMonth} onOpenChange={(open) => { if (!open && !savingProof) setProofDialogMonth(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Foto Bukti Pembayaran
            </DialogTitle>
            <DialogDescription>
              {proofDialogMonth && `${MONTH_NAMES[proofDialogMonth.month - 1]} ${proofDialogMonth.year}`}
              <br />
              <span className="text-xs">
                Upload foto bukti pembayaran (kamera atau galeri). Maks 5 foto.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <OrderPhotoUpload
              photos={proofPhotos}
              onChange={setProofPhotos}
              maxPhotos={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProofDialogMonth(null)} disabled={savingProof}>
              Batal
            </Button>
            <Button onClick={handleSaveProof} disabled={savingProof}>
              {savingProof && <Loader2 className="size-4 mr-2 animate-spin" />}
              Simpan Bukti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
