import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { linkOneSignalUser, unlinkOneSignalUser } from './onesignal'
import type { OnboardingInput, Profile, ProfileHandleInput } from '../types/profile'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  completeOnboarding: (input: OnboardingInput) => Promise<string | null>
  updateProfilePreferences: (input: OnboardingInput) => Promise<string | null>
  updateProfileHandle: (input: ProfileHandleInput) => Promise<string | null>
  updateProfileAvatar: (avatarUrl: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        await loadProfile(data.session.user.id)
        linkOneSignalUser(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        await loadProfile(nextSession.user.id)
        linkOneSignalUser(nextSession.user.id)
      } else {
        setProfile(null)
        unlinkOneSignalUser()
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function completeOnboarding(input: OnboardingInput) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...input })
      .select()
      .single()
    if (error) return error.message
    setProfile(data)
    return null
  }

  async function updateProfilePreferences(input: OnboardingInput) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase
      .from('profiles')
      .update({
        fitness_level: input.fitness_level,
        goal: input.goal,
        workout_type: input.workout_type,
        days_per_week: input.days_per_week,
      })
      .eq('id', session.user.id)
      .select()
      .single()
    if (error) return error.message
    setProfile(data)
    return null
  }

  async function updateProfileHandle(input: ProfileHandleInput) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: input.username, display_name: input.display_name })
      .eq('id', session.user.id)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return 'That username is already taken.'
      return error.message
    }
    setProfile(data)
    return null
  }

  async function updateProfileAvatar(avatarUrl: string) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', session.user.id)
      .select()
      .single()
    if (error) return error.message
    setProfile(data)
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        completeOnboarding,
        updateProfilePreferences,
        updateProfileHandle,
        updateProfileAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
