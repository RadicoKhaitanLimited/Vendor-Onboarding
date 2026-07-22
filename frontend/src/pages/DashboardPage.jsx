import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'
import OnboardingDetailPanel from '../components/OnboardingDetailPanel'
import CreateOnboardingModal from '../components/CreateOnboardingModal'
import ManageUsersModal from '../components/ManageUsersModal'
import ManualOnboardingModal from '../components/ManualOnboardingModal'
import BulkImportModal from '../components/BulkImportModal'
import ExtensionEditModal from '../components/ExtensionEditModal'
import { formatMsmeOption, normalizeMsmeCode } from '../constants/msme'
import { isPanNameEditable } from '../utils/panName'
import { fullCompanyName } from '../utils/companyName'

const STATUS_CLASS = {
  DRAFT: 's-draft', PENDING: 's-pending', PENDING_BOSS_APPROVAL: 's-pending', UNDER_REVIEW: 's-review',
  APPROVED: 's-approved', REJECTED: 's-rejected',
}
const STATUS_LABEL = {
  DRAFT: 'Draft', PENDING: 'Pending', PENDING_BOSS_APPROVAL: 'Pending Approver/Manager Approval', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected',
}
const PENDING_GROUP_FILTER = 'PENDING_GROUP'

const REQUEST_TYPE_LABEL = {
  EXTENSION: 'Extension',
  EDIT: 'Edit',
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
  NOT_APPLICABLE: 'not_applicable',
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
  if (!onboarding.gst_applicable) return GST_STATUS.NOT_APPLICABLE
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

  const gstOk = gstStatus === GST_STATUS.VALID || gstStatus === GST_STATUS.NOT_APPLICABLE

  if (panStatus === PAN_STATUS.VALID_OPERATIVE && gstOk) {
    return 'verification-row-verified'
  }

  const panPassed = panStatus === PAN_STATUS.VALID_OPERATIVE || panStatus === PAN_STATUS.VALID_INOPERATIVE
  const gstPassed = gstOk
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
  const checksAadhaar = isPanNameEditable(onboarding.pan_number)
  if (status === PAN_STATUS.NOT_VERIFIED) return { label: 'Not Verified', className: 'badge-warning' }
  if (status === PAN_STATUS.VALID_OPERATIVE) return { label: checksAadhaar ? 'Valid & Operative' : 'Valid', className: 'badge-success' }
  if (status === PAN_STATUS.VALID_INOPERATIVE) return { label: 'Valid & Inoperative', className: 'badge-warning' }
  return { label: 'Invalid / Failed', className: 'badge-danger' }
}

