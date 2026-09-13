// Lightweight password strength scorer — no dependency needed.
// Returns { score: 0-4, label, color }
export function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: '', color: '#e2e9f0' }
  }

  let score = 0

  // Length
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length

  if (varietyCount >= 2) score++
  if (varietyCount >= 3) score++

  // Common weak patterns knock it down
  const lower = password.toLowerCase()
  const weakPatterns = ['password', '123456', 'qwerty', 'letmein', '111111', 'abc123']
  if (weakPatterns.some((p) => lower.includes(p))) {
    score = Math.min(score, 1)
  }
  if (password.length < 6) {
    score = 0
  }

  score = Math.max(0, Math.min(score, 4))

  const levels = [
    { label: 'Very weak', color: '#c62828' },
    { label: 'Weak', color: '#e07a1f' },
    { label: 'Fair', color: '#e0b91f' },
    { label: 'Good', color: '#4caf50' },
    { label: 'Strong', color: '#0a8f4c' },
  ]

  return { score, ...levels[score] }
}