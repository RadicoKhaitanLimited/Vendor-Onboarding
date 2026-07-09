import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function ManageUsersModal({ onClose }) {
  const toast = useToast()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'EMPLOYEE', bosses: [] })
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

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'role' && value !== 'EMPLOYEE' ? { bosses: [] } : {}),
    }))
  }

  const updateBosses = (event) => {
    setForm((current) => ({
      ...current,
      bosses: Array.from(event.target.selectedOptions, (option) => option.value),
    }))
  }

  const resetForm = () => {
    setForm({ email: '', full_name: '', password: '', role: 'EMPLOYEE', bosses: [] })
    setError('')
    setShowForm(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/auth/users/', form)
      toast.success('User created', `${form.email} can now log in.`)
      resetForm()
      fetchUsers()
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.role?.[0] ||
        data?.bosses?.[0] ||
        data?.detail ||
        'Failed to create user.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const bosses = users.filter((user) => user.role === 'BOSS')
  const canManageUsers = user?.is_superuser || user?.role === 'ADMIN'

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: 720, margin: 'auto', boxShadow: 'var(--shadow-lg)', position: 'relative', top: '8vh', maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{user?.role === 'BOSS' ? 'My Employees' : 'Manage Users'}</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.25rem' }}>
          {user?.role === 'BOSS'
            ? 'Employees assigned under your approval hierarchy.'
            : 'Create Boss and Employee users. Employees can be assigned under one or more Bosses.'}
        </p>

        {canManageUsers && showForm ? (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: '1rem' }}>New User</div>
            <div className="grid-2">
              <div className="field">
                <label>Email Address <span className="req">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  placeholder="employee@radico.co.in"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => updateForm('full_name', event.target.value)}
                  placeholder="e.g. Aryan Sharma"
                />
              </div>
              <div className="field">
                <label>Role <span className="req">*</span></label>
                <select value={form.role} onChange={(event) => updateForm('role', event.target.value)} required>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="BOSS">Boss / Manager</option>
                  {user?.is_superuser && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              {form.role === 'EMPLOYEE' && (
                <div className="field">
                  <label>Assign Bosses <span className="req">*</span></label>
                  <select value={form.bosses} onChange={updateBosses} multiple required size={Math.min(Math.max(bosses.length, 3), 6)}>
                    {bosses.map((boss) => (
                      <option key={boss.id} value={boss.id}>{boss.full_name || boss.email}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--muted)', fontSize: 12 }}>Hold Ctrl to select multiple bosses.</small>
                </div>
              )}
              <div className="field">
                <label>Password <span className="req">*</span></label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateForm('password', event.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginTop: '0.75rem', fontSize: 13, color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><div className="spinner" /> Creating...</> : 'Create User'}
              </button>
            </div>
          </form>
        ) : canManageUsers ? (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginBottom: '1.25rem' }} onClick={() => setShowForm(true)}>
            Create New User
          </button>
        ) : null}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 13 }}>No users found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 0 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name / Email</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Boss / Team</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{user.full_name || '-'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-optional">
                        {user.is_superuser ? 'SUPERUSER' : user.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>
                      {(user.boss_emails || []).join(', ') || (user.role === 'BOSS' ? `${user.employee_count || 0} employees` : '-')}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
