import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  BOSS: 'Approver / Manager',
  EMPLOYEE: 'Employee',
  VENDOR: 'Vendor',
  CUSTOMER: 'Customer',
}

function Detail({ label, value }) {
  return (
    <div className="profile-detail">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '' })
  const canEdit = Boolean(user?.is_superuser)

  useEffect(() => {
    api.get('/auth/profile/')
      .then(({ data }) => {
        setProfile(data)
        setForm({ full_name: data.full_name || '', email: data.email || '' })
      })
      .catch(() => toast.error('Unable to load profile details'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/profile/', form)
      setProfile(data)
      setForm({ full_name: data.full_name || '', email: data.email || '' })
      updateUser({ ...user, full_name: data.full_name, email: data.email })
      setEditing(false)
      toast.success('Profile updated', 'Your details have been saved.')
    } catch (error) {
      const message = error.response?.data?.email?.[0] || error.response?.data?.detail
      toast.error('Update failed', message || 'Please review the profile details.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="profile-loading">Loading your profile…</div>
  if (!profile) return null

  const initials = (profile.full_name || profile.email || 'U')
    .split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const bosses = profile.boss_details?.map((boss) => boss.full_name || boss.email).join(', ')
  const teamMembers = profile.employee_details?.map((employee) => employee.full_name || employee.email).join(', ')

  return (
    <main className="profile-page">
      <div className="profile-backdrop" aria-hidden="true" />
      <header className="profile-nav">
        <Link to="/dashboard" className="profile-brand"><img src="/radico-logo.png" alt="Radico Khaitan" /> <span>Business Partner Onboarding</span></Link>
        <div className="profile-nav-actions">
          <Link to="/dashboard" className="profile-nav-link">Dashboard</Link>
          <button className="profile-signout" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="profile-shell">
        <div className="profile-orb profile-orb-one" />
        <div className="profile-orb profile-orb-two" />
        <div className="profile-intro">
          <p className="profile-eyebrow">Your profile</p>
          <h1>Account details</h1>
          <p>Your access, role and workspace details — all in one place.</p>
        </div>

        <section className="profile-card">
          <div className="profile-card-top">
            <div className="profile-avatar"><span>{initials}</span></div>
            <div>
              <p className="profile-kicker">{ROLE_LABELS[profile.role] || profile.role}</p>
              <h2>{profile.full_name || 'Profile details'}</h2>
              <p>{profile.email}</p>
            </div>
            <span className={`profile-status ${profile.is_active ? 'active' : 'inactive'}`}><i />{profile.is_active ? 'Active' : 'Inactive'}</span>
          </div>

          <div className="profile-rule" />
          {editing ? (
            <form className="profile-edit-form" onSubmit={save}>
              <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
              <label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <div className="profile-form-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="profile-save" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
            </form>
          ) : (
            <div className="profile-details-grid">
              <Detail label="Email address" value={profile.email} />
              <Detail label="System role" value={ROLE_LABELS[profile.role] || profile.role} />
              <Detail label="Access level" value={profile.is_superuser ? 'Superuser' : 'Standard access'} />
              <Detail label="Account created" value={new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <Detail label="Reporting to" value={bosses} />
              <Detail label="Team members" value={teamMembers || 'No team members assigned'} />
            </div>
          )}
          {canEdit && !editing && <button className="profile-edit-button" onClick={() => setEditing(true)}>Edit profile <span>↗</span></button>}
          {!canEdit && <p className="profile-locked">Profile information is read-only. Only a superuser can make changes.</p>}
        </section>
      </section>
    </main>
  )
}
