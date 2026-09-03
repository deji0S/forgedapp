import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { getFollowState, getPublicProfile } from '../lib/social'
import { getConversation, sendMessage, subscribeToIncomingMessages } from '../lib/messages'
import { getChatMediaUrl, uploadChatAttachment, validateAttachment } from '../lib/chat-media'
import type { ChatAttachment } from '../lib/chat-media'
import {
  chatStreakRecoveryEligibility,
  getChatStreak,
  getChatStreakRecoveryStatus,
  recordChatOpen,
  recoverChatStreak,
  subscribeToChatStreak,
} from '../lib/chat-streak'
import type { RestoralStatus } from '../lib/streak'
import { PremiumGate } from '../components/PremiumGate'
import type { PublicProfile } from '../types/profile'
import type { ChatStreak, Message } from '../types/social'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function JointRestoralCard({
  streak,
  otherUserId,
  onRestored,
}: {
  streak: ChatStreak
  otherUserId: string
  onRestored: (next: ChatStreak) => void
}) {
  const eligibility = chatStreakRecoveryEligibility(streak)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!eligibility.eligible) return null

  async function handleRestore() {
    setRestoring(true)
    setError(null)
    const { data, error: rpcError } = await recoverChatStreak(otherUserId)
    setRestoring(false)
    if (rpcError || !data) {
      setError(rpcError?.message ?? 'Could not restore your joint streak.')
      return
    }
    onRestored(data)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div>
        <p className="text-sm font-semibold text-white">Joint streak at risk</p>
        <p className="mt-1 text-xs text-neutral-300">
          You missed {eligibility.missedDays} day{eligibility.missedDays === 1 ? '' : 's'} together.
          Restore now to keep your {streak.longest_streak}-day best intact.
        </p>
      </div>
      <PremiumGate
        feature="Joint streak restoral"
        description="Restore a lapsed joint streak once a week, usable by either of you."
      >
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black active:opacity-80 disabled:opacity-60"
        >
          {restoring ? 'Restoring…' : 'Restore joint streak'}
        </button>
      </PremiumGate>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

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
  const [streak, setStreak] = useState<ChatStreak | null>(null)
  const [restoralStatus, setRestoralStatus] = useState<RestoralStatus | null>(null)
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
        const mutual = !!followResult.data?.isFollowing && !!followResult.data?.isFollowedBy
        setProfile(profileResult.data)
        setCanMessage(mutual)
        setMessages(conversationResult.data)
        setLoading(false)

        if (mutual) {
          recordChatOpen(user.id, id).then(() => {
            if (!active) return
            getChatStreak(user.id, id).then(({ data }) => {
              if (active) setStreak(data)
            })
          })
          getChatStreakRecoveryStatus(user.id, id).then((status) => {
            if (active) setRestoralStatus(status)
          })
        }
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
    if (!user || !id) return
    return subscribeToChatStreak(user.id, id, setStreak)
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
      <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to={id ? `/connect/${id}` : '/connect'} className="text-brand-400 active:opacity-80">
            ←
          </Link>
          <p className="flex-1 font-medium text-white">
            {profile?.display_name || profile?.username || 'Conversation'}
          </p>
          {!!streak?.current_streak && (
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-white">
              🔥 {streak.current_streak}-day streak
            </span>
          )}
        </div>
        {canMessage && restoralStatus && (
          <p className="mt-1 pl-7 text-xs text-neutral-500">
            Joint restoral:{' '}
            {restoralStatus.remaining > 0 ? 'available' : `resets ${formatDate(restoralStatus.nextAvailable!)}`}
          </p>
        )}
      </div>

      <div className="space-y-2 p-4">
        {loading && <p className="text-sm text-neutral-400">Loading…</p>}

        {!loading && streak && id && (
          <JointRestoralCard
            streak={streak}
            otherUserId={id}
            onRestored={(next) => {
              setStreak(next)
              if (user) getChatStreakRecoveryStatus(user.id, id).then(setRestoralStatus)
            }}
          />
        )}

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
