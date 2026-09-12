import { useState } from 'react'
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

  const strength = getPasswordStrength(password)

  const redirectByRole = (role) => {
    if (role === 'system_admin') {
      navigate('/admin/dashboard', { replace: true })
    } else if (role === 'document_manager' || role === 'teacher') {
      navigate('/manager/dashboard', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

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
      const { data: { user }, error: getUserError } = await supabase.auth.getUser()
      if (getUserError || !user) {
        setError('Session expired. Please sign in again.')
        navigate('/login', { replace: true })
        return
      }

      const { error: updateAuthError } = await supabase.auth.updateUser({ password })
      if (updateAuthError) {
        setError('Could not set password. Try again.')
        return
      }

      const { data: profile, error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ password_set: true })
        .eq('id', user.id)
        .select('role')
        .single()

      if (profileUpdateError || !profile) {
        setError('Password set, but setup didn\u2019t finish. Try logging in again.')
        return
      }

      redirectByRole(profile.role)
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
      </div>
    </div>
  )
}