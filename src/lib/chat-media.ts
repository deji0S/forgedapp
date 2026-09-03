import { supabase } from './supabase'
import type { MessageMediaType } from '../types/social'

const BUCKET = 'chat-media'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const IMAGE_MAX_DIMENSION = 1920
const IMAGE_JPEG_QUALITY = 0.82

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export interface ChatAttachment {
  path: string
  type: MessageMediaType
  mime: string
}

export function classifyAttachment(file: File): MessageMediaType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

export function validateAttachment(file: File): string | null {
  const kind = classifyAttachment(file)
  if (!kind) return 'Only photos and videos can be attached.'
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) return 'Photos must be under 10MB.'
  if (kind === 'video' && file.size > MAX_VIDEO_BYTES) return 'Videos must be under 50MB.'
  return null
}

/**
 * Downscales an image to at most IMAGE_MAX_DIMENSION on its longest side and
 * re-encodes as JPEG, to keep storage costs down. Animated GIFs are left
 * alone -- a canvas re-encode would flatten them to a single frame.
 */
async function compressImage(file: File): Promise<{ blob: Blob; mime: string }> {
  if (file.type === 'image/gif') return { blob: file, mime: file.type }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read image.'))
      el.src = objectUrl
    })

    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { blob: file, mime: file.type }
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_JPEG_QUALITY),
    )
    return blob ? { blob, mime: 'image/jpeg' } : { blob: file, mime: file.type }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadChatAttachment(
  senderId: string,
  recipientId: string,
  file: File,
): Promise<{ data: ChatAttachment | null; error: string | null }> {
  const validationError = validateAttachment(file)
  if (validationError) return { data: null, error: validationError }

  const kind = classifyAttachment(file)
  if (!kind) return { data: null, error: 'Only photos and videos can be attached.' }

  const { blob, mime } = kind === 'image' ? await compressImage(file) : { blob: file, mime: file.type }
  const ext = EXTENSION_BY_MIME[mime] ?? 'bin'
  const path = `${senderId}/${recipientId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime })
  if (error) return { data: null, error: error.message }

  return { data: { path, type: kind, mime }, error: null }
}

export async function getChatMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return { url: data?.signedUrl ?? null, error }
}
