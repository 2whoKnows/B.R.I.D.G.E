import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/Logactivity'
import '../styles/AuthCallback.css'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

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

      const userId = session.user.id

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('role, is_active, password_set')
        .eq('id', userId)
        .maybeSingle()

      if (cancelled) return

      if (profileError) {
        console.error('Profile lookup error:', profileError)

        setError(
          'Unable to load your account. Redirecting to login…'
        )

        await supabase.auth.signOut()

        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 1500)

        return
      }

      // Profile should have been created automatically
      // by the on_auth_user_created database trigger.
      if (!profile) {
        console.error(
          'No profile found. The database trigger may not have created it.'
        )

        setError(
          'Your account profile was not created. Please contact an administrator.'
        )

        await supabase.auth.signOut()

        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 2000)

        return
      }

      // Account is inactive
      if (profile.is_active === false) {
        await supabase.auth.signOut()

        navigate('/login', {
          replace: true,
          state: {
            message:
              'Your account is inactive. Contact an administrator.',
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
        {!error && (
          <div
            className="ac-spinner"
            aria-hidden="true"
          />
        )}

        <p className="ac-text">
          {error || 'Signing you in…'}
        </p>
      </div>
    </div>
  )
}