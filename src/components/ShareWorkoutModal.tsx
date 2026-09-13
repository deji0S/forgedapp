import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { getMutualFollows } from '../lib/social'
import { shareWorkoutToChat } from '../lib/messages'
import type { PublicProfile } from '../types/profile'
import type { WorkoutPlan } from '../types/tracking'

function ContactAvatar({ profile }: { profile: PublicProfile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-800 object-cover"
      />
    )
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
      </svg>
    </div>
  )
}

export function ShareWorkoutModal({
  workout,
  onClose,
}: {
  workout: WorkoutPlan
  onClose: () => void
}) {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    getMutualFollows(user.id).then(({ data }) => {
      if (!active) return
      setContacts(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  async function handleShare(recipientId: string) {
    if (!user || sendingId) return
    setSendingId(recipientId)
    setError(null)
    const { error: shareError } = await shareWorkoutToChat(user.id, recipientId, workout)
    setSendingId(null)
    if (shareError) {
      setError(shareError.message)
      return
    }
    setSentIds((prev) => new Set(prev).add(recipientId))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-workout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p id="share-workout-title" className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-white">
            Share "{workout.name}"
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-neutral-600 dark:text-neutral-400 pressable"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You can share with people who follow you back. Follow some mutuals first.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((contact) => {
              const sent = sentIds.has(contact.id)
              return (
                <li
                  key={contact.id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <ContactAvatar profile={contact} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 dark:text-white">
                      {contact.display_name || contact.username || 'Forged user'}
                    </p>
                    {contact.username && (
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">@{contact.username}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleShare(contact.id)}
                    disabled={sent || sendingId === contact.id}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold pressable disabled:opacity-60 ${
                      sent
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        : 'bg-black dark:bg-white text-white dark:text-black'
                    }`}
                  >
                    {sent ? 'Sent ✓' : sendingId === contact.id ? 'Sending…' : 'Send'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
