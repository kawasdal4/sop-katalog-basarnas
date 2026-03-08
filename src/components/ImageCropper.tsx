'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, X, RotateCcw, Move } from 'lucide-react'

interface ImageCropperProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File | null
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number
  circularCrop?: boolean
}

export default function ImageCropper({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
  aspectRatio = 1,
  circularCrop = true
}: ImageCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, size: 0.8 }) // Normalized 0-1

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const CONTAINER_SIZE = 400
  const PREVIEW_SIZE = 80

  // Load image
  useEffect(() => {
    if (!imageFile || !isOpen) return

    // Create object URL instead of reading entire file into base64 string
    const src = URL.createObjectURL(imageFile)
    const img = new window.Image()
    img.onload = () => {
      setImage(img)
      // Reset crop to center
      const minDim = Math.min(img.naturalWidth, img.naturalHeight)
      const cropSize = minDim / Math.max(img.naturalWidth, img.naturalHeight)
      setCrop({
        x: (1 - cropSize) / 2,
        y: (1 - cropSize) / 2,
        size: cropSize
      })
    }
    img.onerror = () => {
      console.error('[ImageCropper] Failed to decode image. Format might be unsupported.')
      onClose()
    }
    img.src = src

    // Cleanup memory
    return () => {
      URL.revokeObjectURL(src)
    }
  }, [imageFile, isOpen, onClose])

  // Clear on close
  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setImage(null)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  // Draw main canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = image.naturalWidth
    const h = image.naturalHeight

    // Clear
    ctx.clearRect(0, 0, CONTAINER_SIZE, CONTAINER_SIZE)

    // Draw background (dimmed)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CONTAINER_SIZE, CONTAINER_SIZE)

    // Calculate display dimensions
    const imgAspect = w / h
    let dw: number, dh: number, dx: number, dy: number

    if (imgAspect >= 1) {
      dw = CONTAINER_SIZE
      dh = CONTAINER_SIZE / imgAspect
      dx = 0
      dy = (CONTAINER_SIZE - dh) / 2
    } else {
      dh = CONTAINER_SIZE
      dw = CONTAINER_SIZE * imgAspect
      dx = (CONTAINER_SIZE - dw) / 2
      dy = 0
    }

    // Draw dimmed image
    ctx.globalAlpha = 0.5
    ctx.drawImage(image, 0, 0, w, h, dx, dy, dw, dh)
    ctx.globalAlpha = 1

    // Calculate crop in natural coordinates
    const cropX = crop.x * w
    const cropY = crop.y * h
    const cropSize = crop.size * Math.max(w, h)

    // Calculate crop in display coordinates
    const scaleX = dw / w
    const scaleY = dh / h
    const cropDx = dx + cropX * scaleX
    const cropDy = dy + cropY * scaleY
    const cropDSize = cropSize * scaleX

    // Draw dark overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'

    // Create circular clip path for the crop
    ctx.save()
    ctx.beginPath()
    if (circularCrop) {
      const radius = cropDSize / 2
      ctx.arc(cropDx + radius, cropDy + radius, radius, 0, Math.PI * 2)
    } else {
      ctx.roundRect(cropDx, cropDy, cropDSize, cropDSize, 8)
    }
    ctx.clip()

    // Draw bright image inside crop area
    ctx.drawImage(image, 0, 0, w, h, dx, dy, dw, dh)
    ctx.restore()

    // Draw crop border
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.beginPath()
    if (circularCrop) {
      const radius = cropDSize / 2
      ctx.arc(cropDx + radius, cropDy + radius, radius, 0, Math.PI * 2)
    } else {
      ctx.roundRect(cropDx, cropDy, cropDSize, cropDSize, 8)
    }
    ctx.stroke()

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1

    // Horizontal lines
    ctx.beginPath()
    ctx.moveTo(cropDx, cropDy + cropDSize / 3)
    ctx.lineTo(cropDx + cropDSize, cropDy + cropDSize / 3)
    ctx.moveTo(cropDx, cropDy + cropDSize * 2 / 3)
    ctx.lineTo(cropDx + cropDSize, cropDy + cropDSize * 2 / 3)
    // Vertical lines
    ctx.moveTo(cropDx + cropDSize / 3, cropDy)
    ctx.lineTo(cropDx + cropDSize / 3, cropDy + cropDSize)
    ctx.moveTo(cropDx + cropDSize * 2 / 3, cropDy)
    ctx.lineTo(cropDx + cropDSize * 2 / 3, cropDy + cropDSize)
    ctx.stroke()

  }, [image, crop, circularCrop])

  // Draw preview canvas
  useEffect(() => {
    if (!image || !previewCanvasRef.current) return

    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = image.naturalWidth
    const h = image.naturalHeight

    // Calculate crop in natural coordinates
    const cropX = crop.x * w
    const cropY = crop.y * h
    const cropSize = crop.size * Math.max(w, h)

    // Clamp
    const eps = 1
    const cx = Math.max(eps, Math.min(w - cropSize - eps, cropX))
    const cy = Math.max(eps, Math.min(h - cropSize - eps, cropY))
    const cs = Math.max(eps, Math.min(w - cx - eps, h - cy - eps, cropSize))

    // Draw cropped area to preview
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    ctx.drawImage(image, cx, cy, cs, cs, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

  }, [image, crop])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    // Convert to normalized coordinates
    const normDeltaX = deltaX / CONTAINER_SIZE
    const normDeltaY = deltaY / CONTAINER_SIZE

    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(1 - prev.size, prev.x + normDeltaX)),
      y: Math.max(0, Math.min(1 - prev.size, prev.y + normDeltaY))
    }))

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStart.x
    const deltaY = touch.clientY - dragStart.y

    const normDeltaX = deltaX / CONTAINER_SIZE
    const normDeltaY = deltaY / CONTAINER_SIZE

    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(1 - prev.size, prev.x + normDeltaX)),
      y: Math.max(0, Math.min(1 - prev.size, prev.y + normDeltaY))
    }))

    setDragStart({ x: touch.clientX, y: touch.clientY })
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Perform crop
  const performCrop = useCallback(async () => {
    if (!image) return

    const w = image.naturalWidth
    const h = image.naturalHeight

    const cropX = crop.x * w
    const cropY = crop.y * h
    const cropSize = crop.size * Math.max(w, h)

    // Clamp
    const eps = 1
    const cx = Math.max(eps, Math.min(w - cropSize - eps, cropX))
    const cy = Math.max(eps, Math.min(h - cropSize - eps, cropY))
    const cs = Math.max(eps, Math.min(w - cx - eps, h - cy - eps, cropSize))

    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(image, cx, cy, cs, cs, 0, 0, 1024, 1024)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCropComplete(file)
        onClose()
      }
    }, 'image/jpeg', 0.95)
  }, [image, crop, onCropComplete, onClose])

  // Reset
  const resetCrop = useCallback(() => {
    if (!image) return
    const minDim = Math.min(image.naturalWidth, image.naturalHeight)
    const cropSize = minDim / Math.max(image.naturalWidth, image.naturalHeight)
    setCrop({
      x: (1 - cropSize) / 2,
      y: (1 - cropSize) / 2,
      size: cropSize
    })
  }, [image])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white p-0 overflow-hidden gap-0" aria-describedby={undefined}>
        <DialogHeader className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4">
          <DialogTitle className="text-white flex items-center gap-2">
            <Move className="w-5 h-5" />
            Atur Foto Profil
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Petunjuk:</strong> Seret area lingkaran untuk memposisikan wajah Anda di tengah.
            </p>
          </div>

          {/* Canvas container */}
          <div
            ref={containerRef}
            className="relative mx-auto bg-gray-900 rounded-lg overflow-hidden cursor-move"
            style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={CONTAINER_SIZE}
              height={CONTAINER_SIZE}
              className="block"
            />

            {!image && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                Memuat gambar...
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Hasil Crop</p>
              <canvas
                ref={previewCanvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                className="ring-2 ring-orange-300"
                style={{ borderRadius: circularCrop ? '50%' : '8px' }}
              />
            </div>

            <div className="text-xs text-gray-500">
              <p>Foto akan disimpan dalam</p>
              <p className="font-semibold text-gray-700">400 x 400 pixel</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={resetCrop} disabled={!image} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Batal
              </Button>
              <Button
                onClick={performCrop}
                disabled={!image}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
