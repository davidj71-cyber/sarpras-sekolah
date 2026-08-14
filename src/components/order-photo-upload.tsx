'use client'

/**
 * OrderPhotoUpload — komponen upload foto untuk item pesanan.
 *
 * Berbeda dari PhotoGallery (yang pakai endpoint /api/upload + filename),
 * komponen ini menyimpan foto sebagai base64 data URL langsung di database
 * (OrderItem.photos JSON array). Pendekatan ini:
 *  - Tidak butuh endpoint upload terpisah.
 *  - Bekerja di Vercel (filesystem read-only).
 *  - Foto dikompres client-side (max 1024px, JPEG 0.85) → ~100-300KB per foto.
 *  - Mendukung kamera Android via `capture="environment"`.
 *
 * Props:
 *  - photos: string[]          → daftar base64 data URL foto saat ini.
 *  - onChange: (string[]) => void → callback saat foto bertambah/berkurang.
 *  - maxPhotos?: number        → batas foto per item (default 5).
 */

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Camera,
  Upload,
  X,
  Loader2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { resizeImageFile } from '@/lib/resize-image'

interface OrderPhotoUploadProps {
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
}

const DEFAULT_MAX_PHOTOS = 5
const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.85

export function OrderPhotoUpload({
  photos,
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
}: OrderPhotoUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Proses file → resize → base64 data URL
  const processFiles = useCallback(async (files: FileList) => {
    if (photos.length + files.length > maxPhotos) {
      toast({
        title: 'Batas Foto Tercapai',
        description: `Maksimal ${maxPhotos} foto per item. Saat ini sudah ada ${photos.length} foto.`,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })
    const newPhotos: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress({ current: i + 1, total: files.length })

      // Validasi tipe
      if (!file.type.startsWith('image/')) {
        errors.push(`"${file.name}" bukan file gambar`)
        continue
      }

      // Validasi ukuran mentah (10MB) — akan dikompres setelahnya
      if (file.size > 10 * 1024 * 1024) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        errors.push(`"${file.name}" ukuran ${sizeMB}MB melebihi batas 10MB`)
        continue
      }

      if (file.size === 0) {
        errors.push(`"${file.name}" file kosong`)
        continue
      }

      try {
        // Resize & kompres client-side → base64 data URL
        const { dataUrl } = await resizeImageFile(file, MAX_DIMENSION, JPEG_QUALITY)
        newPhotos.push(dataUrl)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memproses gambar'
        errors.push(`"${file.name}": ${msg}`)
      }
    }

    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos])
      if (errors.length === 0) {
        toast({
          title: 'Berhasil',
          description: `${newPhotos.length} foto berhasil ditambahkan`,
        })
      } else {
        toast({
          title: `${newPhotos.length} Foto Berhasil, ${errors.length} Gagal`,
          description: errors.join('. '),
          variant: 'destructive',
          duration: 8000,
        })
      }
    } else if (errors.length > 0) {
      toast({
        title: 'Upload Gagal',
        description: errors.join('. '),
        variant: 'destructive',
        duration: 8000,
      })
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    // Reset input supaya file yang sama bisa dipilih ulang
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [photos, onChange, maxPhotos, toast])

  const handleDelete = useCallback((index: number) => {
    const next = photos.filter((_, i) => i !== index)
    onChange(next)
  }, [photos, onChange])

  const navigateViewer = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setViewerIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1))
    } else {
      setViewerIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0))
    }
  }, [photos.length])

  return (
    <div className="space-y-1.5">
      {/* Photo Grid */}
      <div className="flex flex-wrap gap-1.5">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="relative group w-14 h-14 rounded-md overflow-hidden border border-border cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => { setViewerIndex(idx); setViewerOpen(true) }}
          >
            <img
              src={photo}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(idx) }}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 touch-manipulation"
              title="Hapus foto"
              aria-label={`Hapus foto ${idx + 1}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* Tombol tambah foto — Kamera (utama untuk Android) */}
        {photos.length < maxPhotos && (
          <>
            <label className="w-14 h-14 rounded-md border-2 border-dashed border-primary/40 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && processFiles(e.target.files)}
                disabled={uploading}
              />
              {uploading && uploadProgress.total > 0 ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-[7px] text-muted-foreground mt-0.5">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
              ) : (
                <Camera className="size-4 text-primary" />
              )}
              <span className="text-[8px] text-muted-foreground mt-0.5">Kamera</span>
            </label>

            {/* Tombol upload dari galeri/file */}
            <label className="w-14 h-14 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && processFiles(e.target.files)}
                disabled={uploading}
              />
              <Upload className="size-4 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground mt-0.5">Galeri</span>
            </label>
          </>
        )}

        {/* Placeholder saat tidak ada foto & tidak bisa upload */}
        {photos.length === 0 && photos.length >= maxPhotos && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <ImageIcon className="size-3.5" />
            <span>Belum ada foto</span>
          </div>
        )}
      </div>

      {/* Progress & count */}
      {uploading && (
        <p className="text-xs text-primary font-medium animate-pulse">
          Memproses foto {uploadProgress.current} dari {uploadProgress.total}...
        </p>
      )}
      {!uploading && photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length} foto • Klik untuk melihat
        </p>
      )}

      {/* Full-screen Photo Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">
            Foto Pesanan - {viewerIndex + 1} dari {photos.length}
          </DialogTitle>
          <div className="relative flex items-center justify-center min-h-[50vh] max-h-[80vh]">
            {photos[viewerIndex] && (
              <img
                src={photos[viewerIndex]}
                alt={`Foto ${viewerIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateViewer('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateViewer('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}

            {/* Photo counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/20 rounded-full px-3 py-1 text-white text-sm">
              {viewerIndex + 1} / {photos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
