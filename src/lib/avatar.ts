import { supabase } from './supabase'

const BUCKET = 'avatars'

/**
 * Uploads a cropped avatar image (JPEG blob) to `<userId>/avatar.jpg`,
 * overwriting any previous one, and returns a cache-busted public URL.
 */
export async function uploadAvatar(userId: string, blob: Blob) {
  const path = `${userId}/avatar.jpg`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
}

/** Deletes `<userId>/avatar.jpg` from storage. */
export async function removeAvatar(userId: string) {
  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  return { error }
}
