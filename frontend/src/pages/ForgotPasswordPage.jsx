import { useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await publicApi.post('/auth/forgot-password/', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
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

      <div className="login-form-panel">
        <div className="login-form-inner">
          {sent ? (
            <>
              <div className="login-form-head">
                <p className="login-form-overline">Secure workspace access</p>
                <h1>Check Your Email</h1>
                <p>
                  If an account exists for <strong>{email}</strong>, we've sent a link to reset
                  your password. The link expires in 60 minutes.
                </p>
              </div>
              <Link to="/login" className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <div className="login-form-head">
                <p className="login-form-overline">Secure workspace access</p>
                <h1>Forgot Password</h1>
                <p>Enter your email and we'll send you a link to reset your password.</p>
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
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5v.01" /></svg>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-gold" disabled={loading}>
                  {loading
                    ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Sending...</>
                    : 'Send Reset Link'
                  }
                </button>

                <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
                  <Link to="/login" style={{ color: 'var(--gold-dark, #b8933a)' }}>Back to Sign In</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
