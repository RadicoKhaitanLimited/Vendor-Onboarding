import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import EditOnboardingModal from './EditOnboardingModal'
import { formatMsmeOption } from '../constants/msme'
import { classifyPanApprovalStatus, effectiveTdsCode, isPanApprovalInvalid } from '../constants/tdsCodes'

const STATUS_CLASS = {
  DRAFT: 's-draft', PENDING: 's-pending', PENDING_BOSS_APPROVAL: 's-pending', UNDER_REVIEW: 's-review',
  APPROVED: 's-approved', REJECTED: 's-rejected',
}
const STATUS_LABEL = {
  DRAFT: 'Draft', PENDING: 'Pending', PENDING_BOSS_APPROVAL: 'Pending Approver/Manager Approval', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected',
}
const REQUEST_TYPE_LABEL = { EXTENSION: 'Extension', EDIT: 'Edit' }

function SummaryRow({ label, value, mono }) {
  return (
    <div className="summary-row">
      <span className="summary-key">{label}</span>
      <span className={`summary-val${mono ? ' mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

function ExtensionEditActions({ data, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [approvalBoss, setApprovalBoss] = useState('')
  const [remarks, setRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const bossOptions = user?.role === 'EMPLOYEE' ? (user.boss_details || []) : []
  const canApprove = ['ADMIN', 'BOSS'].includes(user?.role) || user?.is_superuser
  const canSendToBoss = user?.role === 'EMPLOYEE' && ['DRAFT', 'PENDING'].includes(data.status)

  const handleSendToBoss = async () => {
    if (!approvalBoss) {
      toast.error('Select approver', 'Please select the approver/manager for approval.')
      return
    }
    setActionLoading('send')
    try {
      await api.post(`/onboarding/extension-edit/${data.id}/send-to-boss/`, { approval_boss: approvalBoss })
      toast.success('Sent for approval', 'Request has been sent to the approver/manager.')
      setApprovalBoss('')
      onSaved()
    } catch (err) {
      const responseData = err.response?.data
      const validationMessage = responseData && typeof responseData === 'object'
        ? Object.values(responseData).flat().join(' ')
        : ''
      toast.error('Failed', validationMessage || responseData?.detail || 'Could not send request for approval.')
    } finally {
      setActionLoading('')
    }
  }

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await api.post(`/onboarding/extension-edit/${data.id}/approve/`, { remarks })
      toast.success('Approved', 'Request has been approved.')
      onSaved()
    } catch (err) {
      toast.error('Failed', err.response?.data?.detail || 'Could not approve.')
    } finally {
      setActionLoading('')
    }
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast.error('Remarks required', 'Please enter a reason for rejection.')
      return
    }
    setActionLoading('reject')
    try {
      await api.post(`/onboarding/extension-edit/${data.id}/reject/`, { remarks })
      toast.success('Rejected', 'Request has been rejected.')
      onSaved()
    } catch (err) {
      toast.error('Failed', err.response?.data?.detail || 'Could not reject.')
    } finally {
      setActionLoading('')
    }
  }

  return (
    <>
      {canSendToBoss && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">✓</div>Send For Approver/Manager Approval</div>
          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>Select Approver/Manager <span className="req">*</span></label>
            <select value={approvalBoss} onChange={(e) => setApprovalBoss(e.target.value)}>
              <option value="">Select approver/manager</option>
              {bossOptions.map((boss) => (
                <option key={boss.id} value={boss.id}>{boss.full_name || boss.email}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleSendToBoss} disabled={!!actionLoading}>
            {actionLoading === 'send' ? <><div className="spinner" /> Sending...</> : 'Send to Approver/Manager'}
          </button>
        </div>
      )}

      {canApprove && data.status !== 'APPROVED' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">⚙️</div>Approval Actions</div>
          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>Remarks</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks (required for rejection)"
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={handleApprove} disabled={!!actionLoading}>
              {actionLoading === 'approve' ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Approving…</> : '✅ Approve'}
            </button>
            <button className="btn btn-danger" onClick={handleReject} disabled={!!actionLoading}>
              {actionLoading === 'reject' ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Rejecting…</> : '❌ Reject'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function OnboardingDetailPanel({ id, kind = 'onboarding', onClose, onUpdated }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const isExtensionEdit = kind === 'extension_edit'
  const isCustomer = isExtensionEdit ? data?.target_type !== 'VENDOR' : data?.onboarding_type !== 'VENDOR'

  const effectiveTdsCodesDisplay = (() => {
    if (!data?.tds_codes) return ''
    const panApprovalStatus = classifyPanApprovalStatus(data)
    const codes = data.tds_codes.split(',').map((code) => code.trim()).filter(Boolean)
    const effectiveCodes = codes.map((code) => effectiveTdsCode(code, panApprovalStatus))
    return isPanApprovalInvalid(panApprovalStatus) ? effectiveCodes.join(', ') : ''
  })()

  const loadData = () => {
    const url = isExtensionEdit ? `/onboarding/extension-edit/${id}/` : `/onboarding/${id}/`
    api.get(url)
      .then(({ data }) => { setData(data) })
      .catch(() => toast.error('Failed to load details'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [id, kind])

  const handleEditSaved = () => {
    setShowEdit(false)
    setLoading(true)
    loadData()
    onUpdated()
  }

  const handleExtensionEditSaved = () => {
    setLoading(true)
    loadData()
    onUpdated()
  }

  if (isExtensionEdit) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-panel detail-panel">
          <div className="modal-header">
            <div className="detail-header-info">
              <div className="detail-header-top">
                <span className="code-chip">{data?.request_code || '…'}</span>
                {data?.company_name && <h2 className="detail-header-name">{data.company_name}</h2>}
              </div>
              <div className="detail-header-badges">
                <span className={`type-badge ${data?.target_type === 'VENDOR' ? 'type-vendor' : 'type-customer'}`}>
                  {data?.target_type === 'VENDOR' ? 'Vendor' : 'Customer'} {REQUEST_TYPE_LABEL[data?.request_type] || ''}
                </span>
                {data && <span className={`status-pill ${STATUS_CLASS[data.status]}`}>{STATUS_LABEL[data.status]}</span>}
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div>Loading…</div>
          ) : data ? (
            <>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-title"><div className="card-title-icon">🏢</div>Request Details</div>
                <div className="summary-grid">
                  <SummaryRow label="Account Number" value={data.account_number} mono />
                  <SummaryRow label={data.target_type === 'VENDOR' ? 'Vendor Name' : 'Customer Name'} value={data.company_name} />
                  <SummaryRow label="Request Type" value={REQUEST_TYPE_LABEL[data.request_type]} />
                  <SummaryRow label="Created On" value={formatDateTime(data.created_at)} />
                  <SummaryRow label="Updated On" value={formatDateTime(data.updated_at)} />
                  <SummaryRow label="Created By" value={data.created_by_email} />
                  <SummaryRow label="Assigned Approver/Manager" value={data.assigned_boss_email} />
                  {data.remarks_request && <SummaryRow label="Description" value={data.remarks_request} />}
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-title"><div className="card-title-icon">#</div>SAP / ERP Reference Details</div>
                <div className="summary-grid">
                  {isCustomer && <SummaryRow label="Sales Reference Org" value={data.sales_reference_orgs?.join(', ')} mono />}
                  {isCustomer && <SummaryRow label="Search Term" value={data.customer_search_term} mono />}
                  {isCustomer && <SummaryRow label="Company Code" value={data.customer_company_code} mono />}
                  {isCustomer && <SummaryRow label="Sales Organization" value={data.sales_organization?.join(', ')} mono />}
                  {isCustomer && <SummaryRow label="Distribution Channel" value={data.distribution_channel} />}
                  {isCustomer && <SummaryRow label="Division" value={data.division} />}
                  {isCustomer && <SummaryRow label="Delivery Plant" value={data.delivery_plant} mono />}
                  {isCustomer && <SummaryRow label="Transportation Zone" value={data.transportation_zone} />}
                  {!isCustomer && <SummaryRow label="Reference Purchase Orgs" value={data.reference_purchase_orgs?.join(', ')} mono />}
                  {!isCustomer && <SummaryRow label="Search Term" value={data.search_term} mono />}
                  {!isCustomer && <SummaryRow label="Purchase Org. to Open" value={data.purchase_orgs_to_open} mono />}
                  {!isCustomer && <SummaryRow label="Company Code to Open" value={data.company_code_to_open} mono />}
                  <SummaryRow label="Payment Terms" value={data.payment_terms} mono />
                  {!isCustomer && <SummaryRow label="TDS Codes" value={data.tds_codes} mono />}
                </div>
              </div>

              {data.status === 'APPROVED' && (
                <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3C5', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '.5rem', fontSize: 13, color: 'var(--success)' }}>
                  ✅ Approved by <strong>{data.approved_by_email}</strong> on {new Date(data.approved_at).toLocaleString('en-IN')}
                  {data.remarks && <div style={{ marginTop: 6, color: 'var(--text)' }}>Remarks: {data.remarks}</div>}
                </div>
              )}
              {data.status === 'REJECTED' && data.remarks && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '.5rem', fontSize: 13, color: 'var(--danger)' }}>
                  Rejection Comments: {data.remarks}
                </div>
              )}

              <ExtensionEditActions data={data} onSaved={handleExtensionEditSaved} />

              {data.approval_history?.length > 0 && (
                <div className="card" style={{ marginTop: '1rem' }}>
                  <div className="card-title"><div className="card-title-icon">#</div>Approval History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.approval_history.map((item) => (
                      <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                        <strong>{item.action}</strong>
                        <span style={{ color: 'var(--muted)' }}> by {item.actor_name || item.actor_email || 'System'} on {new Date(item.created_at).toLocaleString('en-IN')}</span>
                        {item.comments && <div style={{ marginTop: 4 }}>{item.comments}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">Could not load request details.</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel detail-panel">
        <div className="modal-header">
          <div className="detail-header-info">
            <div className="detail-header-top">
              <span className="code-chip">{data?.onboarding_code || '…'}</span>
              {data?.company_name && <h2 className="detail-header-name">{data.company_name}</h2>}
            </div>
            <div className="detail-header-badges">
              <span className={`type-badge ${data?.onboarding_type === 'VENDOR' ? 'type-vendor' : 'type-customer'}`}>
                {data?.onboarding_type === 'VENDOR' ? 'Vendor' : 'Customer'}
              </span>
              {data && <span className={`status-pill ${STATUS_CLASS[data.status]}`}>{STATUS_LABEL[data.status]}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {data && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setShowEdit(true)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div>Loading…</div>
        ) : data ? (
          <>
            {/* Company */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">🏢</div>Company Information</div>
              <div className="summary-grid">
                <SummaryRow label="Company Name" value={data.company_name} />
                <SummaryRow label="Contact Person" value={data.contact_person} />
                <SummaryRow label="Emails" value={data.emails?.join(', ')} />
                <SummaryRow label="Phones" value={data.phones?.join(', ')} />
                <SummaryRow label="Created On" value={formatDateTime(data.created_at)} />
                <SummaryRow label="Updated On" value={formatDateTime(data.updated_at)} />
                <SummaryRow label="Created By" value={data.created_by_email} />
                <SummaryRow label="Assigned Approver/Manager" value={data.assigned_boss_email} />
              </div>
            </div>

            {/* Address */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">📍</div>Address</div>
              <div className="summary-grid">
                <SummaryRow label="City" value={data.city} />
                <SummaryRow label="District" value={data.district} />
                <SummaryRow label="State" value={data.state} />
                <SummaryRow label="PIN Code" value={data.pincode} mono />
                <SummaryRow label="Country" value={data.country} />
                <SummaryRow label="Street" value={[data.street1, data.street2, data.street3, data.street4].filter(Boolean).join(', ')} />
              </div>
            </div>

            {/* Tax & Bank */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">🏛️</div>Tax{!isCustomer ? ' & Bank' : ''}</div>
              <div className="summary-grid">
                <SummaryRow label="PAN" value={data.pan_number} mono />
                <SummaryRow label="GST" value={data.gst_applicable ? data.gst_number : 'Not Applicable'} mono />
                <SummaryRow label="GST Applicable" value={yesNo(data.gst_applicable)} />
                <SummaryRow label="PAN Verified" value={yesNo(data.pan_verified)} />
                <SummaryRow label="PAN Status" value={data.pan_verification_status} />
                <SummaryRow label="GST Verified" value={yesNo(data.gst_verified)} />
                <SummaryRow label="GST Status" value={data.gst_verification_status} />
                {!isCustomer && (
                  <>
                    <SummaryRow label="TDS Codes (Selected)" value={data.tds_codes} mono />
                    {effectiveTdsCodesDisplay && (
                      <SummaryRow label="TDS Codes (Higher rate — PAN invalid/inoperative)" value={effectiveTdsCodesDisplay} mono />
                    )}
                    <SummaryRow label="Bank" value={data.bank_name} />
                    <SummaryRow label="Branch" value={data.branch_name} />
                    <SummaryRow label="Account No." value={data.account_number} mono />
                    <SummaryRow label="IFSC" value={data.ifsc_code} mono />
                    <SummaryRow label="Holder Name" value={data.account_holder_name} />
                  </>
                )}
              </div>
            </div>

            {/* MSME */}
            {!isCustomer && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">🏅</div>MSME</div>
              <div className="summary-grid">
                <SummaryRow label="MSME Status" value={formatMsmeOption(data.msme_status)} />
                {data.msme_applicable && (
                  <>
                    <SummaryRow label="Category" value={formatMsmeOption(data.msme_category)} />
                    <SummaryRow label="Udyam No." value={data.udyam_number} mono />
                  </>
                )}
              </div>
            </div>
            )}

            {/* SAP / ERP */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">#</div>SAP / ERP Reference Details</div>
              <div className="summary-grid">
                <SummaryRow label={isCustomer ? 'Customer Reference Code' : 'Vendor Reference Code'} value={data.reference_vendor_code} mono />
                <SummaryRow label={isCustomer ? 'Customer Reference Range' : 'Vendor Reference Range'} value={data.vendor_reference_range} mono />
                <SummaryRow label="Reference Name" value={data.reference_name} />
                <SummaryRow label="GL Account Number" value={data.gl_account_number} mono />
                <SummaryRow label="GL Account Description" value={data.gl_account_description} />
                {isCustomer && <SummaryRow label="Sales Reference Org" value={data.sales_reference_orgs?.join(', ')} mono />}
                {isCustomer && <SummaryRow label="Search Term" value={data.customer_search_term} mono />}
                {isCustomer && <SummaryRow label="Company Code" value={data.customer_company_code} mono />}
                {isCustomer && <SummaryRow label="Sales Organization" value={data.sales_organization?.join(', ')} mono />}
                {isCustomer && <SummaryRow label="Distribution Channel" value={data.distribution_channel} />}
                {isCustomer && <SummaryRow label="Division" value={data.division} />}
                {isCustomer && <SummaryRow label="Delivery Plant" value={data.delivery_plant} mono />}
                {isCustomer && <SummaryRow label="Transportation Zone" value={data.transportation_zone} />}
                {!isCustomer && <SummaryRow label="Reference Purchase Orgs" value={data.reference_purchase_orgs?.join(', ')} mono />}
                {!isCustomer && <SummaryRow label="Search Term" value={data.search_term} mono />}
                {!isCustomer && <SummaryRow label="Purchase Org. to Open" value={data.purchase_orgs_to_open} mono />}
                {!isCustomer && <SummaryRow label="Company Code to Open" value={data.company_code_to_open} mono />}
                <SummaryRow label="Payment Terms" value={data.payment_terms} mono />
                {!isCustomer && <SummaryRow label="TDS Codes" value={data.tds_codes} mono />}
              </div>
            </div>

            {/* Documents */}
            {data.documents?.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-title"><div className="card-title-icon">📎</div>Documents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.documents.map((doc) => (
  <div
    key={doc.id}
    style={{
      padding: '10px 12px',
      background: 'var(--success-bg)',
      border: '1px solid #A7F3C5',
      borderRadius: 8
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      <span>📄</span>

      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--success)',
          flex: 1
        }}
      >
        {doc.document_type === 'OTHER' ? (doc.label || 'Additional Document') : doc.document_type}
      </span>

      <span
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--mono)'
        }}
      >
        {doc.original_filename}
      </span>

      {doc.file_url && (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: 'var(--brand)',
            textDecoration: 'underline'
          }}
        >
          View
        </a>
      )}
    </div>

    {/* Show details only for PAN document */}
    {doc.document_type === 'PAN' && (
      <div
        style={{
          marginTop: 8,
          marginLeft: 28,
          fontSize: 12,
          color: 'var(--text)'
        }}
      >
        <div>
          <strong>Name:</strong> {data.company_name || '-'}
        </div>

        <div>
          <strong>PAN Number:</strong> {data.pan_number || '-'}
        </div>
      </div>
    )}
  </div>
))}
                </div>
              </div>
            )}

            {data.status === 'APPROVED' && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3C5', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '.5rem', fontSize: 13, color: 'var(--success)' }}>
                ✅ Approved by <strong>{data.approved_by_email}</strong> on {new Date(data.approved_at).toLocaleString('en-IN')}
                {data.remarks && <div style={{ marginTop: 6, color: 'var(--text)' }}>Remarks: {data.remarks}</div>}
              </div>
            )}
            {data.status === 'REJECTED' && data.remarks && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '.5rem', fontSize: 13, color: 'var(--danger)' }}>
                Rejection Comments: {data.remarks}
              </div>
            )}
            {data.approval_history?.length > 0 && (
              <div className="card" style={{ marginTop: '1rem' }}>
                <div className="card-title"><div className="card-title-icon">#</div>Approval History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.approval_history.map((item) => (
                    <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                      <strong>{item.action}</strong>
                      <span style={{ color: 'var(--muted)' }}> by {item.actor_name || item.actor_email || 'System'} on {new Date(item.created_at).toLocaleString('en-IN')}</span>
                      {item.comments && <div style={{ marginTop: 4 }}>{item.comments}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">Could not load onboarding details.</div>
        )}
      </div>
    </div>

    {showEdit && data && (
      <EditOnboardingModal
        data={data}
        onClose={() => setShowEdit(false)}
        onSaved={handleEditSaved}
      />
    )}
    </>
  )
}
