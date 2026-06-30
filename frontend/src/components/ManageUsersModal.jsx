import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function ManageUsersModal({ onClose }) {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data } = await api.get('/auth/users/')
      setUsers(data)
    } catch {
      toast.error('Failed to load users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/auth/users/', form)
      toast.success('User created', `${form.email} can now log in.`)
      setForm({ email: '', full_name: '', password: '' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.email?.[0] || data?.password?.[0] || data?.detail || 'Failed to create user.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: 520, margin: 'auto', boxShadow: 'var(--shadow-lg)', position: 'relative', top: '10vh', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>👥 Manage Admin Users</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.25rem' }}>
          Admin users can log in and manage all onboarding records. Only superusers can create accounts.
        </p>

        {/* Create User Form */}
        {showForm ? (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: '1rem' }}>New Admin User</div>
            <div className="field" style={{ marginBottom: '0.75rem' }}>
              <label>Email Address <span className="req">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@radico.co.in"
                required
                autoFocus
              />
            </div>
            <div className="field" style={{ marginBottom: '0.75rem' }}>
              <label>Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Aryan Sharma"
              />
            </div>
            <div className="field" style={{ marginBottom: '1rem' }}>
              <label>Password <span className="req">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>
            {error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: '0.75rem', fontSize: 13, color: 'var(--danger)' }}>
                ❌ {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><div className="spinner" /> Creating…</> : '✓ Create User'}
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginBottom: '1.25rem' }} onClick={() => setShowForm(true)}>
            ＋ Create New User
          </button>
        )}

        {/* User List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 13 }}>No admin users found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name / Email</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.full_name || '—'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: u.is_superuser ? 'var(--mna-bg)' : 'var(--brand-light)', color: u.is_superuser ? 'var(--mna)' : 'var(--brand)' }}>
                        {u.is_superuser ? 'Superuser' : 'Admin'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
