import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const VIEWPORT = 280
const OUTPUT = 512

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

interface ImageCropperProps {
  src: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

/**
 * Pan/zoom cropper locked to a 1:1 output. The crop frame never changes
 * shape -- the user can only reposition and scale the image within it.
 */
function ImageCropper({ src, onCancel, onConfirm }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  function clampPos(nextScale: number, next: { x: number; y: number }) {
    if (!natural) return next
    const dW = natural.w * nextScale
    const dH = natural.h * nextScale
    const maxX = Math.max(0, (dW - VIEWPORT) / 2)
    const maxY = Math.max(0, (dH - VIEWPORT) / 2)
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) }
  }

  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    const min = Math.max(VIEWPORT / w, VIEWPORT / h)
    setNatural({ w, h })
    setMinScale(min)
    setScale(min)
    setPos({ x: 0, y: 0 })
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startY: event.clientY, posX: pos.x, posY: pos.y }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    const dx = event.clientX - dragRef.current.startX
    const dy = event.clientY - dragRef.current.startY
    setPos(clampPos(scale, { x: dragRef.current.posX + dx, y: dragRef.current.posY + dy }))
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoomChange(value: number) {
    setScale(value)
    setPos((prev) => clampPos(value, prev))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img || !natural) return
    setSaving(true)

    const sSize = VIEWPORT / scale
    const sx = natural.w / 2 - (VIEWPORT / 2 + pos.x) / scale
    const sy = natural.h / 2 - (VIEWPORT / 2 + pos.y) / scale

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setSaving(false)
      return
    }
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT)

    canvas.toBlob(
      (blob) => {
        setSaving(false)
        if (blob) onConfirm(blob)
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/90 p-6">
      <div
        className="relative touch-none overflow-hidden rounded-2xl border-2 border-white/80"
        style={{ width: VIEWPORT, height: VIEWPORT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Crop preview"
          onLoad={handleImageLoad}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-w-none select-none"
          style={
            natural
              ? {
                  width: natural.w * scale,
                  height: natural.h * scale,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }
              : { opacity: 0 }
          }
        />
      </div>

      <input
        type="range"
        min={minScale}
        max={minScale * 4}
        step={(minScale * 4 - minScale) / 100 || 0.001}
        value={scale}
        onChange={(e) => handleZoomChange(Number(e.target.value))}
        disabled={!natural}
        className="w-full max-w-xs accent-brand-500"
        aria-label="Zoom"
      />

      <div className="flex w-full max-w-xs gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!natural || saving}
          className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default ImageCropper
