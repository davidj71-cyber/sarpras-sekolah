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
import { Printer, FileText, Loader2 } from 'lucide-react'

type Orientation = 'portrait' | 'landscape'

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: (orientation: Orientation) => void
  title?: string
  description?: string
  loading?: boolean
}

export function PrintDialog({
  open,
  onOpenChange,
  onPrint,
  title = 'Pengaturan Cetak',
  description = 'Pilih orientasi halaman sebelum mencetak',
  loading = false,
}: PrintDialogProps) {
  const [orientation, setOrientation] = useState<Orientation>('portrait')

  function handlePrint() {
    onPrint(orientation)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none">Orientasi Halaman</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Portrait */}
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

              {/* Landscape */}
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
