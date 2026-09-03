import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { getFollowState, getPublicProfile } from '../lib/social'
import { getConversation, sendMessage, subscribeToIncomingMessages } from '../lib/messages'
import { getChatMediaUrl, uploadChatAttachment, validateAttachment } from '../lib/chat-media'
import type { ChatAttachment } from '../lib/chat-media'
import type { PublicProfile } from '../types/profile'
import type { Message } from '../types/social'

function MessageMedia({ message }: { message: Message }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!message.media_path) return
    let active = true
    getChatMediaUrl(message.media_path).then(({ url }) => {
      if (active) setSignedUrl(url)
    })
    return () => {
      active = false
    }
  }, [message.media_path])

  if (!message.media_path) return null
  if (!signedUrl) return <div className="h-40 w-56 animate-pulse rounded-xl bg-neutral-700" />

  if (message.media_type === 'video') {
    return <video src={signedUrl} controls className="max-h-72 w-full rounded-xl" />
  }
  return <img src={signedUrl} alt="" className="max-h-72 w-full rounded-xl object-cover" />
}

function Conversation() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [canMessage, setCanMessage] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user || !id) return
    let active = true

    setLoading(true)
    Promise.all([getPublicProfile(id), getFollowState(user.id, id), getConversation(user.id, id)]).then(
      ([profileResult, followResult, conversationResult]) => {
        if (!active) return
        setProfile(profileResult.data)
        setCanMessage(!!followResult.data?.isFollowing && !!followResult.data?.isFollowedBy)
        setMessages(conversationResult.data)
        setLoading(false)
      },
    )

    return () => {
      active = false
    }
  }, [user, id])

  useEffect(() => {
    if (!user || !id) return
    return subscribeToIncomingMessages(user.id, id, (message) => {
      setMessages((prev) => [...prev, message])
    })
  }, [user, id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, attachment])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user || !id) return

    const validationError = validateAttachment(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)
    const { data, error: uploadError } = await uploadChatAttachment(user.id, id, file)
    setUploading(false)
    if (uploadError || !data) {
      setError(uploadError ?? 'Could not upload file.')
      return
    }
    setAttachment(data)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if ((!body && !attachment) || !user || !id) return
    setSending(true)
    setError(null)
    const { data, error: sendError } = await sendMessage(user.id, id, body || null, attachment)
    setSending(false)
    if (sendError || !data) {
      setError(sendError?.message ?? 'Could not send message.')
      return
    }
    setMessages((prev) => [...prev, data])
    setDraft('')
    setAttachment(null)
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
        <Link to={id ? `/connect/${id}` : '/connect'} className="text-brand-400 active:opacity-80">
          ←
        </Link>
        <p className="font-medium text-white">
          {profile?.display_name || profile?.username || 'Conversation'}
        </p>
      </div>

      <div className="space-y-2 p-4">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}

        {!loading &&
          messages.map((message) => {
            const mine = message.sender_id === user?.id
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] space-y-1 rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {message.media_path && <MessageMedia message={message} />}
                  {message.body && <p className="whitespace-pre-wrap break-words px-1">{message.body}</p>}
                </div>
              </div>
            )
          })}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-neutral-400">No messages yet — say hello.</p>
        )}

        <div ref={bottomRef} />
      </div>

      {canMessage ? (
        <div className="sticky bottom-20 space-y-2 border-t border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
          {attachment && (
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 p-2 text-xs text-neutral-300">
              <span>{attachment.type === 'video' ? '🎥 Video attached' : '🖼️ Photo attached'}</span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="font-semibold text-red-400 active:opacity-80"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-white active:opacity-80 disabled:opacity-60"
              aria-label="Attach photo or video"
            >
              {uploading ? '…' : '📎'}
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message…"
              maxLength={2000}
              autoComplete="off"
              className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || uploading || (!draft.trim() && !attachment)}
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        !loading && (
          <p className="sticky bottom-20 border-t border-neutral-800 bg-neutral-950/95 p-4 text-center text-sm text-neutral-400 backdrop-blur">
            You can message each other once you both follow each other.
          </p>
        )
      )}

      {error && <p className="px-4 pb-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default Conversation
