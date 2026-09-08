import { Link } from 'react-router-dom'
import { useCookieConsent } from '../lib/cookie-consent-context'

export default function CookieConsentBanner() {
  const { consent, accept, decline } = useCookieConsent()

  if (consent !== null) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-neutral-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-black">
      <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
        We use essential cookies/local storage to keep you signed in, which don't require consent
        to work. With your permission, we'd also like to use non-essential cookies for push
        notification reminders — see our{' '}
        <Link to="/privacy" className="font-medium text-neutral-900 underline dark:text-white">
          Privacy Policy
        </Link>{' '}
        for details. You can change your choice anytime in Settings.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={decline}
          className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 py-2.5 text-sm font-semibold text-neutral-900 pressable dark:text-white"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-xl bg-black dark:bg-white py-2.5 text-sm font-semibold text-white dark:text-black pressable"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
