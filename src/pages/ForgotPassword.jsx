import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import '../styles/ForgotPassword.css'

export default function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Supabase blocks repeat reset emails for the same address for 60 seconds.
  // Mirror that window locally so the user gets a countdown instead of a
  // confusing server error when they hammer "send again".
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const sendResetLink = async (targetEmail) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetEmail,
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    if (resetError) {
      if (resetError.status === 429 || /rate limit|too many|seconds/i.test(resetError.message || '')) {
        setError('A reset link was just sent. Please wait a minute before requesting another one.')
      } else {
        setError(resetError.message || 'Could not send reset email. Try again.')
      }
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setLoading(true)
    try {
      const ok = await sendResetLink(email.trim())
      if (!ok) return

      setSent(true)
      setCooldown(60)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (loading || cooldown > 0 || !email.trim()) return
    setError('')
    setLoading(true)
    try {
      const ok = await sendResetLink(email.trim())
      if (!ok) return
      setCooldown(60)
    } catch (err) {
      console.error('Forgot password resend error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <img src={logo} alt="H2KNOW" className="forgot-logo" />
        <h1 className="forgot-title">Reset Password</h1>
        <p className="forgot-tagline">
          {sent
            ? "Check your inbox for a reset link."
            : "We'll send a reset link to your email."}
        </p>

        {error && <div className="forgot-error" role="alert">{error}</div>}

        {!sent ? (
          <form className="forgot-form" onSubmit={handleSubmit} noValidate>
            <label className="forgot-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="forgot-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <button type="submit" className="forgot-submit-btn" disabled={loading}>
              {loading ? 'Sending…' : 'SEND RESET LINK'}
            </button>
          </form>
        ) : (
          <>
            <div className="forgot-success" aria-hidden="true">✓</div>
            <p className="forgot-tagline">
              Reset link sent to <strong>{email.trim()}</strong>. It expires in about an hour —
              check spam if you don&apos;t see it.
            </p>
            <button
              type="button"
              className="forgot-submit-btn"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
            >
              {loading
                ? 'Sending…'
                : cooldown > 0
                  ? `SEND AGAIN IN ${cooldown}s`
                  : 'SEND AGAIN'}
            </button>
          </>
        )}

        <Link to="/login" className="forgot-back-link">
          Back to Login
        </Link>
      </div>
    </div>
  )
}