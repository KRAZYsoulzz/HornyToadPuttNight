import { useState, useEffect, useCallback } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export async function resolveLoginEmail(usernameOrEmail: string): Promise<string | null> {
  const clean = usernameOrEmail.trim().toLowerCase()
  if (!clean) return null
  if (clean.includes('@')) return clean

  const { data, error } = await supabase.rpc('pp_director_email', { p_username: clean })
  if (error || typeof data !== 'string' || !data.includes('@')) return null
  return data
}

export function useAdmin() {
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let generation = 0

    const applySession = async (next: Session | null) => {
      const gen = ++generation
      if (!next) {
        if (!cancelled && gen === generation) {
          setIsAdmin(false)
          setEmail(null)
          setReady(true)
        }
        return
      }

      const { data, error } = await supabase.rpc('pp_is_admin')
      if (!cancelled && gen === generation) {
        const adminVerified = !error && data === true
        setIsAdmin(adminVerified)
        setEmail(next.user?.email ?? null)
        setReady(true)
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      const next = event === 'SIGNED_OUT' ? null : session
      setTimeout(() => { if (!cancelled) void applySession(next) }, 0)
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      void applySession(data.session ?? null)
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (usernameOrEmail: string, password: string): Promise<string | null> => {
    const resolvedEmail = await resolveLoginEmail(usernameOrEmail)
    if (!resolvedEmail) {
      return 'That username is not linked to a director yet.'
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    })
    if (signInError) {
      return signInError.message
    }

    const { data: admin, error: adminError } = await supabase.rpc('pp_is_admin')
    if (adminError || admin !== true) {
      await supabase.auth.signOut()
      return 'This account is not a tournament director.'
    }

    setIsAdmin(true)
    setEmail(resolvedEmail)
    setReady(true)
    return null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setEmail(null)
  }, [])

  return { ready, isAdmin, email, signIn, signOut }
}
