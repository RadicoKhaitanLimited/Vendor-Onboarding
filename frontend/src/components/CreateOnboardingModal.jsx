import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function CreateOnboardingModal({ onClose, onCreated }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [type, setType] = useState('VENDOR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/onboarding/create/', { email, onboarding_type: type })
      onCreated()
    } catch (err) {
      const data = err.response?.data
      setError(data?.email?.[0] || data?.detail || 'Failed to create onboarding.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Onboarding</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.5rem' }}>
          Enter the recipient's email and select the onboarding type. An invite link will be sent automatically.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>Email Address <span className="req">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@company.com"
              required
              autoFocus
            />
          </div>

          <div className="field" style={{ marginBottom: '1.5rem' }}>
            <label>Onboarding Type <span className="req">*</span></label>
            <div className="toggle-group" style={{ marginTop: 6 }}>
              <div className="toggle-opt">
                <input type="radio" id="type-vendor" name="ob-type" value="VENDOR" checked={type === 'VENDOR'} onChange={() => setType('VENDOR')} />
                <label htmlFor="type-vendor">Vendor Onboarding</label>
              </div>
              <div className="toggle-opt">
                <input type="radio" id="type-customer" name="ob-type" value="CUSTOMER" checked={type === 'CUSTOMER'} onChange={() => setType('CUSTOMER')} />
                <label htmlFor="type-customer">Customer Onboarding</label>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: 'var(--danger)' }}>
              ❌ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" /> Sending...</> : 'Create & Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
