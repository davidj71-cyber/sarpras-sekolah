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
  AlertTriangle,
  WifiOff,
  FileWarning,
} from 'lucide-react'

interface PhotoGalleryProps {
  photos: string[]
  itemId: string
  onPhotosChange: (photos: string[]) => void
  readonly?: boolean
  maxPhotos?: number
  /** Custom API base path for item updates. Defaults to '/api/items' */
  itemApiPath?: string
}

// Error type with icon and action
interface UploadError {
  title: string
  description: string
  icon?: React.ReactNode
  variant?: 'destructive' | 'default'
}

function parseUploadError(error: unknown, fileName?: string): UploadError {
  // Check if the error is from a Response object (API error)
  if (error instanceof Response) {
    // This shouldn't happen normally, but handle it
    return {
      title: 'Upload Gagal',
      description: 'Server mengembalikan respons yang tidak terduga',
      variant: 'destructive',
    }
  }

  // Network errors
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'))) {
    return {
      title: 'Koneksi Gagal',
      description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
      icon: <WifiOff className="size-4" />,
      variant: 'destructive',
    }
  }

  // Check for API error responses with specific codes
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as { code: string; error: string }
    switch (apiError.code) {
      case 'FILE_TOO_LARGE':
        return {
          title: 'File Terlalu Besar',
          description: apiError.error || `${fileName || 'File'} melebihi batas 10MB. Kompres foto atau gunakan resolusi lebih kecil.`,
          icon: <FileWarning className="size-4" />,
          variant: 'destructive',
        }
      case 'INVALID_TYPE':
        return {
          title: 'Format Tidak Didukung',
          description: apiError.error || `${fileName || 'File'} bukan format gambar yang didukung. Gunakan JPG, PNG, GIF, atau WebP.`,
          variant: 'destructive',
        }
      case 'NO_FILE':
        return {
          title: 'File Tidak Ditemukan',
          description: 'Tidak ada file yang terpilih. Silakan pilih foto terlebih dahulu.',
          variant: 'destructive',
        }
      case 'EMPTY_FILE':
        return {
          title: 'File Kosong',
          description: `${fileName || 'File'} tidak memiliki isi. Pilih foto lain.`,
          variant: 'destructive',
        }
      case 'NETWORK_ERROR':
        return {
          title: 'Koneksi Terputus',
          description: apiError.error || 'Koneksi terputus saat upload. Coba lagi.',
          icon: <WifiOff className="size-4" />,
          variant: 'destructive',
        }
      case 'SERVER_ERROR':
        return {
          title: 'Kesalahan Server',
          description: 'Server sedang mengalami gangguan. Silakan coba lagi beberapa saat.',
          icon: <AlertTriangle className="size-4" />,
          variant: 'destructive',
        }
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('503') || message.includes('502') || message.includes('500')) {
    return {
      title: 'Server Sedang Gangguan',
      description: 'Server sedang mengalami masalah. Silakan coba lagi beberapa saat.',
      icon: <AlertTriangle className="size-4" />,
      variant: 'destructive',
    }
  }

  return {
    title: 'Upload Gagal',
    description: message || 'Terjadi kesalahan yang tidak diketahui saat mengupload foto. Silakan coba lagi.',
    variant: 'destructive',
  }
}

export function PhotoGallery({
  photos,
  itemId,
  onPhotosChange,
  readonly = false,
  maxPhotos = 10,
  itemApiPath = '/api/items',
}: PhotoGalleryProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Upload photos
  const handleUpload = useCallback(async (files: FileList) => {
    if (readonly) return
    if (photos.length + files.length > maxPhotos) {
      toast({
        title: 'Batas Foto Tercapai',
        description: `Maksimal ${maxPhotos} foto per barang. Anda sudah memiliki ${photos.length} foto dan mencoba menambah ${files.length} foto lagi.`,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })
    const newPhotos: string[] = []
    let hasErrors = false
    const errors: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress({ current: i + 1, total: files.length })

        // Client-side validation
        if (!file.type.startsWith('image/')) {
          errors.push(`"${file.name}" bukan file gambar`)
          hasErrors = true
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
          errors.push(`"${file.name}" ukuran ${sizeMB}MB melebihi batas 10MB`)
          hasErrors = true
          continue
        }

        if (file.size === 0) {
          errors.push(`"${file.name}" file kosong`)
          hasErrors = true
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file)

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            let apiError: { error: string; code: string }
            try {
              apiError = await res.json()
            } catch {
              apiError = { error: `Server error (${res.status})`, code: 'SERVER_ERROR' }
            }

            const parsed = parseUploadError(apiError, file.name)
            errors.push(parsed.description)
            hasErrors = true
            continue
          }

          const data = await res.json()
          newPhotos.push(data.filename)
        } catch (fetchError) {
          const parsed = parseUploadError(fetchError, file.name)
          errors.push(parsed.description)
          hasErrors = true
          continue
        }
      }

      // Save new photos to database
      if (newPhotos.length > 0) {
        const updatedPhotos = [...photos, ...newPhotos]
        try {
          const saveRes = await fetch(`${itemApiPath}/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos: updatedPhotos }),
          })
          if (!saveRes.ok) throw new Error('Gagal menyimpan')

          onPhotosChange(updatedPhotos)

          // Show success message
          if (newPhotos.length > 0 && errors.length === 0) {
            toast({
              title: 'Berhasil Upload',
              description: `${newPhotos.length} foto berhasil ditambahkan`,
            })
          } else if (newPhotos.length > 0 && errors.length > 0) {
            toast({
              title: `${newPhotos.length} Foto Berhasil, ${errors.length} Gagal`,
              description: errors.join('. '),
              variant: 'destructive',
              duration: 8000,
            })
          }
        } catch {
          toast({
            title: 'Gagal Menyimpan',
            description: 'Foto berhasil diupload tetapi gagal disimpan ke database. Coba upload ulang.',
            variant: 'destructive',
          })
        }
      } else if (hasErrors) {
        // All files failed
        toast({
          title: 'Semua Upload Gagal',
          description: errors.join('. '),
          variant: 'destructive',
          duration: 8000,
        })
      }
    } catch {
      toast({
        title: 'Error Tak Terduga',
        description: 'Terjadi kesalahan yang tidak terduga saat mengupload foto. Silakan coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }, [photos, itemId, onPhotosChange, readonly, maxPhotos, itemApiPath, toast])

  // Delete a photo
  const handleDelete = useCallback(async (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (readonly) return

    setDeletingPhoto(filename)
    try {
      // Delete from server
      const deleteRes = await fetch(`/api/upload/${filename}`, { method: 'DELETE' })
      if (!deleteRes.ok) {
        toast({
          title: 'Gagal Menghapus File',
          description: 'File foto tidak dapat dihapus dari server. Foto akan tetap dihapus dari daftar.',
          variant: 'destructive',
        })
      }

      // Update item photos
      const updatedPhotos = photos.filter(p => p !== filename)
      const saveRes = await fetch(`${itemApiPath}/${itemId}`, {
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
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus foto. Periksa koneksi internet Anda dan coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setDeletingPhoto(null)
    }
  }, [photos, itemId, onPhotosChange, readonly, itemApiPath, toast])

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
                <div className="flex flex-col items-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground mt-0.5">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
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
                <div className="flex flex-col items-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground mt-0.5">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
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

      {/* Photo count & upload progress */}
      {uploading && (
        <p className="text-xs text-primary font-medium animate-pulse">
          Mengupload foto {uploadProgress.current} dari {uploadProgress.total}...
        </p>
      )}
      {photos.length > 0 && !uploading && (
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
