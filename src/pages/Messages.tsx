import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { listConversations } from '../lib/messages'
import type { ConversationPreview } from '../types/social'

function ConversationAvatar({ preview }: { preview: ConversationPreview }) {
  if (preview.profile.avatar_url) {
    return (
      <img
        src={preview.profile.avatar_url}
        alt=""
        className="h-12 w-12 rounded-full border border-neutral-800 object-cover"
      />
    )
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
      </svg>
    </div>
  )
}

function previewText(preview: ConversationPreview) {
  const { lastMessage } = preview
  if (lastMessage.body) return lastMessage.body
  if (lastMessage.media_type === 'video') return '🎥 Video'
  if (lastMessage.media_type === 'image') return '📷 Photo'
  return ''
}

function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    listConversations(user.id).then(({ data }) => {
      if (!active) return
      setConversations(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-white">Messages</h1>

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}

      {!loading && conversations.length === 0 && (
        <p className="text-sm text-neutral-400">
          No conversations yet — message a mutual follower from their profile.
        </p>
      )}

      {!loading && conversations.length > 0 && (
        <ul className="space-y-2">
          {conversations.map((preview) => (
            <li key={preview.profile.id}>
              <Link
                to={`/messages/${preview.profile.id}`}
                className="flex items-center gap-3 rounded-2xl border border-neutral-800 p-3 active:opacity-80"
              >
                <ConversationAvatar preview={preview} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {preview.profile.display_name || preview.profile.username || 'Forged user'}
                  </p>
                  {preview.profile.username && (
                    <p className="truncate text-xs text-neutral-500">@{preview.profile.username}</p>
                  )}
                  <p className="mt-0.5 truncate text-sm text-neutral-400">{previewText(preview)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Messages
