import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import '../styles/ForgotPassword.css'

export default function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )

      if (resetError) {
        setError('Could not send reset email. Try again.')
        return
      }

      setSent(true)
    } catch (err) {
      console.error('Forgot password error:', err)
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

        {error && <div className="forgot-error">{error}</div>}

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
          <div className="forgot-success">✓</div>
        )}

        <Link to="/login" className="forgot-back-link">
          Back to Login
        </Link>
      </div>
    </div>
  )
}