import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!', 'Logged in successfully.')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left dark branding panel */}
      <div className="login-brand">
        <img src="/radico-logo.png" alt="Radico Khaitan" className="login-brand-logo" />
        <div className="login-brand-divider" />
        <div className="login-brand-tag">Business Partner Onboarding Portal</div>
        <p className="login-brand-desc">
          Digitizing the onboarding journey for vendors and customers across India.
        </p>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-head">
            <h1>Admin Sign In</h1>
            <p>Sign in to manage vendor &amp; customer onboarding</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="field login-field">
                <label>Email Address <span className="req">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@radico.co.in"
                  required
                  autoFocus
                />
              </div>

              <div className="field login-field">
                <label>Password <span className="req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9CA3AF', fontSize: 15, padding: 4, lineHeight: 1,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem',
                fontSize: 13, color: '#B91C1C',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-gold" disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
