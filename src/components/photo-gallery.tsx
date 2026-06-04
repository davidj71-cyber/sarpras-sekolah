'use client'

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
  Trash2,
} from 'lucide-react'

interface PhotoGalleryProps {
  photos: string[]
  itemId: string
  onPhotosChange: (photos: string[]) => void
  readonly?: boolean
  maxPhotos?: number
}

export function PhotoGallery({
  photos,
  itemId,
  onPhotosChange,
  readonly = false,
  maxPhotos = 10,
}: PhotoGalleryProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Upload photos
  const handleUpload = useCallback(async (files: FileList) => {
    if (readonly) return
    if (photos.length + files.length > maxPhotos) {
      toast({
        title: 'Batas Foto',
        description: `Maksimal ${maxPhotos} foto per barang`,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    const newPhotos: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Format Salah',
            description: `${file.name} bukan file gambar`,
            variant: 'destructive',
          })
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Ukuran Terlalu Besar',
            description: `${file.name} melebihi batas 10MB`,
            variant: 'destructive',
          })
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload gagal')
        const data = await res.json()
        newPhotos.push(data.filename)
      }

      if (newPhotos.length > 0) {
        const updatedPhotos = [...photos, ...newPhotos]
        // Save to database
        const saveRes = await fetch(`/api/items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: updatedPhotos }),
        })
        if (!saveRes.ok) throw new Error('Gagal menyimpan')

        onPhotosChange(updatedPhotos)
        toast({
          title: 'Berhasil',
          description: `${newPhotos.length} foto berhasil ditambahkan`,
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal mengupload foto',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }, [photos, itemId, onPhotosChange, readonly, maxPhotos, toast])

  // Delete a photo
  const handleDelete = useCallback(async (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (readonly) return

    setDeletingPhoto(filename)
    try {
      // Delete from server
      await fetch(`/api/upload/${filename}`, { method: 'DELETE' })

      // Update item photos
      const updatedPhotos = photos.filter(p => p !== filename)
      const saveRes = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos }),
      })
      if (!saveRes.ok) throw new Error('Gagal menyimpan')

      onPhotosChange(updatedPhotos)
      toast({
        title: 'Berhasil',
        description: 'Foto berhasil dihapus',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal menghapus foto',
        variant: 'destructive',
      })
    } finally {
      setDeletingPhoto(null)
    }
  }, [photos, itemId, onPhotosChange, readonly, toast])

  // Photo viewer navigation
  const navigateViewer = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setViewerIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1))
    } else {
      setViewerIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0))
    }
  }, [photos.length])

  // Get photo URL
  const getPhotoUrl = (filename: string) => `/uploads/items/${filename}`

  return (
    <div className="space-y-2">
      {/* Photo Grid */}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, idx) => (
          <div
            key={photo}
            className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-border cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => { setViewerIndex(idx); setViewerOpen(true) }}
          >
            <img
              src={getPhotoUrl(photo)}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {!readonly && (
              <button
                onClick={(e) => handleDelete(photo, e)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                title="Hapus foto"
              >
                {deletingPhoto === photo ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-[10px] text-center pb-0.5">{idx + 1}</p>
            </div>
          </div>
        ))}

        {/* Add photo buttons */}
        {!readonly && photos.length < maxPhotos && (
          <>
            {/* Camera button - for mobile */}
            <label className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="size-5 text-muted-foreground" />
              )}
              <span className="text-[9px] text-muted-foreground mt-0.5">Kamera</span>
            </label>

            {/* Upload button */}
            <label className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-5 text-muted-foreground" />
              )}
              <span className="text-[9px] text-muted-foreground mt-0.5">Upload</span>
            </label>
          </>
        )}

        {/* No photos placeholder */}
        {photos.length === 0 && readonly && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <ImageIcon className="size-3.5" />
            <span>Belum ada foto</span>
          </div>
        )}
      </div>

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length} foto • Klik untuk melihat
        </p>
      )}

      {/* Full-screen Photo Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">
            Foto Barang - {viewerIndex + 1} dari {photos.length}
          </DialogTitle>
          <div className="relative flex items-center justify-center min-h-[50vh] max-h-[80vh]">
            {photos[viewerIndex] && (
              <img
                src={getPhotoUrl(photos[viewerIndex])}
                alt={`Foto ${viewerIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigateViewer('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={() => navigateViewer('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}

            {/* Delete button in viewer */}
            {!readonly && (
              <button
                onClick={() => {
                  handleDelete(photos[viewerIndex])
                  if (photos.length <= 1) {
                    setViewerOpen(false)
                  }
                }}
                className="absolute top-3 right-12 bg-red-500/80 hover:bg-red-600 rounded-full p-2 text-white transition-colors"
                title="Hapus foto"
              >
                <Trash2 className="size-4" />
              </button>
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
