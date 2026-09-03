import { supabase } from './supabase'
import type { Message } from '../types/social'

export async function getConversation(currentUserId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at')
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
    )
    .order('created_at', { ascending: true })
  return { data: (data as Message[] | null) ?? [], error }
}

export async function sendMessage(senderId: string, recipientId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, body })
    .select('id, sender_id, recipient_id, body, created_at')
    .single()
  return { data: data as Message | null, error }
}

// Delivers new incoming messages from `otherUserId` in real time. Messages
// this user sends are appended locally on a successful send, so this only
// needs to watch the other side of the conversation.
export function subscribeToIncomingMessages(
  currentUserId: string,
  otherUserId: string,
  onMessage: (message: Message) => void,
) {
  const channel = supabase
    .channel(`messages:${otherUserId}->${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${otherUserId}`,
      },
      (payload) => {
        const message = payload.new as Message
        if (message.recipient_id === currentUserId) onMessage(message)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
