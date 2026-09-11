import { useState } from 'react'
import type { FormEvent } from 'react'
import OptionGroup from './OptionGroup'
import { fileReport } from '../lib/moderation'
import type { ReportReason } from '../types/social'

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'abuse', label: 'Abuse' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'illegal_content', label: 'Illegal content' },
  { value: 'other', label: 'Other' },
]

export function ReportModal({
  reportedUserId,
  reportedUserLabel,
  messageId,
  onClose,
}: {
  reportedUserId: string
  reportedUserLabel: string
  messageId?: string
  onClose: () => void
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!reason) return
    setSubmitting(true)
    setError(null)
    const { error: submitError } = await fileReport({
      reportedUserId,
      reason,
      details,
      messageId,
    })
    setSubmitting(false)
    if (submitError) {
      setError('Could not submit your report. Please try again.')
      return
    }
    setDone(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5"
        onClick={(event) => event.stopPropagation()}
      >
        {done ? (
          <>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">Report submitted</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Thanks — our team will review this {messageId ? 'message' : 'account'}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-black dark:bg-white py-3 text-sm font-semibold text-white dark:text-black pressable"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p id="report-title" className="text-sm font-medium text-neutral-900 dark:text-white">
                Report {reportedUserLabel}
              </p>
              {messageId && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Reporting a specific message.</p>
              )}
            </div>

            <OptionGroup options={REASON_OPTIONS} value={reason} onChange={setReason} />

            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Additional details (optional)"
              aria-label="Additional details"
              maxLength={1000}
              rows={3}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-600 dark:placeholder:text-neutral-400 focus:border-black dark:focus:border-white focus:outline-none"
            />

            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-xl bg-neutral-200 dark:bg-neutral-800 py-3 text-sm font-semibold text-neutral-900 dark:text-white pressable disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white pressable disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
