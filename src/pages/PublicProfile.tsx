import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { profileDetails } from '../lib/profile-options'
import { followUser, getFollowState, getPublicProfile, unfollowUser } from '../lib/social'
import { blockUser } from '../lib/moderation'
import { getStreak } from '../lib/tracking'
import { StreakHero } from '../components/StreakHero'
import { ActionMenu } from '../components/ActionMenu'
import { BlockConfirmDialog } from '../components/BlockConfirmDialog'
import { ReportModal } from '../components/ReportModal'
import type { PublicProfile as PublicProfileType } from '../types/profile'
import type { FollowState } from '../types/social'
import type { Streak } from '../types/tracking'

function FollowButton({
  currentUserId,
  targetId,
  state,
  onChange,
}: {
  currentUserId: string
  targetId: string
  state: FollowState | null
  onChange: (state: FollowState) => void
}) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (!state || pending) return
    setPending(true)
    if (state.isFollowing) {
      const { error } = await unfollowUser(currentUserId, targetId)
      if (!error) onChange({ ...state, isFollowing: false })
    } else {
      const { error } = await followUser(currentUserId, targetId)
      if (!error) onChange({ ...state, isFollowing: true })
    }
    setPending(false)
  }

  if (!state) return null

  const label = state.isFollowing ? 'Following' : state.isFollowedBy ? 'Follow Back' : 'Follow'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-xl px-6 py-2 text-sm font-semibold pressable disabled:opacity-60 ${
        state.isFollowing
          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
          : 'bg-black dark:bg-white text-white dark:text-black'
      }`}
    >
      {pending ? '…' : label}
    </button>
  )
}

function PublicProfile() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfileType | null>(null)
  const [followState, setFollowState] = useState<FollowState | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [confirmingBlock, setConfirmingBlock] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    let active = true
    setLoading(true)
    setNotFound(false)
    setStreak(null)
    getPublicProfile(id).then(({ data }) => {
      if (!active) return
      setProfile(data)
      setNotFound(!data)
      setLoading(false)
    })
    getStreak(id).then(({ data }) => {
      if (active) setStreak(data)
    })
    if (id !== user.id) {
      getFollowState(user.id, id).then(({ data }) => {
        if (active) setFollowState(data)
      })
    }
    return () => {
      active = false
    }
  }, [id, user])

  async function handleBlock() {
    if (!profile) return
    setBlocking(true)
    const { error } = await blockUser({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    })
    setBlocking(false)
    setConfirmingBlock(false)
    if (!error) setBlocked(true)
  }

  return (
    <div className="space-y-4 p-4">
      <Link to="/connect" className="text-sm font-medium text-neutral-900 dark:text-white pressable">
        ← Back to Connect
      </Link>

      {loading && <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</p>}

      {!loading && notFound && <p className="text-sm text-neutral-600 dark:text-neutral-400">This user couldn't be found.</p>}

      {!loading && profile && blocked && (
        <div className="space-y-3 py-8 text-center">
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            You've blocked {profile.display_name || profile.username || 'this user'}.
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            They can no longer message you or find you in search. Manage blocked accounts in
            Settings.
          </p>
          <Link
            to="/connect"
            className="inline-block rounded-xl border border-neutral-200 dark:border-neutral-800 px-6 py-2 text-sm font-semibold text-neutral-900 dark:text-white pressable"
          >
            Back to Connect
          </Link>
        </div>
      )}

      {!loading && profile && !blocked && (
        <>
          <div className="flex flex-col items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${profile.display_name || profile.username || 'This user'}'s profile picture`}
                className="h-24 w-24 rounded-full border border-neutral-200 dark:border-neutral-800 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-12 w-12">
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
                </svg>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                {profile.display_name || profile.username || 'Forged user'}
              </p>
              {profile.username && <p className="text-neutral-600 dark:text-neutral-400">@{profile.username}</p>}
            </div>
            {user && user.id !== profile.id && (
              <div className="flex items-center gap-2">
                <FollowButton
                  currentUserId={user.id}
                  targetId={profile.id}
                  state={followState}
                  onChange={setFollowState}
                />
                {followState?.isFollowing && followState?.isFollowedBy && (
                  <Link
                    to={`/messages/${profile.id}`}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-6 py-2 text-sm font-semibold text-neutral-900 dark:text-white pressable"
                  >
                    Message
                  </Link>
                )}
                <ActionMenu
                  ariaLabel="More options"
                  items={[
                    { label: 'Report user', onClick: () => setReporting(true) },
                    { label: 'Block user', onClick: () => setConfirmingBlock(true), destructive: true },
                  ]}
                />
              </div>
            )}
          </div>

          <StreakHero streak={streak} />

          <div className="space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm">
            <p className="font-medium text-neutral-900 dark:text-white">Fitness profile</p>
            {profileDetails(profile).map((detail) => (
              <p key={detail.label} className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">{detail.label}</span>
                <span className="font-medium text-neutral-900 dark:text-white">{detail.value}</span>
              </p>
            ))}
          </div>
        </>
      )}

      {confirmingBlock && profile && (
        <BlockConfirmDialog
          label={profile.display_name || profile.username || 'this user'}
          blocking={blocking}
          onCancel={() => setConfirmingBlock(false)}
          onConfirm={handleBlock}
        />
      )}

      {reporting && profile && (
        <ReportModal
          reportedUserId={profile.id}
          reportedUserLabel={profile.display_name || profile.username || 'this user'}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}

export default PublicProfile
