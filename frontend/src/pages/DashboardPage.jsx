import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'
import OnboardingDetailPanel from '../components/OnboardingDetailPanel'
import CreateOnboardingModal from '../components/CreateOnboardingModal'
import ManageUsersModal from '../components/ManageUsersModal'
import ManualOnboardingModal from '../components/ManualOnboardingModal'
import { formatMsmeOption, normalizeMsmeCode } from '../constants/msme'

const STATUS_CLASS = {
  DRAFT: 's-draft', PENDING: 's-pending', UNDER_REVIEW: 's-review',
  APPROVED: 's-approved', REJECTED: 's-rejected',
}
const STATUS_LABEL = {
  DRAFT: 'Draft', PENDING: 'Pending', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected',
}

const PAN_STATUS = {
  NOT_VERIFIED: 'not_verified',
  VALID_OPERATIVE: 'valid_operative',
  VALID_INOPERATIVE: 'valid_inoperative',
  FAILED: 'failed',
}

const GST_STATUS = {
  NOT_VERIFIED: 'not_verified',
  VALID: 'valid',
  FAILED: 'failed',
}

const hasAny = (value, terms) => {
  const normalized = String(value || '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

const classifyPanStatus = (onboarding) => {
  const status = onboarding.pan_verification_status
  if (!onboarding.pan_number || !status) return PAN_STATUS.NOT_VERIFIED
  if (hasAny(status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found'])) return PAN_STATUS.FAILED
  if (hasAny(status, ['inoperative', 'not operative'])) return PAN_STATUS.VALID_INOPERATIVE
  if (onboarding.pan_verified || hasAny(status, ['valid'])) return PAN_STATUS.VALID_OPERATIVE
  return PAN_STATUS.FAILED
}

const classifyGstStatus = (onboarding) => {
  const status = onboarding.gst_verification_status
  if (!onboarding.gst_number || !status) return GST_STATUS.NOT_VERIFIED
  if (
    hasAny(status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found', 'cancelled', 'suspended']) ||
    hasAny(status, ['found but status'])
  ) {
    return GST_STATUS.FAILED
  }
  if (onboarding.gst_verified || hasAny(status, ['valid'])) return GST_STATUS.VALID
  return GST_STATUS.FAILED
}

const getVerificationRowClass = (onboarding) => {
  const panStatus = classifyPanStatus(onboarding)
  const gstStatus = classifyGstStatus(onboarding)

  if (panStatus === PAN_STATUS.FAILED || gstStatus === GST_STATUS.FAILED) {
    return 'verification-row-failed'
  }

  if (panStatus === PAN_STATUS.VALID_OPERATIVE && gstStatus === GST_STATUS.VALID) {
    return 'verification-row-verified'
  }

  const panPassed = panStatus === PAN_STATUS.VALID_OPERATIVE || panStatus === PAN_STATUS.VALID_INOPERATIVE
  const gstPassed = gstStatus === GST_STATUS.VALID
  if (
    (panPassed && gstStatus === GST_STATUS.NOT_VERIFIED) ||
    (panStatus === PAN_STATUS.NOT_VERIFIED && gstPassed)
  ) {
    return 'verification-row-progress'
  }

  return ''
}

const panBadge = (onboarding) => {
  const status = classifyPanStatus(onboarding)
  if (status === PAN_STATUS.NOT_VERIFIED) return { label: 'Not Verified', className: 'badge-warning' }
  if (status === PAN_STATUS.VALID_OPERATIVE) return { label: 'Valid & Operative', className: 'badge-success' }
  if (status === PAN_STATUS.VALID_INOPERATIVE) return { label: 'Valid & Inoperative', className: 'badge-warning' }
  return { label: 'Invalid / Failed', className: 'badge-danger' }
}

const gstBadge = (onboarding) => {
  const status = classifyGstStatus(onboarding)
  if (status === GST_STATUS.NOT_VERIFIED) return { label: 'Not Verified', className: 'badge-warning' }
  if (status === GST_STATUS.VALID) return { label: 'Valid', className: 'badge-success' }
  return { label: 'Invalid / Failed', className: 'badge-danger' }
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const toast = useToast()

  const [onboardings, setOnboardings] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [rowExportingId, setRowExportingId] = useState(null)
  const [panExporting, setPanExporting] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const [listRes, statsRes] = await Promise.all([
        api.get('/onboarding/', { params }),
        api.get('/onboarding/stats/', {
          params: {
            ...(typeFilter ? { type: typeFilter } : {}),
            ...(startDate ? { start_date: startDate } : {}),
            ...(endDate ? { end_date: endDate } : {}),
          },
        }),
      ])
      setOnboardings(listRes.data)
      setStats(statsRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreated = () => {
    setShowCreateModal(false)
    fetchData()
    toast.success('Onboarding created', 'Invite email sent successfully.')
  }

  const handleManualCreated = () => {
    setShowManualModal(false)
    fetchData()
    toast.success('Onboarding created', 'Vendor/customer record created successfully.')
  }

  const handleUpdated = () => {
    fetchData()
    setSelectedId(null)
  }

  const handleExport = async () => {
    if (startDate && endDate && startDate > endDate) {
      toast.error('Invalid date range', 'End date must be on or after start date.')
      return
    }

    setExporting(true)
    try {
      const response = await api.get('/onboarding/export/', {
        params: {
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'onboarding_export.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed', 'Unable to export the selected records.')
    } finally {
      setExporting(false)
    }
  }

  const handlePanExport = async () => {
    if (startDate && endDate && startDate > endDate) {
      toast.error('Invalid date range', 'End date must be on or after start date.')
      return
    }

    setPanExporting(true)
    try {
      const response = await api.get('/onboarding/export/pan/', {
        params: {
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = 'pan_data_export.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PAN data export downloaded')
    } catch {
      toast.error('PAN data export failed', 'Unable to export the selected PAN data.')
    } finally {
      setPanExporting(false)
    }
  }

  const handleRowExport = async (event, onboarding) => {
    event.stopPropagation()
    if (onboarding.status !== 'APPROVED') {
      toast.error('Export unavailable', 'Only approved records can be exported.')
      return
    }

    setRowExportingId(onboarding.id)
    try {
      const response = await api.get(`/onboarding/export/${onboarding.id}/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `${onboarding.onboarding_code || 'onboarding'}_export.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed', 'Only approved records can be exported.')
    } finally {
      setRowExportingId(null)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="logo">
          <img src="/radico-logo.png" alt="Radico Khaitan" className="logo-img" />
        </div>
        <nav className="header-nav">
          <span className="nav-user">
            {user?.full_name || user?.email}
          </span>
          {user?.is_superuser && (
            <button className="nav-btn" onClick={() => setShowUsersModal(true)}>Manage Users</button>
          )}
          <Link className="nav-btn" to="/vendor-reference-master">Vendor Reference Master</Link>
          <button className="nav-btn danger" onClick={logout}>Sign Out</button>
        </nav>
      </header>

      <div className="page dashboard-page">
        <div className="dashboard-hero">
          <div className="page-header dashboard-page-header">
          <div>
            <h1>Onboarding Dashboard</h1>
            <p>
              {user?.is_superuser
                ? 'All vendor and customer onboarding registrations across the organisation.'
                : 'Your vendor and customer onboarding registrations.'}
            </p>
          </div>
        </div>

        <div className="dashboard-actions dashboard-actions-top">
          <div className="dashboard-actions-left">
            <button className="btn btn-secondary dashboard-action-btn" onClick={() => setShowManualModal(true)}>
              Manual Onboarding
            </button>
            <button className="btn btn-primary dashboard-action-btn dashboard-primary-action" onClick={() => setShowCreateModal(true)}>
              Generate Onboarding Link
            </button>
          </div>
          <button className="btn btn-secondary dashboard-export-btn" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="stat-card stat-total">
            <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4338CA' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total ?? '—'}</div>
            <div className="stat-sub">V:{stats.vendor ?? 0} · C:{stats.customer ?? 0}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon" style={{ background: '#FEF9C3', color: '#D97706' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-label">Pending Review</div>
            <div className="stat-value" style={{ color: '#854D0E' }}>{stats.pending ?? '—'}</div>
            <div className="stat-sub">Awaiting action</div>
          </div>
          <div className="stat-card stat-approved">
            <div className="stat-icon" style={{ background: '#DCFCE7', color: '#166534' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="stat-label">Approved</div>
            <div className="stat-value" style={{ color: '#166534' }}>{stats.approved ?? '—'}</div>
            <div className="stat-sub">Active registrations</div>
          </div>
          <div className="stat-card stat-msme">
            <div className="stat-icon" style={{ background: 'var(--mna-bg)', color: 'var(--mna)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            </div>
            <div className="stat-label">MSME Registered</div>
            <div className="stat-value" style={{ color: 'var(--mna)' }}>{stats.msme ?? '—'}</div>
            <div className="stat-sub">With MSME certificate</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-header registration-table-header">
            <div className="table-title">{user?.is_superuser ? 'All Registrations' : 'My Registrations'}</div>
            <div className="registration-filter-bar">
              <div className="search-box">
                <span className="search-icon" aria-hidden="true"></span>
                <input
                  type="text"
                  placeholder="Search name, code, PAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="VENDOR">Vendor</option>
                <option value="CUSTOMER">Customer</option>
              </select>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <label className="date-filter">
                <span>Created from</span>
                <input
                  type="date"
                  aria-label="Created from date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="date-filter">
                <span>Created to</span>
                <input
                  type="date"
                  aria-label="Created to date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <button className="btn btn-secondary filter-export-btn" onClick={handlePanExport} disabled={panExporting}>
                {panExporting ? 'Exporting…' : 'Export PAN Data'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading registrations<div className="loading-shimmer" /></div>
          ) : onboardings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No registrations found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Company Name</th>
                  <th>PAN</th>
                  <th>PAN Verification</th>
                  <th>GST Verification</th>
                  <th>MSME</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Export</th>
                </tr>
              </thead>
              <tbody>
                {onboardings.map((o) => {
                  const pan = panBadge(o)
                  const gst = gstBadge(o)

                  return (
                  <tr key={o.id} className={getVerificationRowClass(o)} onClick={() => setSelectedId(o.id)}>
                    <td><span className="code-chip">{o.onboarding_code}</span></td>
                    <td>
                      <span className={`type-badge ${o.onboarding_type === 'VENDOR' ? 'type-vendor' : 'type-customer'}`}>
                        {o.onboarding_type === 'VENDOR' ? 'Vendor' : 'Customer'}
                      </span>
                    </td>
                    <td style={{ fontWeight: o.company_name ? 500 : 400 }}>
                      {o.company_name || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      {o.pan_number
                        ? <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{o.pan_number}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${pan.className}`}>{pan.label}</span>
                    </td>
                    <td>
                      <span className={`badge ${gst.className}`}>{gst.label}</span>
                    </td>
                    <td>
                      {normalizeMsmeCode(o.msme_status) === 'MNA'
                        ? <span className="badge badge-mna">{formatMsmeOption('MNA')}</span>
                        : <span className="badge badge-success">{formatMsmeOption(o.msme_status)}</span>
                      }
                    </td>
                    <td>
                      <span className={`status-pill ${STATUS_CLASS[o.status] || 's-draft'}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon row-export-btn"
                        onClick={(event) => handleRowExport(event, o)}
                        disabled={o.status !== 'APPROVED' || rowExportingId === o.id}
                        title={o.status === 'APPROVED' ? 'Export this record' : 'Only approved records can be exported'}
                      >
                        {rowExportingId === o.id ? '...' : 'Export'}
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedId && (
        <OnboardingDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}

      {showCreateModal && (
        <CreateOnboardingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {showUsersModal && (
        <ManageUsersModal onClose={() => setShowUsersModal(false)} />
      )}

      {showManualModal && (
        <ManualOnboardingModal
          onClose={() => setShowManualModal(false)}
          onCreated={handleManualCreated}
        />
      )}
    </>
  )
}
