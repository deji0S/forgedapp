import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clearCookieConsent,
  getCookieConsent,
  setCookieConsent as persistCookieConsent,
} from './cookie-consent'
import type { CookieConsent } from './cookie-consent'
import { linkOneSignalUser, unlinkOneSignalUser } from './onesignal'
import { supabase } from './supabase'

interface CookieConsentContextValue {
  consent: CookieConsent | null
  accept: () => void
  decline: () => void
  /** Lets a user revisit their choice later, e.g. from Settings. */
  reconsider: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(() => getCookieConsent())

  async function accept() {
    persistCookieConsent('accepted')
    setConsent('accepted')
    // Non-essential integrations (push reminders) may have been skipped at
    // startup while consent was undecided -- link now if already signed in.
    const { data } = await supabase.auth.getSession()
    if (data.session) linkOneSignalUser(data.session.user.id)
  }

  function decline() {
    persistCookieConsent('declined')
    setConsent('declined')
    unlinkOneSignalUser()
  }

  function reconsider() {
    clearCookieConsent()
    setConsent(null)
  }

  return (
    <CookieConsentContext.Provider value={{ consent, accept, decline, reconsider }}>
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  return ctx
}
