import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicApi } from '../api/axios'

function extractErrorMessage(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const messages = Object.values(data).flat().filter((v) => typeof v === 'string')
  return messages.length ? messages.join(' ') : fallback
}

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('checking') // checking | valid | invalid | done
  const [invalidReason, setInvalidReason] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    publicApi.get(`/auth/reset-password/${token}/`)
      .then(() => { if (!cancelled) setStatus('valid') })
      .catch((err) => {
        if (cancelled) return
        setInvalidReason(extractErrorMessage(err, 'This link is invalid.'))
        setStatus('invalid')
      })
    return () => { cancelled = true }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await publicApi.post(`/auth/reset-password/${token}/confirm/`, {
        password,
        password_confirm: passwordConfirm,
      })
      setStatus('done')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not reset your password. Please try again.'))
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
          {status === 'checking' && (
            <div className="login-form-head">
              <p className="login-form-overline">Secure workspace access</p>
              <h1>Checking Link...</h1>
              <div className="spinner" style={{ marginTop: 20 }} />
            </div>
          )}

          {status === 'invalid' && (
            <>
              <div className="login-form-head">
                <p className="login-form-overline">Secure workspace access</p>
                <h1>Link Expired</h1>
                <p>{invalidReason} Request a new password reset link to continue.</p>
              </div>
              <Link to="/forgot-password" className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Request New Link
              </Link>
            </>
          )}

          {status === 'done' && (
            <>
              <div className="login-form-head">
                <p className="login-form-overline">Secure workspace access</p>
                <h1>Password Reset</h1>
                <p>Your password has been updated. You can now sign in with your new password.</p>
              </div>
              <Link to="/login" className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </>
          )}

          {status === 'valid' && (
            <>
              <div className="login-form-head">
                <p className="login-form-overline">Secure workspace access</p>
                <h1>Set New Password</h1>
                <p>Choose a new password for your account.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="login-input-group">
                  <div className="field login-field">
                    <label>New Password <span className="req">*</span></label>
                    <div className="login-input-wrap">
                      <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your new password"
                        required
                        autoFocus
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

                  <div className="field login-field">
                    <label>Confirm Password <span className="req">*</span></label>
                    <div className="login-input-wrap">
                      <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="Confirm your new password"
                        required
                        style={{ paddingRight: 54 }}
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
                    ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Resetting...</>
                    : 'Reset Password'
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
