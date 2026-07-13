import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    navigate(location.state?.from || '/dashboard', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!', 'Logged in successfully.')
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-atmosphere" aria-hidden="true">
        <span className="login-atmosphere-orb" />
        <span className="login-atmosphere-ring login-atmosphere-ring-one" />
        <span className="login-atmosphere-ring login-atmosphere-ring-two" />
        <span className="login-atmosphere-spark login-atmosphere-spark-one" />
        <span className="login-atmosphere-spark login-atmosphere-spark-two" />
        <span className="login-atmosphere-planet login-atmosphere-planet-one" />
        <span className="login-atmosphere-planet login-atmosphere-planet-two" />
        <span className="login-atmosphere-planet login-atmosphere-planet-three" />
        <span className="login-atmosphere-planet login-atmosphere-planet-four" />
      </div>
      {/* Left dark branding panel */}
      <div className="login-brand">
        <img src="/radico-logo.png" alt="Radico Khaitan" className="login-brand-logo" />
        <div className="login-brand-divider" />
        <div className="login-brand-tag">
          <span>Business Partner</span>
          <strong>Onboarding Portal</strong>
        </div>
        <p className="login-brand-desc">
          Digitizing the onboarding journey for vendors and customers across India.
        </p>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-head">
            <p className="login-form-overline">Secure workspace access</p>
            <h1>Sign In</h1>
            <p>Manage your business onboarding with confidence.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="field login-field">
                <label>Email Address <span className="req">*</span></label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@radico.co.in"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="field login-field">
                <label>Password <span className="req">*</span></label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{ paddingRight: 54 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="login-password-toggle"
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
