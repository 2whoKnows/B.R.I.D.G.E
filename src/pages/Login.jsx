import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Logo from '../components/ui/Logo'
import '../styles/Login.css'

const REMEMBERED_EMAIL_KEY = 'bridge_remembered_email'

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

  const redirectByRole = (role) => {
    if (role === 'system_admin') {
      navigate('/admin/dashboard')
    } else if (role === 'document_manager') {
      navigate('/manager/dashboard')
    } else if (role === 'teacher') {
      navigate('/teacher')
    } else {
      navigate('/teacher')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError('Invalid credentials. Please check your email and password.')
        return
      }

      const userId = data.user.id
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        // No profile row yet — this happens when a teacher signs up directly
        // (no invite flow) and the DB trigger either doesn't exist or hasn't
        // fired yet. Create the row here so they can proceed immediately.
        // Managers always have a profile set up by us developers directly in
        // Supabase, so we'll never reach this branch for a manager account.
        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email.split('@')[0]

        // ignoreDuplicates:true means ON CONFLICT DO NOTHING — a chained
        // .select().single() would return null for an existing row, so we
        // do the insert and the fetch as two separate calls.
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: data.user.email,
              full_name: fullName,
              role: 'teacher',
              is_active: true,
            },
            // ignoreDuplicates:true → INSERT ... ON CONFLICT DO NOTHING
            // If a row already exists for this id (e.g. the document manager
            // whose role was assigned manually in the DB), this is a no-op
            // and their role is never overwritten.
            { onConflict: 'id', ignoreDuplicates: true }
          )

        if (upsertError) {
          console.error('Profile creation failed on login:', upsertError)
          setError('Unable to load account profile. Contact system administration.')
          await supabase.auth.signOut()
          return
        }

        // Re-fetch the profile regardless of whether the insert was a new
        // row or a no-op — this always returns the correct, current data.
        const { data: fetchedProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', userId)
          .single()

        if (fetchError || !fetchedProfile) {
          console.error('Profile fetch failed after upsert:', fetchError)
          setError('Unable to load account profile. Contact system administration.')
          await supabase.auth.signOut()
          return
        }

        profile = fetchedProfile
      }

      if (profile.is_active === false) {
        setError('Your account is currently inactive. Contact system administration.')
        await supabase.auth.signOut()
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      }

      redirectByRole(profile.role)
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected login error occurred. Please try again.')
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
      setError('Google authentication failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  // The dedicated /forgot-password page owns the whole reset-link flow
  // (email input, send, resend). Carry over whatever the user already typed.
  const handleForgotPassword = (e) => {
    e.preventDefault()
    setError('')
    navigate('/forgot-password', { state: { email: email.trim() } })
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-header">
          <Logo size={48} variant="dark" showText={false} />
          <h1 className="login-brand-title">B.R.I.D.G.E.</h1>
          <p className="login-tagline">Academic Document Management Platform</p>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="login-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="e.g. faculty@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
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
          </div>

          <div className="login-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="login-forgot-link"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Authenticating…' : 'SIGN IN'}
          </button>
        </form>

        <div className="login-divider">
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <GoogleIcon />
          {googleLoading ? 'Connecting…' : 'Institutional Google Sign-In'}
        </button>

        <div className="login-footer">
          <p>Authorized Academic Personnel Access Only</p>
        </div>
      </div>
    </div>
  )
}
