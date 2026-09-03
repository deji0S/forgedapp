import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { getFollowers, getFollowing } from '../lib/social'
import type { PublicProfile } from '../types/profile'

function ResultAvatar({ profile }: { profile: PublicProfile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
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

function FollowList({ kind }: { kind: 'followers' | 'following' }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    const fetcher = kind === 'followers' ? getFollowers : getFollowing
    fetcher(user.id).then(({ data }) => {
      if (!active) return
      setProfiles(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user, kind])

  return (
    <div className="space-y-4 p-4">
      <Link to="/profile" className="text-sm font-medium text-white active:opacity-80">
        ← Back to Fitness Profile
      </Link>

      <h1 className="text-2xl font-semibold text-white">
        {kind === 'followers' ? 'Followers' : 'Following'}
      </h1>

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}

      {!loading && profiles.length === 0 && (
        <p className="text-sm text-neutral-400">
          {kind === 'followers' ? "No followers yet." : "Not following anyone yet."}
        </p>
      )}

      {!loading && profiles.length > 0 && (
        <ul className="space-y-2">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Link
                to={`/connect/${profile.id}`}
                className="flex items-center gap-3 rounded-2xl border border-neutral-800 p-3 active:opacity-80"
              >
                <ResultAvatar profile={profile} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {profile.display_name || profile.username || 'Forged user'}
                  </p>
                  {profile.username && (
                    <p className="truncate text-sm text-neutral-400">@{profile.username}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FollowList
