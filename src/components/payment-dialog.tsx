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
  Save,
  Trash2,
} from 'lucide-react'
import { formatNumberPrint } from '@/lib/print-utils'

export interface PaymentRecord {
  id: string
  year: number
  month: number
  amount: number
  notes?: string
  paidAt?: string
}

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Title for the dialog (e.g. "Media" or "Gaji")
  kind: 'media' | 'salary'
  // The owner entity ID
  ownerId: string
  // Display name of the owner (for the dialog header)
  ownerName: string
  // Subtitle (e.g. media name or NIP)
  ownerSubtitle?: string
  // Number of months the subscription/salary is for (1-12). When set,
  // unpaid months beyond this range are shown dimmed.
  durationMonths?: number
  // Default amount per month (pre-fill when marking a month as paid)
  defaultAmount: number
  // For salary: optional default lesson count per month
  defaultLessonCount?: number
  // Show lesson count input (salary) or not (media)
  showLessonCount?: boolean
  // API endpoint base, e.g. "/api/media/abc123/payments"
  apiBase: string
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
}: PaymentDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [editingMonth, setEditingMonth] = useState<number | null>(null)
  // Edit form state
  const [editAmount, setEditAmount] = useState<number>(0)
  const [editLessonCount, setEditLessonCount] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const fetchPayments = useCallback(async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}?year=${y}`)
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setPayments(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil catatan pembayaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [apiBase, toast])

  useEffect(() => {
    if (open && ownerId) {
      fetchPayments(year)
    }
  }, [open, ownerId, year, fetchPayments])

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingMonth(null)
      setPayments([])
    }
  }, [open])

  // Helper: find payment record for a given month
  function paymentFor(month: number): PaymentRecord | undefined {
    return payments.find((p) => p.month === month)
  }

  function startEdit(month: number) {
    const existing = paymentFor(month)
    setEditingMonth(month)
    setEditAmount(existing?.amount ?? defaultAmount)
    setEditLessonCount(existing?.lessonCount ?? defaultLessonCount ?? 0)
  }

  function cancelEdit() {
    setEditingMonth(null)
  }

  async function savePayment(month: number) {
    setSaving(true)
    try {
      const payload: { year: number; month: number; amount: number; notes?: string; lessonCount?: number } = {
        year,
        month,
        amount: editAmount,
      }
      if (showLessonCount) payload.lessonCount = editLessonCount

      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Berhasil',
        description: `Pembayaran ${MONTH_NAMES[month - 1]} ${year} ditandai lunas`,
      })
      setEditingMonth(null)
      await fetchPayments(year)
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan pembayaran', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function deletePayment(month: number) {
    setRemoving(true)
    try {
      const res = await fetch(`${apiBase}?year=${year}&month=${month}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({
        title: 'Berhasil',
        description: `Pembayaran ${MONTH_NAMES[month - 1]} ${year} ditandai belum bayar`,
      })
      setEditingMonth(null)
      await fetchPayments(year)
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus pembayaran', variant: 'destructive' })
    } finally {
      setRemoving(false)
    }
  }

  // Generate year options: current year ± 2 years
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // Compute summary
  const paidCount = payments.length
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const expectedMonths = durationMonths && durationMonths > 0 ? Math.min(durationMonths, 12) : 12
  const expectedTotal = expectedMonths * defaultAmount
  const unpaidCount = Math.max(0, expectedMonths - paidCount)

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
              Klik bulan untuk menandai sudah dibayar / belum dibayar. Total {expectedMonths} bulan langganan.
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Year selector + Summary */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Tahun:</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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
            {expectedTotal > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                Diharapkan: Rp {formatNumberPrint(expectedTotal)}
              </Badge>
            )}
          </div>
        </div>

        {/* 12-month grid */}
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
              const isEditing = editingMonth === month

              return (
                <div
                  key={month}
                  className={`rounded-md border p-3 transition-colors ${
                    isEditing
                      ? 'border-primary ring-1 ring-primary'
                      : isPaid
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
                        : 'border-border bg-card'
                  } ${isOutOfRange ? 'opacity-50' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{SHORT_MONTH[idx]}</span>
                      <span className="text-sm font-semibold">{monthName}</span>
                    </div>
                    {isPaid ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      {showLessonCount && (
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Jml Les</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editLessonCount}
                            onChange={(e) => setEditLessonCount(Number(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Jumlah (Rp)</Label>
                        <CurrencyInput
                          value={editAmount}
                          onChange={(v) => setEditAmount(v)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="h-7 flex-1 text-xs" onClick={() => savePayment(month)} disabled={saving}>
                          {saving ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Save className="size-3 mr-1" />}
                          Simpan
                        </Button>
                        {isPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => deletePayment(month)}
                            disabled={removing}
                            title="Tandai belum bayar"
                          >
                            {removing ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelEdit} disabled={saving || removing}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(month)}
                      className="w-full text-left"
                    >
                      {isPaid ? (
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            Rp {formatNumberPrint(payment?.amount ?? 0)}
                          </div>
                          {showLessonCount && (payment as any)?.lessonCount !== undefined && (
                            <div className="text-[10px] text-muted-foreground">
                              {((payment as any).lessonCount ?? 0)} les
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            {payment?.paidAt
                              ? new Date(payment.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Lunas'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {isOutOfRange ? (
                            <span>Diluar jangka</span>
                          ) : (
                            <span>Klik untuk tandai bayar</span>
                          )}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Full breakdown table for print */}
        {payments.length > 0 && (
          <details className="mt-2 rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Rincian Pembayaran ({payments.length} bulan)
            </summary>
            <div className="max-h-60 overflow-y-auto px-3 pb-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2">Bulan</th>
                    <th className="py-2 pr-2 text-right">Jumlah</th>
                    {showLessonCount && <th className="py-2 pr-2 text-right">Les</th>}
                    <th className="py-2 text-right">Tgl Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .slice()
                    .sort((a, b) => a.month - b.month)
                    .map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">Rp {formatNumberPrint(p.amount)}</td>
                        {showLessonCount && <td className="py-1.5 pr-2 text-right tabular-nums">{(p as any).lessonCount ?? 0}</td>}
                        <td className="py-1.5 text-right text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
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
    </Dialog>
  )
}
