import { supabase } from './supabase'
import type { ChatAttachment } from './chat-media'
import { getProfilesByIds } from './social'
import type { ConversationPreview, Message } from '../types/social'

const MESSAGE_COLUMNS = 'id, sender_id, recipient_id, body, media_path, media_type, media_mime, created_at'

// A conversation is just the set of distinct people a user has exchanged
// messages with -- there's no separate conversations table (see the
// messages RLS design notes). This pulls recent history and reduces it to
// one row per other participant, keeping only the most recent message.
// Bounded to the last 500 messages so the list stays cheap without a
// dedicated aggregation query; plenty for how this app is used today.
export async function listConversations(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error || !data) return { data: [] as ConversationPreview[], error }

  const latestByOtherId = new Map<string, Message>()
  for (const message of data as Message[]) {
    const otherId = message.sender_id === userId ? message.recipient_id : message.sender_id
    if (!latestByOtherId.has(otherId)) latestByOtherId.set(otherId, message)
  }

  const otherIds = [...latestByOtherId.keys()]
  const { data: profiles } = await getProfilesByIds(otherIds)

  const conversations = profiles.map((profile): ConversationPreview => ({
    profile,
    lastMessage: latestByOtherId.get(profile.id)!,
  }))

  return { data: conversations, error: null }
}

export async function getConversation(currentUserId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
    )
    .order('created_at', { ascending: true })
  return { data: (data as Message[] | null) ?? [], error }
}

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string | null,
  attachment?: ChatAttachment | null,
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      body,
      media_path: attachment?.path ?? null,
      media_type: attachment?.type ?? null,
      media_mime: attachment?.mime ?? null,
    })
    .select(MESSAGE_COLUMNS)
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
