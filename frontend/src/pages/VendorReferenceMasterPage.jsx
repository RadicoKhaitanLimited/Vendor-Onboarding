import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'

const EMPTY_FORM = {
  vendor_reference_range: '',
  group_code: '',
  nr_group: '',
  reference_name: '',
  gl_account_number: '',
  gl_account_description: '',
}

export default function VendorReferenceMasterPage() {
  const { user, logout } = useAuth()
  const toast = useToast()

  const [records, setRecords] = useState([])
  const [ranges, setRanges] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [lookupCode, setLookupCode] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const [recordsRes, rangesRes] = await Promise.all([
        api.get('/onboarding/vendor-reference-master/', { params }),
        api.get('/onboarding/vendor-reference-master/ranges/'),
      ])
      setRecords(recordsRes.data)
      setRanges(rangesRes.data)
    } catch {
      toast.error('Failed to load vendor reference masters')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const usedRanges = useMemo(() => {
    return new Set(records.filter((record) => record.id !== editingId).map((record) => record.vendor_reference_range))
  }, [records, editingId])

  const availableRanges = ranges.filter((range) => !usedRanges.has(range.value) || range.value === form.vendor_reference_range)

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/onboarding/vendor-reference-master/${editingId}/`, form)
        toast.success('Vendor reference updated')
      } else {
        await api.post('/onboarding/vendor-reference-master/', form)
        toast.success('Vendor reference created')
      }
      resetForm()
      fetchData()
    } catch (error) {
      const detail = error.response?.data?.vendor_reference_range?.[0] || error.response?.data?.detail
      toast.error('Save failed', detail || 'Please check the entered values.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (record) => {
    setEditingId(record.id)
    setForm({
      vendor_reference_range: record.vendor_reference_range,
      group_code: record.group_code || '',
      nr_group: record.nr_group || '',
      reference_name: record.reference_name,
      gl_account_number: record.gl_account_number,
      gl_account_description: record.gl_account_description,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (record) => {
    const ok = window.confirm(`Delete mapping for ${record.vendor_reference_range_display}?`)
    if (!ok) return

    try {
      await api.delete(`/onboarding/vendor-reference-master/${record.id}/`)
      toast.success('Vendor reference deleted')
      if (editingId === record.id) resetForm()
      fetchData()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleLookup = async (event) => {
    event.preventDefault()
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const { data } = await api.post('/onboarding/vendor-reference-master/process/', {
        vendor_reference_code: lookupCode,
      })
      setLookupResult(data)
    } catch (error) {
      toast.error('No mapping found', error.response?.data?.detail || 'The code does not match a configured mapping.')
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <>
      <header>
        <div className="logo">
          <img src="/radico-logo.png" alt="Radico Khaitan" className="logo-img" />
        </div>
        <nav className="header-nav">
          <Link className="nav-btn" to="/dashboard">Dashboard</Link>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', padding: '6px 10px' }}>
            {user?.full_name || user?.email}
          </span>
          <button className="nav-btn danger" onClick={logout}>Sign Out</button>
        </nav>
      </header>

      <div className="page vendor-reference-page">
        <div className="page-header master-header">
          <div>
            <h1>Vendor Reference Master</h1>
            <p>Maintain predefined vendor reference range mappings and GL account details.</p>
          </div>
        </div>

        <div className="master-grid">
          <form className="card master-form" onSubmit={handleSubmit}>
            <div className="card-title">
              <span className="card-title-icon">#</span>
              {editingId ? 'Edit Mapping' : 'Create Mapping'}
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Vendor Reference Range <span className="req">*</span></label>
                <select
                  value={form.vendor_reference_range}
                  onChange={(event) => updateForm('vendor_reference_range', event.target.value)}
                  required
                >
                  <option value="">Select range</option>
                  {availableRanges.map((range) => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>New Grouping</label>
                <input
                  type="text"
                  value={form.group_code}
                  onChange={(event) => updateForm('group_code', event.target.value)}
                  placeholder="VRMS"
                />
              </div>
              <div className="field">
                <label>NR</label>
                <input
                  type="text"
                  value={form.nr_group}
                  onChange={(event) => updateForm('nr_group', event.target.value)}
                  placeholder="01"
                  style={{ fontFamily: 'var(--mono)' }}
                />
              </div>
              <div className="field">
                <label>Reference Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.reference_name}
                  onChange={(event) => updateForm('reference_name', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>GL Account Number <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.gl_account_number}
                  onChange={(event) => updateForm('gl_account_number', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>GL Account Description <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.gl_account_description}
                  onChange={(event) => updateForm('gl_account_description', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="btn-row compact">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Clear</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Mapping' : 'Create Mapping'}
              </button>
            </div>
          </form>

          <form className="card lookup-card" onSubmit={handleLookup}>
            <div className="card-title">
              <span className="card-title-icon">?</span>
              Process Reference Code
            </div>
            <div className="field">
              <label>Vendor Reference Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value.replace(/\D/g, ''))}
                placeholder="100001"
                required
              />
            </div>
            <button type="submit" className="btn btn-outline lookup-btn" disabled={lookupLoading}>
              {lookupLoading ? 'Checking...' : 'Fetch Mapping'}
            </button>

            {lookupResult && (
              <div className="lookup-result">
                <div>
                  <span>Range</span>
                  <strong>{lookupResult.vendor_reference_range_display}</strong>
                </div>
                <div>
                  <span>Reference</span>
                  <strong>{lookupResult.reference_name}</strong>
                </div>
                <div>
                  <span>New Grouping</span>
                  <strong>{lookupResult.group_code || '-'}</strong>
                </div>
                <div>
                  <span>NR</span>
                  <strong>{lookupResult.nr_group || '-'}</strong>
                </div>
                <div>
                  <span>GL Account</span>
                  <strong>{lookupResult.gl_account_number}</strong>
                </div>
                <div>
                  <span>Description</span>
                  <strong>{lookupResult.gl_account_description}</strong>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="table-wrap">
          <div className="table-header">
            <div className="table-title">Mappings</div>
            <div className="search-box">
              <span className="search-icon" aria-hidden="true"></span>
              <input
                type="text"
                aria-label="Search mappings"
                placeholder="Range, grouping, name, GL..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div>Loading…</div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">#</div>
              <p>No vendor reference mappings found.</p>
              <p className="empty-state-sub">Create a mapping using the form above to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Range</th>
                  <th>New Grouping</th>
                  <th>NR</th>
                  <th>Reference Name</th>
                  <th>GL Account</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><span className="code-chip">{record.vendor_reference_range_display}</span></td>
                    <td><span className="code-chip">{record.group_code || '-'}</span></td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{record.nr_group || '-'}</span></td>
                    <td>{record.reference_name}</td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{record.gl_account_number}</span></td>
                    <td>{record.gl_account_description}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn-icon" onClick={() => handleEdit(record)} title="Edit">Edit</button>
                        <button type="button" className="btn-icon danger" onClick={() => handleDelete(record)} title="Delete">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
