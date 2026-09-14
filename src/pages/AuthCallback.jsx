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

      // role and is_active MUST be included here.
      // If the DB trigger didn't fire (or doesn't exist), this is the only
      // place the profile row gets created for Google OAuth users.
      // Without role='teacher', getTotalTeachers() returns 0 and the role-
      // based redirect below falls through to the catch-all branch.
      // Without is_active=true, the account-inactive guard kicks in and
      // immediately signs the user out.
      // NOTE: password_set is deliberately NOT set here. A brand-new user
      // (Google or email) must keep password_set=false so the first-login
      // gate below routes them to /create-password exactly once.
      // ignoreDuplicates:true → INSERT ... ON CONFLICT DO NOTHING
      // This means if a profile row already exists (e.g. the manager whose
      // role was set manually in the DB), this call is a no-op and the
      // existing role is never touched. Only brand-new users without any
      // profile row will have a row created here with role='teacher'.
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: 'teacher',
          is_active: true,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      return upsertError
    }

    async function handleCallback() {
      // Validate against the SERVER, not just the localStorage cache.
      // getSession() reads the cached JWT only — after you delete the auth
      // user + profiles row in the dashboard, the old token is still sitting
      // in localStorage and getSession() happily returns it (with the OLD
      // user id) until it expires. getUser() hits /auth/v1/user and 401s on
      // a deleted user, which is how we detect the stale cache and force a
      // clean sign-out instead of routing a ghost session to the dashboard.
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

      const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !serverUser || serverUser.id !== session.user.id) {
        console.warn('Stale cached session (auth user deleted or rotated). Clearing and restarting login.', userError)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        if (cancelled) return
        setError('Previous session was cleared. Redirecting to login…')
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 1200)
        return
      }

      const user = serverUser
      const userId = user.id

      // Provider is only used for the login activity label — NOT for routing.
      // New vs returning is decided purely by profiles.password_set below, so
      // Google first-timers see /create-password and Google returners don't.
      const identities = Array.isArray(user.identities) ? user.identities : []
      const hasGoogleIdentity = identities.some((i) => i?.provider === 'google')
      const isOAuthUser =
        hasGoogleIdentity || (user.app_metadata?.provider && user.app_metadata.provider !== 'email')

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

      // First-login gate: brand-new users (Google AND email) go to
      // /create-password exactly ONCE, when their profiles row still has
      // password_set=false. Returning users have password_set=true (set by
      // CreatePassword on first setup) so they skip straight to the
      // dashboard. Deleted-then-recreated accounts get a fresh profiles row
      // with password_set=false again, so they correctly see the screen.
      // This is derived fresh from the DB every login — no localStorage flag.
      if (profile.password_set === false) {
        navigate('/create-password', {
          replace: true,
          state: {
            firstLogin: true,
          },
        })

        return
      }

      // Redirect according to role
      if (profile.role === 'system_admin') {
        navigate('/admin/dashboard', {
          replace: true,
        })
      } else if (profile.role === 'document_manager') {
        navigate('/manager/dashboard', {
          replace: true,
        })
      } else if (profile.role === 'teacher') {
        navigate('/teacher', {
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
