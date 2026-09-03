import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { getFollowState, getPublicProfile } from '../lib/social'
import { getConversation, sendMessage, subscribeToIncomingMessages } from '../lib/messages'
import type { PublicProfile } from '../types/profile'
import type { Message } from '../types/social'

function Conversation() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [canMessage, setCanMessage] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

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
  }, [messages])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !user || !id) return
    setSending(true)
    setError(null)
    const { data, error: sendError } = await sendMessage(user.id, id, body)
    setSending(false)
    if (sendError || !data) {
      setError(sendError?.message ?? 'Could not send message.')
      return
    }
    setMessages((prev) => [...prev, data])
    setDraft('')
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
                <p
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                    mine ? 'bg-brand-500 text-white' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {message.body}
                </p>
              </div>
            )
          })}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-neutral-400">No messages yet — say hello.</p>
        )}

        <div ref={bottomRef} />
      </div>

      {canMessage ? (
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-20 flex gap-2 border-t border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur"
        >
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
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            Send
          </button>
        </form>
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
