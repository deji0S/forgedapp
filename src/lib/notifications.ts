import { supabase } from './supabase'
import type { NotificationPreferences } from '../types/notifications'

export async function getNotificationPreferences(userId: string) {
  return supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<NotificationPreferences>()
}

export async function saveNotificationPreferences(
  userId: string,
  input: { enabled: boolean; reminder_time: string; timezone: string },
) {
  return supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...input })
    .select()
    .single<NotificationPreferences>()
}
