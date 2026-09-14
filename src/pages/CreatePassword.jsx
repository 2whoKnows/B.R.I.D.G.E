import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getPasswordStrength } from '../lib/passwordStrength'
import logo from '../assets/logo.png'
import '../styles/CreatePassword.css'

export default function CreatePassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  const strength = getPasswordStrength(password)

  const MIN_PASSWORD_LENGTH = 8

  const friendlyUpdateError = (err) => {
    const raw = err?.message || ''
    const lower = raw.toLowerCase()
    if (!raw) return 'Could not set password. Try again.'
    if (lower.includes('breach') || lower.includes('pwned') || lower.includes('compromised') || lower.includes('common') || lower.includes('weak_password') || lower.includes('weak password') || lower.includes('too weak')) {
      return 'That password is too common or has appeared in a data breach. Choose a longer, unique password with letters, numbers, and a symbol.'
    }
    if (lower.includes('short') || lower.includes('at least') || lower.includes('characters') || lower.includes('length')) {
      return `Password does not meet requirements: ${raw}`
    }
    if (lower.includes('same as') || lower.includes('should be different')) {
      return 'New password must be different from the old one.'
    }
    return raw
  }

  const redirectByRole = (role) => {
    if (role === 'system_admin') {
      navigate('/admin/dashboard', { replace: true })
    } else if (role === 'document_manager') {
      navigate('/manager/dashboard', { replace: true })
    } else if (role === 'teacher') {
      navigate('/teacher', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  // This screen shows for brand-new users (Google AND email) whose
  // profiles.password_set is still false. Returning users never reach here
  // because AuthCallback routes them to the dashboard. No provider-based
  // bounce: a first-time Google user MUST be allowed to see this form.
  useEffect(() => {
    let cancelled = false
    async function guard() {
      try {
        await supabase.auth.getSession()
      } catch {
        // On lookup failure, fall through and let the form render —
        // submit-time checks will surface a proper error.
      }
      if (!cancelled) setCheckingSession(false)
    }
    guard()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      // Ensure we call updateUser with a live session, not a stale cached token.
      // A stale token is the other classic cause of 422 on PUT /auth/v1/user.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        setError('Session expired. Please sign in again.')
        navigate('/login', { replace: true })
        return
      }

      const { data: { user }, error: getUserError } = await supabase.auth.getUser()
      if (getUserError || !user) {
        setError('Session expired. Please sign in again.')
        navigate('/login', { replace: true })
        return
      }

      const { error: updateAuthError } = await supabase.auth.updateUser({ password })
      if (updateAuthError) {
        console.error('Create password updateUser error:', updateAuthError)
        setError(friendlyUpdateError(updateAuthError))
        return
      }

      // Password is already set in auth at this point. The profiles flag is
      // best-effort: if RLS blocks the self-UPDATE (no self-UPDATE policy by
      // design), don't trap the user — still redirect by role.
      // `.maybeSingle()` is used instead of `.single()` because PostgREST
      // returns 406 when `single()` matches 0 rows (e.g. RLS filtered the
      // update to zero rows).
      let role = null
      try {
        // Preferred path: SECURITY DEFINER RPC (bypasses RLS safely).
        // Run the SQL in supabase/migrations/*_mark_password_set.sql first.
        // If the function doesn't exist yet (42883), fall through to the
        // direct update attempt below.
        const { error: rpcError } = await supabase.rpc('mark_password_set')
        if (rpcError) {
          if (rpcError.code === '42883' || /function.*does not exist/i.test(rpcError.message ?? '')) {
            console.warn('mark_password_set() RPC missing — using direct update fallback.')
            const { data: updatedProfile, error: profileUpdateError } = await supabase
              .from('profiles')
              .update({ password_set: true })
              .eq('id', user.id)
              .select('role')
              .maybeSingle()

            if (profileUpdateError) {
              console.warn('password_set update blocked (non-fatal):', profileUpdateError)
            } else if (updatedProfile?.role) {
              role = updatedProfile.role
            }
          } else {
            console.warn('mark_password_set RPC blocked (non-fatal):', rpcError)
          }
        }
      } catch (warnErr) {
        console.warn('password_set update threw (non-fatal):', warnErr)
      }

      // Fallback: read the role separately (covered by SELECT own-profile policy).
      if (!role) {
        const { data: fetchedProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.warn('role fetch after password set failed:', fetchError)
        } else if (fetchedProfile?.role) {
          role = fetchedProfile.role
        }
      }

      if (!role) {
        // Auth password succeeded, so send them to login — next sign-in will
        // land on the right dashboard via AuthCallback/Login role lookup.
        // This avoids the dead-end "setup didn't finish" loop when RLS
        // blocks the password_set flag write.
        setError('')
        navigate('/login', {
          replace: true,
          state: { message: 'Password saved. Please sign in with your new password.' },
        })
        return
      }

      redirectByRole(role)
    } catch (err) {
      console.error('Create password error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-page">
      <div className="cp-card">
        <img src={logo} alt="H2KNOW" className="cp-logo" />
        <h1 className="cp-title">Create a Password</h1>
        <p className="cp-tagline">
          You signed in with Google. Set a password so you can log in directly next time.
        </p>

        {checkingSession ? (
          <p className="cp-tagline">Checking your session…</p>
        ) : (
        <>
        {error && <div className="cp-error">{error}</div>}

        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          <label className="cp-label" htmlFor="password">Password</label>
          <div className="cp-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="cp-input"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {password && (
            <div className="cp-strength">
              <div className="cp-strength-bar">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="cp-strength-seg"
                    style={{
                      backgroundColor: i < strength.score ? strength.color : '#e2e9f0',
                    }}
                  />
                ))}
              </div>
              <span className="cp-strength-label" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}

          <label className="cp-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            className="cp-input"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {confirmPassword && password !== confirmPassword && (
            <span className="cp-mismatch">Passwords don't match yet</span>
          )}

          <button type="submit" className="cp-submit-btn" disabled={loading}>
            {loading ? 'Saving…' : 'CONTINUE'}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  )
}
