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
  signUp: (email: string, password: string, username: string) => Promise<string | null>
  signIn: (identifier: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  changeEmail: (newEmail: string) => Promise<string | null>
  deleteAccount: (confirmation: string) => Promise<string | null>
  completeOnboarding: (input: OnboardingInput) => Promise<string | null>
  updateProfilePreferences: (input: OnboardingInput) => Promise<string | null>
  updateProfileHandle: (input: ProfileHandleInput) => Promise<string | null>
  updateProfileAvatar: (avatarUrl: string | null) => Promise<string | null>
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

  async function signUp(email: string, password: string, username: string) {
    const handle = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      return 'Username must be 3–20 characters: lowercase letters, numbers, or underscores.'
    }

    // With "Confirm email" on, signUp() won't error for an existing address
    // (Supabase anti-enumeration), so ask the DB up front. email_registered
    // and username_available are SECURITY DEFINER functions — see migrations
    // 0010 and 0011.
    const { data: alreadyRegistered, error: emailCheckError } = await supabase.rpc(
      'email_registered',
      { email_input: email },
    )
    if (!emailCheckError && alreadyRegistered === true) {
      return 'An account with this email already exists — try logging in instead.'
    }

    const { data: usernameFree, error: usernameCheckError } = await supabase.rpc(
      'username_available',
      { username_input: handle },
    )
    if (!usernameCheckError && usernameFree === false) {
      return 'That username is taken — please choose another.'
    }

    // Username is persisted to the profiles row by the on_auth_user_created
    // trigger, which reads it from user metadata.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: handle } },
    })
    if (error) {
      // Belt and braces: signUp does surface this when "Confirm email" is off.
      if (
        error.code === 'user_already_exists' ||
        /already registered|already exists/i.test(error.message)
      ) {
        return 'An account with this email already exists — try logging in instead.'
      }
      // The trigger's insert hit the unique username index between our check
      // and now; Supabase reports this as a generic "database error".
      if (/database error saving new user/i.test(error.message)) {
        return 'That username was just taken — please choose another.'
      }
      return error.message
    }
    return null
  }

  // `identifier` is an email (contains '@') or a username. Usernames are
  // resolved to an email by the resolve-username edge function (service role);
  // accounts that predate usernames just sign in with their email.
  async function signIn(identifier: string, password: string) {
    const trimmed = identifier.trim()
    let email = trimmed

    if (!trimmed.includes('@')) {
      const { data, error } = await supabase.functions.invoke<{ email?: string; error?: string }>(
        'resolve-username',
        { body: { username: trimmed } },
      )
      if (error) return 'Could not sign you in. Please try again.'
      if (data?.error) return data.error
      if (!data?.email) return "We couldn't find an account with that username."
      email = data.email
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const email = session?.user.email
    if (!email) return 'You must be signed in.'

    // Supabase does not verify the current password on updateUser, so
    // re-authenticate first to prove the user knows it.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (reauthError) return 'Current password is incorrect.'

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error?.message ?? null
  }

  async function changeEmail(newEmail: string) {
    if (!session) return 'You must be signed in.'
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    return error?.message ?? null
  }

  // Permanently deletes the account. `confirmation` is the user's own email
  // or current password; the delete-account edge function re-verifies it
  // with the service role key, then removes the auth user and, by FK
  // cascade, every row they own. Irreversible.
  async function deleteAccount(confirmation: string) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'delete-account',
      { body: { confirmation } },
    )
    if (error) return error.message
    if (data?.error) return data.error
    if (!data?.ok) return 'Could not delete your account. Please try again.'
    await supabase.auth.signOut()
    return null
  }

  async function completeOnboarding(input: OnboardingInput) {
    if (!session) return 'You must be signed in.'
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...input, onboarded: true })
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

  async function updateProfileAvatar(avatarUrl: string | null) {
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
        changePassword,
        changeEmail,
        deleteAccount,
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
