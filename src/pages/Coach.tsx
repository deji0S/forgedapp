import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { PremiumGate } from '../components/PremiumGate'
import { buildCoachReport } from '../lib/coach'
import { listWorkoutLogs } from '../lib/tracking'
import type { WorkoutLog } from '../types/tracking'

function CoachReportView({ logs, loading }: { logs: WorkoutLog[]; loading: boolean }) {
  const { profile } = useAuth()
  const report = useMemo(() => buildCoachReport(logs, profile), [logs, profile])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-900" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-900" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-900" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-white">{report.headline}</p>
      <ul className="space-y-3">
        {report.points.map((point) => (
          <li key={point.label} className="rounded-2xl border border-neutral-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">
              {point.label}
            </p>
            <p className="mt-1 text-sm text-neutral-200">{point.detail}</p>
          </li>
        ))}
      </ul>
      {report.generatedFrom > 0 && (
        <p className="text-xs text-neutral-500">
          Based on your last {report.generatedFrom} logged workout
          {report.generatedFrom === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}

function Coach() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    listWorkoutLogs(user.id, 60).then(({ data }) => {
      if (!active) return
      setLogs(data ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="space-y-5 p-4">
      <div>
        <Link to="/" className="text-sm font-medium text-neutral-400">
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Your coach</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Personalized guidance from your recent training.
        </p>
      </div>

      <PremiumGate
        feature="AI coach"
        description="Adaptive coaching that reads your consistency, volume, and feedback trend."
      >
        <CoachReportView logs={logs} loading={loading} />
      </PremiumGate>
    </div>
  )
}

export default Coach
