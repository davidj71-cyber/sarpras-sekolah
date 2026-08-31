'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

interface PhotoThumbnailProps {
  photos: string[]
  className?: string
}

export function PhotoThumbnail({ photos, className = '' }: PhotoThumbnailProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        <ImageIcon className="size-4 opacity-40" />
      </div>
    )
  }

  // Get photo URL — backward compat: base64 data URL dipakai langsung,
  // filename lama (sebelum refactor) fallback ke /uploads/items/{filename}.
  const getPhotoUrl = (photo: string) => {
    if (photo.startsWith('data:')) return photo
    return `/uploads/items/${photo}`
  }

  const navigateViewer = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setViewerIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1))
    } else {
      setViewerIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0))
    }
  }

  return (
    <>
      <div
        className={`relative cursor-pointer group ${className}`}
        onClick={() => { setViewerIndex(0); setViewerOpen(true) }}
      >
        <div className="flex -space-x-1">
          {photos.slice(0, 3).map((photo, idx) => (
            <div
              key={photo}
              className="w-8 h-8 rounded-md overflow-hidden border-2 border-background shadow-sm transition-transform group-hover:scale-105"
              style={{ zIndex: 3 - idx }}
            >
              <img
                src={getPhotoUrl(photo)}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {photos.length > 3 && (
          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            +{photos.length - 3}
          </span>
        )}
      </div>

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

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/20 rounded-full px-3 py-1 text-white text-sm">
              {viewerIndex + 1} / {photos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
