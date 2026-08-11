'use client'

/**
 * Resize an image file on the client using a canvas, returning a base64
 * data URL. This keeps the stored payload small so it always fits within
 * the platform gateway's request-body limit.
 *
 * - The image is scaled down so its longest side is at most `maxDimension`px.
 * - PNGs with transparency stay PNG; everything else becomes JPEG.
 * - `quality` only applies to JPEG output (0–1).
 *
 * Returns a Promise that resolves to `{ dataUrl, width, height }`.
 */
export function resizeImageFile(
  file: File,
  maxDimension: number,
  quality = 0.9
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) {
        reject(new Error('Gagal membaca file'))
        return
      }

      const img = new Image()
      img.onerror = () => reject(new Error('Gambar tidak valid'))
      img.onload = () => {
        let { width, height } = img

        // Scale down if either dimension exceeds the max
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height / width) * maxDimension)
            width = maxDimension
          } else {
            width = Math.round((width / height) * maxDimension)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas tidak didukung di browser ini'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Keep PNG transparency; everything else → JPEG for smaller size.
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mime, quality)
        resolve({ dataUrl, width, height })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
