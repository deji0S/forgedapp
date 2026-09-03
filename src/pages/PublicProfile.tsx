import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { profileDetails } from '../lib/profile-options'
import { getPublicProfile } from '../lib/social'
import type { PublicProfile as PublicProfileType } from '../types/profile'

function PublicProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfileType | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setNotFound(false)
    getPublicProfile(id).then(({ data }) => {
      if (!active) return
      setProfile(data)
      setNotFound(!data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="space-y-4 p-4">
      <Link to="/connect" className="text-sm font-medium text-brand-400 active:opacity-80">
        ← Back to Connect
      </Link>

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}

      {!loading && notFound && <p className="text-sm text-neutral-400">This user couldn't be found.</p>}

      {!loading && profile && (
        <>
          <div className="flex flex-col items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile picture"
                className="h-24 w-24 rounded-full border border-neutral-800 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12">
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
                </svg>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-semibold text-white">
                {profile.display_name || profile.username || 'Forged user'}
              </p>
              {profile.username && <p className="text-neutral-400">@{profile.username}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-neutral-800 p-4 text-sm">
            <p className="font-medium text-white">Fitness profile</p>
            {profileDetails(profile).map((detail) => (
              <p key={detail.label} className="flex justify-between">
                <span className="text-neutral-400">{detail.label}</span>
                <span className="font-medium text-white">{detail.value}</span>
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default PublicProfile
