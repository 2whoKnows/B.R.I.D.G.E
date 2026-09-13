import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/Logactivity'
import '../styles/AuthCallback.css'

const PROFILE_RETRY_ATTEMPTS = 5
const PROFILE_RETRY_DELAY_MS = 600

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchProfile(userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active, password_set')
        .eq('id', userId)
        .maybeSingle()

      return { profile, error: profileError }
    }

    async function fetchProfileWithRetry(userId) {
      for (let attempt = 1; attempt <= PROFILE_RETRY_ATTEMPTS; attempt++) {
        const { profile, error: profileError } = await fetchProfile(userId)

        if (profileError) {
          return { profile: null, error: profileError }
        }

        if (profile) {
          return { profile, error: null }
        }

        if (attempt < PROFILE_RETRY_ATTEMPTS) {
          await wait(PROFILE_RETRY_DELAY_MS)
        }
      }

      return { profile: null, error: null }
    }

    async function createProfileFallback(user) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0]

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: 'id' }
      )

      return upsertError
    }

    async function handleCallback() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (sessionError || !session) {
        console.error('Session error:', sessionError)

        setError('Could not sign you in. Redirecting to login…')

        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 1500)

        return
      }

      const user = session.user
      const userId = user.id

      let { profile, error: profileError } = await fetchProfileWithRetry(userId)

      if (cancelled) return

      if (profileError) {
        console.error('Profile lookup error:', profileError)

        setError('Unable to load your account. Redirecting to login…')

        await supabase.auth.signOut()

        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 1500)

        return
      }

      // Trigger never fired (e.g. auth.users row already existed from an
      // earlier attempt) — create the profile ourselves as a fallback.
      if (!profile) {
        console.warn('No profile found after retries. Attempting fallback creation.')

        const createError = await createProfileFallback(user)

        if (cancelled) return

        if (createError) {
          console.error('Fallback profile creation failed:', createError)

          setError(
            'Your account profile was not created. Please contact an administrator.'
          )

          await supabase.auth.signOut()

          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)

          return
        }

        const refetched = await fetchProfile(userId)

        if (cancelled) return

        if (refetched.error || !refetched.profile) {
          console.error('Profile still missing after fallback creation:', refetched.error)

          setError(
            'Your account profile was not created. Please contact an administrator.'
          )

          await supabase.auth.signOut()

          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)

          return
        }

        profile = refetched.profile
      }

      // Account is inactive
      if (profile.is_active === false) {
        await supabase.auth.signOut()

        navigate('/login', {
          replace: true,
          state: {
            message: 'Your account is inactive. Contact an administrator.',
          },
        })

        return
      }

      // First login: password has not been created yet
      if (profile.password_set === false) {
        navigate('/create-password', {
          replace: true,
          state: {
            firstLogin: true,
          },
        })

        return
      }

      // Existing user with password
      await logActivity('login', {
        method: 'google',
      })

      // Redirect according to role
      if (profile.role === 'system_admin') {
        navigate('/admin/dashboard', {
          replace: true,
        })
      } else if (
        profile.role === 'document_manager' ||
        profile.role === 'teacher'
      ) {
        navigate('/manager/dashboard', {
          replace: true,
        })
      } else {
        navigate('/', {
          replace: true,
        })
      }
    }

    handleCallback()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="ac-page">
      <div className="ac-card">
        {!error && <div className="ac-spinner" aria-hidden="true" />}
        <p className="ac-text">{error || 'Signing you in…'}</p>
      </div>
    </div>
  )
}