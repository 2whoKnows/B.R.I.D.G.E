import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/Logactivity'
import logo from '../assets/logo.png'
import '../styles/Login.css'

const REMEMBERED_EMAIL_KEY = 'h2know_remembered_email'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)))
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  const redirectByRole = (role) => {
    if (role === 'admin') {
      navigate('/admin/dashboard')
    } else if (role === 'manager') {
      navigate('/manager/dashboard')
    } else {
      navigate('/')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError('Incorrect email or password.')
        return
      }

      const userId = data.user.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        setError('Unable to load your account. Try again.')
        await supabase.auth.signOut()
        return
      }

      if (profile.status === 'pending') {
        setError('Your account is awaiting approval.')
        await supabase.auth.signOut()
        return
      }

      if (profile.status === 'rejected') {
        setError('Your account access was denied. Contact an administrator.')
        await supabase.auth.signOut()
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      }

      await logActivity('login', { method: 'email' })
      redirectByRole(profile.role)
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError('Google sign-in failed. Try again.')
      setGoogleLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Enter your email above first, then click "Forgot Password?"')
      return
    }

    setResetLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )

      if (resetError) {
        setError('Could not send reset email. Try again.')
        return
      }

      setShowResetModal(true)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Something went wrong. Try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="H2KNOW" className="login-logo" />
        <h1 className="login-title">
          B.R.I.D.G.E
        </h1>
        <p className="login-tagline">Know the Flow, Before You Go</p>
        <span className="login-badge">Authorized Personnel Only</span>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="login-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="login-label" htmlFor="password">Password</label>
          <div className="login-password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="login-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              className="login-forgot-link"
              onClick={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending…' : 'Forgot Password?'}
            </button>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Logging in…' : 'LOGIN'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Sign in with Google'}
        </button>
      </div>

      {showResetModal && (
        <div className="login-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-icon">✓</div>
            <h2 className="login-modal-title">Reset Link Sent</h2>
            <p className="login-modal-text">
              A password reset link has been sent to <strong>{email.trim()}</strong>. Check your inbox.
            </p>
            <button
              type="button"
              className="login-modal-btn"
              onClick={() => setShowResetModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}