const gstBadge = (onboarding) => {
  const status = classifyGstStatus(onboarding)
  if (status === GST_STATUS.NOT_APPLICABLE) return { label: 'Not Applicable', className: 'badge-mna' }
  if (status === GST_STATUS.NOT_VERIFIED) return { label: 'Not Verified', className: 'badge-warning' }
  if (status === GST_STATUS.VALID) return { label: 'Valid', className: 'badge-success' }
  return { label: 'Invalid / Failed', className: 'badge-danger' }
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [onboardings, setOnboardings] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(PENDING_GROUP_FILTER)
  const [typeFilter, setTypeFilter] = useState('')
  const [panStatusFilter, setPanStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [rowExportingId, setRowExportingId] = useState(null)
  const [panExporting, setPanExporting] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showExtensionEditModal, setShowExtensionEditModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkSendBoss, setBulkSendBoss] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [selectedKind, setSelectedKind] = useState('onboarding')

  useEffect(() => {
    const approvalId = searchParams.get('approval')
    if (approvalId) {
      setSelectedId(approvalId)
      setSelectedKind(searchParams.get('approval_kind') === 'extension_edit' ? 'extension_edit' : 'onboarding')
    }
  }, [searchParams])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const extensionEditParams = {}
      if (search) extensionEditParams.search = search
      if (statusFilter) extensionEditParams.status = statusFilter
      if (startDate) extensionEditParams.start_date = startDate
      if (endDate) extensionEditParams.end_date = endDate
      if (typeFilter) extensionEditParams.target_type = typeFilter

      const [listRes, statsRes, extensionEditRes] = await Promise.all([
        api.get('/onboarding/', { params }),
        api.get('/onboarding/stats/', {
          params: {
            ...(typeFilter ? { type: typeFilter } : {}),
            ...(startDate ? { start_date: startDate } : {}),
            ...(endDate ? { end_date: endDate } : {}),
          },
        }),
        api.get('/onboarding/extension-edit/', { params: extensionEditParams }),
      ])
      const taggedOnboardings = listRes.data.map((item) => ({ ...item, _kind: 'onboarding' }))
      const taggedExtensionEdit = extensionEditRes.data.map((item) => ({
        ...item,
        _kind: 'extension_edit',
        onboarding_code: item.request_code,
        onboarding_type: item.target_type,
      }))
      const merged = [...taggedOnboardings, ...taggedExtensionEdit]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setOnboardings(merged)
      setStats(statsRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, startDate, endDate])

  useEffect(() => {
    fetchData()
    setSelectedIds([])
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

  const handleExtensionEditCreated = () => {
    setShowExtensionEditModal(false)
    fetchData()
  }

  const handleBulkImported = () => {
    fetchData()
  }

  const visibleOnboardings = panStatusFilter
    ? onboardings.filter((o) => o._kind !== 'extension_edit' && classifyPanStatus(o) === panStatusFilter)
    : onboardings

  const isRowSelectable = (o) => {
    if (o._kind === 'extension_edit') return false
    if (user?.role === 'BOSS') return o.status !== 'APPROVED' && o.status !== 'REJECTED'
    if (user?.role === 'EMPLOYEE') {
      return o.status !== 'APPROVED'
        && o.status !== 'PENDING_BOSS_APPROVAL'
        && getVerificationRowClass(o) === 'verification-row-verified'
    }
    return false
  }

  const toggleSelected = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  const toggleSelectAll = () => {
    const selectableIds = visibleOnboardings.filter(isRowSelectable).map((o) => o.id)
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : selectableIds)
  }

  const handleBulkSendToBoss = async () => {
    if (!bulkSendBoss) {
      toast.error('Select approver', 'Please select the approver/manager for approval.')
      return
    }
    setBulkSending(true)
    try {
      const { data } = await api.post('/onboarding/bulk-send-to-boss/', {
        ids: selectedIds,
        approval_boss: bulkSendBoss,
      })
      if (data.sent_count > 0) {
        toast.success('Sent for approval', `${data.sent_count} record(s) sent${data.failed_count ? `, ${data.failed_count} failed` : '.'}`)
      }
      if (data.failed_count > 0) {
        const firstFailure = data.failed[0]
        const firstMessage = firstFailure?.errors ? Object.values(firstFailure.errors).flat().join(' ') : ''
        toast.error(`${data.failed_count} record(s) could not be sent`, firstFailure?.company_name ? `${firstFailure.company_name}: ${firstMessage}` : firstMessage)
      }
      setSelectedIds([])
      setBulkSendBoss('')
      fetchData()
    } catch (err) {
      const data = err.response?.data
      const message = data && typeof data === 'object' ? Object.values(data).flat().join(' ') : ''
      toast.error('Failed', message || 'Could not send selected records for approval.')
    } finally {
      setBulkSending(false)
    }
  }

  const handleBulkApprove = async () => {
    setBulkSending(true)
    try {
      const { data } = await api.post('/onboarding/bulk-approve/', {
        ids: selectedIds,
      })
      if (data.approved_count > 0) {
        toast.success('Approved', `${data.approved_count} record(s) approved${data.failed_count ? `, ${data.failed_count} failed` : '.'}`)
      }
      if (data.failed_count > 0) {
        const firstFailure = data.failed[0]
        const firstMessage = firstFailure?.errors ? Object.values(firstFailure.errors).flat().join(' ') : ''
        toast.error(`${data.failed_count} record(s) could not be approved`, firstFailure?.company_name ? `${firstFailure.company_name}: ${firstMessage}` : firstMessage)
      }
      setSelectedIds([])
      fetchData()
    } catch (err) {
      const data = err.response?.data
      const message = data && typeof data === 'object' ? Object.values(data).flat().join(' ') : ''
      toast.error('Failed', message || 'Could not approve selected records.')
    } finally {
      setBulkSending(false)
    }
  }

  const handleUpdated = () => {
    fetchData()
    setSelectedId(null)
  }

  const handleStatFilterKeyDown = (event, nextStatus) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setStatusFilter(nextStatus)
    }
  }

  const statCardClass = (baseClass, nextStatus) => [
    'stat-card',
    'stat-filter-card',
    baseClass,
    statusFilter === nextStatus ? 'active' : '',
  ].filter(Boolean).join(' ')

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
    if (onboarding._kind === 'extension_edit') {
      toast.error('Export unavailable', 'Extension/edit requests cannot be exported.')
      return
    }
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
        <div className="header-left">
          <div className="logo">
            <img src="/radico-logo.png" alt="Radico Khaitan" className="logo-img" />
          </div>
        </div>
        <div className="header-title">Business Partner Onboarding</div>
        <nav className="header-nav">
          <Link className="nav-btn" to="/profile">{user?.full_name || user?.email}</Link>
          {(user?.is_superuser || ['ADMIN', 'BOSS'].includes(user?.role)) && (
            <button className="nav-btn" onClick={() => setShowUsersModal(true)}>
              {!user?.is_superuser && user?.role === 'BOSS' ? 'My Employees' : 'Manage Users'}
            </button>
          )}
          <button className="nav-btn danger" onClick={logout}>Sign Out</button>
        </nav>
      </header>

      <div className="page dashboard-page">
        <div className="dashboard-hero">
          <div className="page-header dashboard-page-header">
          <div>
            <h1>Onboarding Dashboard</h1>
            <p>Your complete business onboarding journey, in one place.</p>
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
            <button className="btn btn-secondary dashboard-action-btn" onClick={() => setShowExtensionEditModal(true)}>
              Extension / Edit Vendor or Customer
            </button>
          </div>
          <div className="dashboard-actions-right">
            <button className="btn btn-secondary dashboard-action-btn" onClick={() => setShowBulkImportModal(true)}>
              Bulk Import (Excel)
            </button>
            <button className="btn btn-secondary dashboard-export-btn" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div
            className={statCardClass('stat-total', '')}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('')}
            onKeyDown={(event) => handleStatFilterKeyDown(event, '')}
          >
            <div className="stat-icon" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total ?? '—'}</div>
            <div className="stat-sub">V:{stats.vendor ?? 0} · C:{stats.customer ?? 0}</div>
          </div>
          <div
            className={statCardClass('stat-pending', PENDING_GROUP_FILTER)}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter(PENDING_GROUP_FILTER)}
            onKeyDown={(event) => handleStatFilterKeyDown(event, PENDING_GROUP_FILTER)}
          >
            <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-label">{user?.role === 'BOSS' ? 'Pending Approver/Manager Approval' : 'Pending Review'}</div>
            <div className="stat-value">{stats.pending ?? '—'}</div>
            <div className="stat-sub">Awaiting action</div>
          </div>
          <div
            className={statCardClass('stat-approved', 'APPROVED')}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('APPROVED')}
            onKeyDown={(event) => handleStatFilterKeyDown(event, 'APPROVED')}
          >
            <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="stat-label">Approved</div>
            <div className="stat-value">{stats.approved ?? '—'}</div>
            <div className="stat-sub">Active registrations</div>
          </div>
          <div
            className={statCardClass('stat-rejected', 'REJECTED')}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('REJECTED')}
            onKeyDown={(event) => handleStatFilterKeyDown(event, 'REJECTED')}
          >
            <div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{stats.rejected ?? '—'}</div>
            <div className="stat-sub">Needs correction</div>
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
                <option value={PENDING_GROUP_FILTER}>All Pending</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="PENDING_BOSS_APPROVAL">Pending Approver/Manager Approval</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                className="filter-select"
                value={panStatusFilter}
                onChange={(e) => setPanStatusFilter(e.target.value)}
              >
                <option value="">All PAN Status</option>
                <option value={PAN_STATUS.NOT_VERIFIED}>Not Verified</option>
                <option value={PAN_STATUS.VALID_OPERATIVE}>Valid & Operative</option>
                <option value={PAN_STATUS.VALID_INOPERATIVE}>Valid & Inoperative</option>
                <option value={PAN_STATUS.FAILED}>Invalid / Failed</option>
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

          {user?.role === 'EMPLOYEE' && selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <div className="bulk-action-count">
                <span key={selectedIds.length} className="bulk-action-count-badge">{selectedIds.length}</span>
                <span>selected</span>
              </div>
              <div className="bulk-action-divider" />
              <label className="bulk-action-boss-field">
                <span>Send to</span>
                <select value={bulkSendBoss} onChange={(e) => setBulkSendBoss(e.target.value)}>
                  <option value="">Select approver/manager…</option>
                  {(user.boss_details || []).map((boss) => (
                    <option key={boss.id} value={boss.id}>{boss.full_name || boss.email}</option>
                  ))}
                </select>
              </label>
              <div className="bulk-action-buttons">
                <button className="btn btn-primary" onClick={handleBulkSendToBoss} disabled={bulkSending || !bulkSendBoss}>
                  {bulkSending ? <><div className="spinner" /> Sending...</> : `Send ${selectedIds.length} for Approval`}
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedIds([])} disabled={bulkSending}>
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {user?.role === 'BOSS' && selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <div className="bulk-action-count">
                <span key={selectedIds.length} className="bulk-action-count-badge">{selectedIds.length}</span>
                <span>selected</span>
              </div>
              <div className="bulk-action-divider" />
              <div className="bulk-action-buttons" style={{ marginLeft: 0 }}>
                <button className="btn btn-primary" onClick={handleBulkApprove} disabled={bulkSending}>
                  {bulkSending ? <><div className="spinner" /> Approving...</> : `Approve ${selectedIds.length}`}
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedIds([])} disabled={bulkSending}>
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="spinner spinner-dark" />
              <p>Loading registrations…</p>
            </div>
          ) : visibleOnboardings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              {search || typeFilter || startDate || endDate || statusFilter !== PENDING_GROUP_FILTER || panStatusFilter ? (
                <>
                  <p>No registrations match your filters.</p>
                  <p className="hint">Try adjusting or clearing the search, type, status, PAN status, or date filters.</p>
                </>
              ) : (
                <p>No registrations found.</p>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {(user?.role === 'EMPLOYEE' || user?.role === 'BOSS') && (
                    <th className="select-col" rowSpan={2}>
                      <label className="row-check">
                        <input
                          type="checkbox"
                          aria-label="Select all eligible rows"
                          onClick={(event) => event.stopPropagation()}
                          onChange={toggleSelectAll}
                          checked={
                            selectedIds.length > 0 &&
                            visibleOnboardings.filter(isRowSelectable).every((o) => selectedIds.includes(o.id))
                          }
                        />
                        <span className="row-check-box" />
                      </label>
                    </th>
                  )}
                  <th className="col-request-id" rowSpan={2}>Request ID</th>
                  <th className="col-bp-type" rowSpan={2}>Business Partner Type</th>
                  <th className="col-bp-name" rowSpan={2}>Business Partner Name</th>
                  <th className="col-verification-group" colSpan={3}>Verification Details</th>
                  <th className="col-status" rowSpan={2}>Request Status</th>
                  <th className="col-requestor" rowSpan={2}>Requestor Details / Creation Date</th>
                  <th className="col-export" rowSpan={2}>Export Data</th>
                </tr>
                <tr>
                  <th className="col-pan verification-subhead">PAN</th>
                  <th className="col-gst verification-subhead">GST</th>
                  <th className="col-msme verification-subhead">MSME</th>
                </tr>
              </thead>
              <tbody>
                {visibleOnboardings.map((o) => {
                  const pan = panBadge(o)
                  const gst = gstBadge(o)
                  const selectable = isRowSelectable(o)

                  const isSelected = selectedIds.includes(o.id)

                  const isExtensionEdit = o._kind === 'extension_edit'

                  return (
                  <tr
                    key={o.id}
                    className={[getVerificationRowClass(o), isSelected ? 'row-selected' : ''].filter(Boolean).join(' ')}
                    onClick={() => { setSelectedId(o.id); setSelectedKind(o._kind) }}
                  >
                    {(user?.role === 'EMPLOYEE' || user?.role === 'BOSS') && (
                      <td className="select-col" onClick={(event) => event.stopPropagation()}>
                        <label
                          className={`row-check ${!selectable ? 'row-check-disabled' : ''}`}
                          title={
                            selectable
                              ? ''
                              : isExtensionEdit
                                ? 'Extension/edit requests are managed individually'
                                : user?.role === 'EMPLOYEE'
                                  ? 'PAN and GST must both be verified before sending for approval'
                                  : 'Already finalized'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!selectable}
                            onChange={() => toggleSelected(o.id)}
                          />
                          <span className="row-check-box" />
                        </label>
                      </td>
                    )}
                    <td className="col-request-id"><span className="code-chip">{o.onboarding_code}</span></td>
                    <td className="col-bp-type">
                      <span className={`type-badge ${o.onboarding_type === 'VENDOR' ? 'type-vendor' : 'type-customer'}`}>
                        {o.onboarding_type === 'VENDOR' ? 'Vendor' : 'Customer'}
                        {isExtensionEdit ? ` ${REQUEST_TYPE_LABEL[o.request_type] || ''}` : ''}
                      </span>
                    </td>
                    <td className="col-bp-name" style={{ fontWeight: o.company_name ? 500 : 400 }}>
                      {fullCompanyName(o) || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="col-pan">
                      {isExtensionEdit ? (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      ) : (
                        <div className="cell-stack">
                          {o.pan_number && (
                            <span className="cell-mono">{o.pan_number}</span>
                          )}
                          <span className={`badge ${pan.className}`}>{pan.label}</span>
                          {o.pan_category && (
                            <span className="badge badge-category">{o.pan_category}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="col-gst">
                      {isExtensionEdit ? (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      ) : (
                        <div className="cell-stack">
                          {o.gst_number && (
                            <span className="cell-mono">{o.gst_number}</span>
                          )}
                          <span className={`badge ${gst.className}`}>{gst.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="col-msme">
                      {isExtensionEdit
                        ? <span style={{ color: 'var(--muted)' }}>—</span>
                        : normalizeMsmeCode(o.msme_status) === 'MNA'
                          ? <span className="badge badge-mna">{formatMsmeOption('MNA')}</span>
                          : <span className="badge badge-success">{formatMsmeOption(o.msme_status)}</span>
                      }
                    </td>
                    <td className="col-status">
                      <span className={`status-pill ${STATUS_CLASS[o.status] || 's-draft'}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="col-requestor">
                      {o.created_by_email || o.created_by_name ? (
                        <div className="cell-stack">
                          {o.created_by_name && <span className="cell-name">{o.created_by_name}</span>}
                          <span className="cell-subtext">{o.created_by_email}</span>
                          <span className="cell-subtext">{new Date(o.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td className="col-export">
                      <button
                        type="button"
                        className="btn-icon row-export-btn"
                        onClick={(event) => handleRowExport(event, o)}
                        disabled={isExtensionEdit || o.status !== 'APPROVED' || rowExportingId === o.id}
                        title={isExtensionEdit ? 'Extension/edit requests cannot be exported' : o.status === 'APPROVED' ? 'Export this record' : 'Only approved records can be exported'}
                      >
                        {isExtensionEdit ? '—' : rowExportingId === o.id ? '...' : 'Export'}
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
          kind={selectedKind}
          onClose={() => {
            setSelectedId(null)
            setSelectedKind('onboarding')
            if (searchParams.has('approval')) {
              const nextParams = new URLSearchParams(searchParams)
              nextParams.delete('approval')
              nextParams.delete('approval_kind')
              setSearchParams(nextParams, { replace: true })
            }
          }}
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

      {showBulkImportModal && (
        <BulkImportModal
          onClose={() => setShowBulkImportModal(false)}
          onImported={handleBulkImported}
        />
      )}

      {showExtensionEditModal && (
        <ExtensionEditModal
          onClose={() => setShowExtensionEditModal(false)}
          onCreated={handleExtensionEditCreated}
        />
      )}
    </>
  )
}
