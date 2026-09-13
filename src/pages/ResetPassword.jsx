import { useState, useEffect } from 'react'
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

  const strength = getPasswordStrength(password)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
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
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('Could not update password. Try again.')
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

        {!ready && !done && (
          <p className="reset-tagline">Verifying your reset link…</p>
        )}

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