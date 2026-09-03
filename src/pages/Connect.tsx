import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { searchProfiles } from '../lib/social'
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

function Connect() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      const { data } = await searchProfiles(term, user?.id)
      setResults(data)
      setLoading(false)
      setSearched(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, user?.id])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-white">Connect</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username or name"
        autoComplete="off"
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none"
      />

      {loading && <p className="text-sm text-neutral-400">Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-sm text-neutral-400">No one found for "{query.trim()}".</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((profile) => (
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

export default Connect
