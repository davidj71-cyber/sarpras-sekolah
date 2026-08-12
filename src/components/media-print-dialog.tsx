'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, FileText, Loader2 } from 'lucide-react'

type Orientation = 'portrait' | 'landscape'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export interface MediaPrintOptions {
  startMonth: string
  endMonth: string
  year: string
  place: string
  orientation: Orientation
}

interface MediaPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: (options: MediaPrintOptions) => void
  title?: string
  description?: string
  loading?: boolean
  defaultPlace?: string
}

export function MediaPrintDialog({
  open,
  onOpenChange,
  onPrint,
  title = 'Cetak Daftar Pembayaran Media',
  description = 'Atur periode dan tempat sebelum mencetak',
  loading = false,
  defaultPlace = '',
}: MediaPrintDialogProps) {
  const currentYear = new Date().getFullYear()
  const [startMonth, setStartMonth] = useState('April')
  const [endMonth, setEndMonth] = useState('Juni')
  const [year, setYear] = useState(String(currentYear))
  // Gunakan defaultPlace sebagai nilai awal place; jika user mengubahnya, state akan override
  const [place, setPlace] = useState(defaultPlace)
  const [orientation, setOrientation] = useState<Orientation>('portrait')

  function handlePrint() {
    onPrint({ startMonth, endMonth, year, place, orientation })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Periode bulan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="med-start-month">Bulan Awal</Label>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger id="med-start-month">
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-end-month">Bulan Akhir</Label>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger id="med-end-month">
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-year">Tahun Anggaran</Label>
              <Input
                id="med-year"
                type="number"
                min={2020}
                max={2099}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          {/* Tempat */}
          <div className="space-y-2">
            <Label htmlFor="med-place">Tempat Penerbitan Surat</Label>
            <Input
              id="med-place"
              placeholder="Mis. Telukdalam"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Digunakan pada baris tanggal di blok tanda tangan kanan (mis. &quot;Telukdalam, 10 Juni 2026&quot;)
            </p>
          </div>

          {/* Orientasi */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none">Orientasi Halaman</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  orientation === 'portrait'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded border-2 ${
                    orientation === 'portrait' ? 'border-primary' : 'border-muted-foreground/40'
                  }`}
                  style={{ width: 48, height: 64 }}
                >
                  <FileText
                    className={`size-6 ${
                      orientation === 'portrait' ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    orientation === 'portrait' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Portrait
                </span>
                <span className="text-xs text-muted-foreground">A4 tegak</span>
              </button>

              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  orientation === 'landscape'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded border-2 ${
                    orientation === 'landscape' ? 'border-primary' : 'border-muted-foreground/40'
                  }`}
                  style={{ width: 64, height: 48 }}
                >
                  <FileText
                    className={`size-6 ${
                      orientation === 'landscape' ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    orientation === 'landscape' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Landscape
                </span>
                <span className="text-xs text-muted-foreground">A4 miring</span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handlePrint} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Mencetak...
              </>
            ) : (
              <>
                <Printer className="size-4 mr-2" />
                Cetak
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
