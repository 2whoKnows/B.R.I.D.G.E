import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getPasswordStrength } from '../lib/passwordStrength'
import logo from '../assets/logo.png'
import '../styles/ResetPassword.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [linkError, setLinkError] = useState('')
  const exchangedRef = useRef(false)

  const strength = getPasswordStrength(password)

  useEffect(() => {
    let cancelled = false

    // The recovery email link is PKCE (`?code=...`), not the old `#access_token`
    // hash. Exchanging the code is what establishes the recovery session and
    // is what fires PASSWORD_RECOVERY; without it this page sits on
    // "Verifying your reset link…" forever. exchangeCodeForSession consumes the
    // code, so the ref guard keeps React 18/19 StrictMode double-effects (and
    // any remount) from spending it twice.
    async function establishRecoverySession() {
      const params = new URLSearchParams(window.location.search)
      const hasCode = params.has('code')

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) {
        setReady(true)
        return
      }

      // Already in flight (StrictMode remount) — don't consume the code twice.
      if (exchangedRef.current) return

      if (!hasCode) return

      exchangedRef.current = true
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (cancelled) return

      // History replace so a refresh doesn't replay the one-time code, and so
      // the code never leaks via copy-paste of the URL.
      window.history.replaceState(null, '', '/reset-password')

      if (exchangeError) {
        setLinkError('This reset link is invalid or has expired. Request a new one from the login screen.')
        return
      }

      setReady(true)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
      if (event === 'SIGNED_OUT') {
        setReady(false)
      }
    })

    establishRecoverySession()

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
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
      // Re-check right before the write: AuthSessionMissingError ("Auth session
      // missing!") is the classic symptom of submitting with an expired or
      // never-established recovery session. Fail fast with a clear message.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Your reset session has expired. Request a new reset link and try again.')
        return
      }

      const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        if (updateError.name === 'AuthSessionMissingError' || /session/i.test(updateError.message || '')) {
          setError('Your reset session has expired. Request a new reset link and try again.')
        } else {
          setError('Could not update password. Try again.')
        }
        return
      }

      // Mark the profile as having a password set — matters for users who
      // originally signed up via Google and are resetting/creating one here.
      if (user) {
        await supabase.from('profiles').update({ password_set: true }).eq('id', user.id)
      }

      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <img src={logo} alt="H2KNOW" className="reset-logo" />
        <h1 className="reset-title">Set New Password</h1>

        {!ready && !done && !linkError && (
          <p className="reset-tagline">Verifying your reset link…</p>
        )}

        {linkError && !done && <div className="reset-error" role="alert">{linkError}</div>}

        {error && <div className="reset-error">{error}</div>}

        {done ? (
          <p className="reset-tagline">Password updated. Redirecting to login…</p>
        ) : ready ? (
          <form className="reset-form" onSubmit={handleSubmit} noValidate>
            <label className="reset-label" htmlFor="password">New Password</label>
            <div className="reset-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="reset-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="reset-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {password && (
              <div className="reset-strength">
                <div className="reset-strength-bar">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="reset-strength-seg"
                      style={{
                        backgroundColor: i < strength.score ? strength.color : '#e2e9f0',
                      }}
                    />
                  ))}
                </div>
                <span className="reset-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}

            <label className="reset-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className="reset-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <span className="reset-mismatch">Passwords don't match yet</span>
            )}

            <button type="submit" className="reset-submit-btn" disabled={loading}>
              {loading ? 'Updating…' : 'UPDATE PASSWORD'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}