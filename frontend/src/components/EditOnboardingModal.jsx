import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import MultiEntryField from './MultiEntryField'
import VendorReferenceLookupFields from './VendorReferenceLookupFields'
import PaymentTermsSelect from './PaymentTermsSelect'
import PurchaseOrganizationFields from './PurchaseOrganizationFields'
import CompanyCodeSelect from './CompanyCodeSelect'
import TDSCodeSelect from './TDSCodeSelect'
import SearchTermSelect from './SearchTermSelect'
import { MSME_REGISTERED_OPTIONS, normalizeMsmeCode } from '../constants/msme'
import { validateGstStateCode } from '../constants/gstStateCodes'
import { companyCodeForPurchaseOrg } from '../utils/companyCode'



const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh',
  'Puducherry','Andaman & Nicobar Islands','Dadra & Nagar Haveli','Daman & Diu','Lakshadweep',
]

const BANKS = [
  'State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra Bank',
  'Punjab National Bank','Bank of Baroda','Canara Bank','Union Bank of India',
  'IDFC First Bank','Yes Bank','IndusInd Bank','Federal Bank','UCO Bank',
  'Indian Bank','Central Bank of India','Bank of India','Other',
]

const PAN_RE  = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GST_RE  = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

const PAN_APPROVAL_STATUS = {
  PENDING: 'pending',
  VALID_OPERATIVE: 'valid_operative',
  VALID_INOPERATIVE: 'valid_inoperative',
  FAILED: 'failed',
}

const GST_APPROVAL_STATUS = {
  PENDING: 'pending',
  VALID: 'valid',
  FAILED: 'failed',
}

const hasAny = (value, terms) => {
  const normalized = String(value || '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

const classifyApprovalPanStatus = (record) => {
  const status = record.pan_verification_status
  if (!record.pan_number || !status) return PAN_APPROVAL_STATUS.PENDING
  if (hasAny(status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found'])) return PAN_APPROVAL_STATUS.FAILED
  if (hasAny(status, ['inoperative', 'not operative'])) return PAN_APPROVAL_STATUS.VALID_INOPERATIVE
  if (record.pan_verified || hasAny(status, ['valid'])) return PAN_APPROVAL_STATUS.VALID_OPERATIVE
  return PAN_APPROVAL_STATUS.FAILED
}

const classifyApprovalGstStatus = (record) => {
  const status = record.gst_verification_status
  if (!record.gst_number || !status) return GST_APPROVAL_STATUS.PENDING
  if (
    hasAny(status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found', 'cancelled', 'suspended']) ||
    hasAny(status, ['found but status'])
  ) {
    return GST_APPROVAL_STATUS.FAILED
  }
  if (record.gst_verified || hasAny(status, ['valid'])) return GST_APPROVAL_STATUS.VALID
  return GST_APPROVAL_STATUS.FAILED
}

const getApprovalValidationMessages = (record) => {
  const panStatus = classifyApprovalPanStatus(record)
  const gstStatus = classifyApprovalGstStatus(record)

  if (
    panStatus === PAN_APPROVAL_STATUS.VALID_OPERATIVE &&
    gstStatus === GST_APPROVAL_STATUS.VALID
  ) {
    return []
  }

  if (panStatus === PAN_APPROVAL_STATUS.PENDING && gstStatus === GST_APPROVAL_STATUS.PENDING) {
    return ['Cannot approve vendor. Both PAN and GST verifications are pending. Please complete both verifications before approval.']
  }
  if (panStatus === PAN_APPROVAL_STATUS.FAILED && gstStatus === GST_APPROVAL_STATUS.FAILED) {
    return ['Cannot approve vendor. Both PAN and GST verification have failed. Please correct the details and verify again.']
  }
  if (panStatus === PAN_APPROVAL_STATUS.FAILED && gstStatus === GST_APPROVAL_STATUS.PENDING) {
    return ['Cannot approve vendor. PAN verification has failed and GST verification is still pending. Please correct the PAN details and complete GST verification.']
  }
  if (panStatus === PAN_APPROVAL_STATUS.PENDING && gstStatus === GST_APPROVAL_STATUS.FAILED) {
    return ['Cannot approve vendor. GST verification has failed and PAN verification is still pending. Please complete PAN verification and correct the GST details.']
  }

  const messages = []
  if (panStatus === PAN_APPROVAL_STATUS.PENDING) {
    messages.push('Cannot approve vendor. PAN verification is pending. Please verify the PAN first.')
  } else if (panStatus === PAN_APPROVAL_STATUS.FAILED) {
    messages.push('Cannot approve vendor. PAN verification failed. Please correct the PAN details and verify again.')
  } else if (panStatus === PAN_APPROVAL_STATUS.VALID_INOPERATIVE) {
    messages.push('Cannot approve vendor. The PAN is valid but currently inoperative. Please provide an operative PAN before approval.')
  }

  if (gstStatus === GST_APPROVAL_STATUS.PENDING) {
    messages.push('Cannot approve vendor. GST verification is pending. Please verify the GST first.')
  } else if (gstStatus === GST_APPROVAL_STATUS.FAILED) {
    messages.push('Cannot approve vendor. GST verification failed. Please correct the GST details and verify again.')
  }

  return messages
}

const DOC_TYPES = [
  { type: 'PAN',    label: 'PAN Card',          icon: '🪪' },
  { type: 'GST',    label: 'GST Certificate',    icon: '🧾' },
  { type: 'CHEQUE', label: 'Cancelled Cheque',   icon: '🏦' },
  { type: 'MSME',   label: 'MSME Certificate',   icon: '🏅' },
]

export default function EditOnboardingModal({
  data,
  onClose,
  onSaved
}) {

  const toast = useToast()
  const { user } = useAuth()

  const [saving, setSaving] = useState(false)

  const [errors, setErrors] = useState({})
  const [remarks, setRemarks] = useState(data.remarks || '')
  const [actionLoading, setActionLoading] = useState('')

  const [panVerification, setPanVerification] =
  useState(null)

  const [panLoading, setPanLoading] =
    useState(false)

  // ── form fields ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    company_name:        data.company_name || '',
    contact_person:      data.contact_person || '',
    emails:              data.emails?.length ? [...data.emails] : [''],
    phones:              data.phones?.length ? [...data.phones] : [''],
    district:            data.district || '',
    city:                data.city || '',
    state:               data.state || '',
    pincode:             data.pincode || '',
    date_of_birth: data.date_of_birth || '',
    country:             data.country || 'India',
    street1:             data.street1 || '',
    street2:             data.street2 || '',
    street3:             data.street3 || '',
    street4:             data.street4 || '',
    pan_number:          data.pan_number || '',
    gst_applicable:      data.gst_applicable != null ? data.gst_applicable : null,
    gst_number:          data.gst_number || '',
    account_holder_name: data.account_holder_name || '',
    bank_name:           data.bank_name || '',
    branch_name:         data.branch_name || '',
    account_number:      data.account_number || '',
    ifsc_code:           data.ifsc_code || '',
    msme_applicable:          data.msme_applicable != null ? data.msme_applicable : null,
    msme_category:            normalizeMsmeCode(data.msme_category || data.msme_status || ''),
    udyam_number:             data.udyam_number || '',
    reference_vendor_code:    data.reference_vendor_code || '',
    vendor_reference_range:   data.vendor_reference_range || '',
    reference_name:           data.reference_name || '',
    gl_account_number:        data.gl_account_number || '',
    gl_account_description:   data.gl_account_description || '',
    reference_purchase_orgs:  data.reference_purchase_orgs || [],
    purchase_orgs_to_open:    data.purchase_orgs_to_open || '',
    search_term:              data.search_term || '',
    company_code_to_open:     data.company_code_to_open || '',
    payment_terms:            data.payment_terms || '',
    tds_codes:                data.tds_codes || '',
  })

  // ── document state ───────────────────────────────────────────────
  const [docDocs, setDocDocs] = useState(data.documents ? [...data.documents] : [])
  const [docUploading, setDocUploading] = useState({})

  // ── scan state ───────────────────────────────────────────────────
  const [scanning, setScanning]       = useState({})
  const [scanResults, setScanResults] = useState({})

  const validateLiveTaxFields = (nextForm) => {
    const nextErrors = {}
    const pan = String(nextForm.pan_number || '').toUpperCase()
    const gst = String(nextForm.gst_number || '').toUpperCase()

    if (!nextForm.state) nextErrors.state = 'State is required.'
    if (!pan || !PAN_RE.test(pan)) nextErrors.pan_number = 'Invalid PAN format. Expected: ABCDE1234F'
    if (nextForm.gst_applicable === null) nextErrors.gst_applicable = 'Please select GST status.'
    if (nextForm.gst_applicable) {
      if (!gst || !GST_RE.test(gst)) {
        nextErrors.gst_number = 'Invalid GST format. Expected 15-character GSTIN.'
      } else if (pan && gst.substring(2, 12) !== pan) {
        nextErrors.gst_number = 'GST does not match PAN (characters 3-12 must equal PAN).'
      } else {
        const stateCodeError = validateGstStateCode(nextForm.state, gst)
        if (stateCodeError) nextErrors.gst_number = stateCodeError
      }
    }

    return nextErrors
  }

  const set = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (['state', 'pan_number', 'gst_applicable', 'gst_number'].includes(key)) {
        const liveErrors = validateLiveTaxFields(next)
        setErrors((currentErrors) => {
          const cleaned = { ...currentErrors }
          delete cleaned.state
          delete cleaned.pan_number
          delete cleaned.gst_applicable
          delete cleaned.gst_number
          return { ...cleaned, ...liveErrors }
        })
      }
      return next
    })
  }
  const setCreatedPurchaseOrgs = (value) => {
    const selectedValues = Array.isArray(value) ? value : []
    const firstSelectedValue = selectedValues[0] || ''
    setForm((f) => ({
      ...f,
      purchase_orgs_to_open: selectedValues.join(', '),
      reference_purchase_orgs: selectedValues,
      company_code_to_open: companyCodeForPurchaseOrg(firstSelectedValue),
    }))
  }
  const applyVendorReferenceMapping = (mapping) => {
    setForm((f) => ({
      ...f,
      vendor_reference_range: mapping ? mapping.vendor_reference_range : '',
      reference_name: mapping ? mapping.reference_name : '',
      gl_account_number: mapping ? mapping.gl_account_number : '',
      gl_account_description: mapping ? mapping.gl_account_description : '',
    }))
  }

  const requiredDocTypes = () => [
    'PAN',
    ...(form.gst_applicable ? ['GST'] : []),
    'CHEQUE',
    ...(form.msme_applicable ? ['MSME'] : []),
  ]

  const validateDocuments = () => {
    const docErrors = {}
    const messages = {
      PAN: 'PAN Card document is required.',
      GST: 'GST Certificate is required.',
      CHEQUE: 'Cancelled cheque is required.',
      MSME: 'MSME Certificate is required.',
    }
    requiredDocTypes().forEach((type) => {
      if (!docDocs.some((doc) => doc.document_type === type)) {
        docErrors[`${type.toLowerCase()}_doc`] = messages[type]
      }
    })
    return docErrors
  }

  // ── validation ───────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.company_name.trim()) e.company_name = 'Company name is required.'
    if (!form.emails.filter(Boolean).length) e.emails = 'At least one email is required.'
    if (!form.phones.filter(Boolean).length) e.phones = 'At least one phone number is required.'
    if (!form.city.trim()) e.city = 'City is required.'
    if (!form.state) e.state = 'State is required.'
    if (!form.street1.trim()) e.street1 = 'Street address is required.'
    if (!form.pan_number || !PAN_RE.test(form.pan_number.toUpperCase()))
      e.pan_number = 'Invalid PAN format. Expected: ABCDE1234F'
    if (form.gst_applicable === null) e.gst_applicable = 'Please select GST status.'
    if (form.gst_applicable && (!form.gst_number || !GST_RE.test(form.gst_number.toUpperCase())))
      e.gst_number = 'Invalid GST format. Expected 15-character GSTIN.'
    if (form.gst_applicable && form.pan_number && form.gst_number &&
        form.gst_number.substring(2, 12).toUpperCase() !== form.pan_number.toUpperCase())
      e.gst_number = 'GST does not match PAN (characters 3–12 must equal PAN).'
    if (form.gst_applicable && form.gst_number && !e.gst_number) {
      const stateCodeError = validateGstStateCode(form.state, form.gst_number)
      if (stateCodeError) e.gst_number = stateCodeError
    }
    if (!form.account_holder_name.trim()) e.account_holder_name = 'Account holder name is required.'
    if (!form.bank_name) e.bank_name = 'Bank name is required.'
    if (!form.branch_name.trim()) e.branch_name = 'Branch name is required.'
    if (!form.account_number.trim()) e.account_number = 'Account number is required.'
    if (!form.ifsc_code || !IFSC_RE.test(form.ifsc_code.toUpperCase()))
      e.ifsc_code = 'Invalid IFSC format. Expected: ABCD0123456'
    if (form.pincode && form.pincode.length !== 6) e.pincode = 'PIN must be 6 digits.'
    if (form.msme_applicable === null) e.msme_applicable = 'Please select MSME status.'
    if (form.msme_applicable) {
      if (!form.msme_category) e.msme_category = 'MSME category is required.'
      if (!form.udyam_number.trim()) e.udyam_number = 'Udyam registration number is required.'
    }
    Object.assign(e, validateDocuments())
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── save form fields ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.patch(`/onboarding/${data.id}/`, {
        company_name:        form.company_name,
        contact_person:      form.contact_person,
        emails:              form.emails.filter(Boolean),
        phones:              form.phones.filter(Boolean),
        date_of_birth:       form.date_of_birth,
        district:            form.district,
        city:                form.city,
        state:               form.state,
        pincode:             form.pincode,
        country:             form.country,
        street1:             form.street1,
        street2:             form.street2,
        street3:             form.street3,
        street4:             form.street4,
        pan_number:          form.pan_number ? form.pan_number.toUpperCase() : '',
        gst_applicable:      form.gst_applicable ?? false,
        gst_number:          form.gst_applicable ? (form.gst_number ? form.gst_number.toUpperCase() : '') : '',
        account_holder_name: form.account_holder_name,
        bank_name:           form.bank_name,
        branch_name:         form.branch_name,
        account_number:      form.account_number,
        ifsc_code:           form.ifsc_code ? form.ifsc_code.toUpperCase() : '',
        msme_applicable:          form.msme_applicable ?? false,
        msme_status:              form.msme_applicable ? normalizeMsmeCode(form.msme_category) : 'MNA',
        msme_category:            form.msme_applicable ? normalizeMsmeCode(form.msme_category) : '',
        udyam_number:             form.msme_applicable ? form.udyam_number : '',
        reference_vendor_code:    form.reference_vendor_code,
        vendor_reference_range:   form.vendor_reference_range,
        reference_name:           form.reference_name,
        gl_account_number:        form.gl_account_number,
        gl_account_description:   form.gl_account_description,
        reference_purchase_orgs:  form.reference_purchase_orgs,
        purchase_orgs_to_open:    form.purchase_orgs_to_open,
        search_term:              form.search_term,
        company_code_to_open:     form.company_code_to_open,
        payment_terms:            form.payment_terms,
        tds_codes:                form.tds_codes,
      })
      toast.success('Saved', 'Details updated successfully.')
      onSaved()
    } catch (err) {
      const errData = err.response?.data
      if (errData && typeof errData === 'object' && !errData.detail) {
        setErrors(errData)
        toast.error('Validation error', 'Please fix the highlighted fields.')
      } else {
        toast.error('Failed', errData?.detail || 'Could not save changes.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── document helpers ─────────────────────────────────────────────
  const handleApprove = async () => {
    const approvalRecord = {
      ...data,
      pan_number: form.pan_number,
      gst_number: form.gst_number,
      pan_verified: panVerification?.verified ?? data.pan_verified,
      pan_verification_status: panVerification?.verification_status ?? data.pan_verification_status,
      gst_verified: gstVerification?.verified ?? data.gst_verified,
      gst_verification_status: gstVerification?.verification_status ?? data.gst_verification_status,
    }
    const approvalMessages = getApprovalValidationMessages(approvalRecord)
    if (approvalMessages.length) {
      toast.error('Approval blocked', approvalMessages.join(' '))
      return
    }

    const docErrors = validateDocuments()
    if (Object.keys(docErrors).length) {
      setErrors((prev) => ({ ...prev, ...docErrors }))
      toast.error('Documents required', 'Please upload the required documents before approval.')
      return
    }

    setActionLoading('approve')
    try {
      await api.post(`/onboarding/${data.id}/approve/`, { remarks })
      toast.success('Approved', 'Vendor has been successfully approved.')
      onSaved()
    } catch (err) {
      const responseData = err.response?.data
      const approvalError = Array.isArray(responseData?.messages)
        ? responseData.messages.join(' ')
        : responseData?.detail
      toast.error('Failed', approvalError || 'Could not approve.')
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
      await api.post(`/onboarding/${data.id}/reject/`, { remarks })
      toast.success('Rejected', 'Onboarding has been rejected.')
      onSaved()
    } catch (err) {
      toast.error('Failed', err.response?.data?.detail || 'Could not reject.')
    } finally {
      setActionLoading('')
    }
  }

  const handleResend = async () => {
    setActionLoading('resend')
    try {
      await api.post(`/onboarding/${data.id}/resend-invite/`)
      toast.success('Invite resent', 'A new invite email was sent.')
      onSaved()
    } catch (err) {
      toast.error('Failed', err.response?.data?.detail || 'Could not resend.')
    } finally {
      setActionLoading('')
    }
  }

  const validateDocFile = (file) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type', 'Only PDF, JPG, and PNG are allowed.')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', 'File must be under 10 MB.')
      return false
    }
    return true
  }

  const handleDocUpload = async (docType, file) => {
    if (!file || !validateDocFile(file)) return
    setDocUploading((p) => ({ ...p, [docType]: true }))
    try {
      const fd = new FormData()
      fd.append('document_type', docType)
      fd.append('file', file)
      const { data: newDoc } = await api.post(`/documents/admin/${data.id}/`, fd, {
        headers: { 'Content-Type': undefined },
      })
      setDocDocs((prev) => [...prev.filter((d) => d.document_type !== docType), newDoc])
      toast.success('Uploaded', `${docType} document updated.`)
    } catch (err) {
      toast.error('Upload failed', err.response?.data?.detail || 'Could not upload file.')
    } finally {
      setDocUploading((p) => ({ ...p, [docType]: false }))
    }
  }

  const handleScanDoc = async (docId, docType) => {
    setScanning((p) => ({ ...p, [docType]: true }))
    try {
      const { data } = await api.post(`/documents/scan/${docId}/`)
      const ex = data.extracted_data || {}
      setScanResults((p) => ({ ...p, [docType]: ex }))

      // auto-fill the form field that matches this document
      if (docType === 'PAN'  && ex.pan_number)   set('pan_number', String(ex.pan_number).toUpperCase())
      if (docType === 'GST'  && ex.gstin)        set('gst_number', String(ex.gstin).toUpperCase())
      if (docType === 'MSME' && ex.udyam_number) set('udyam_number', String(ex.udyam_number).toUpperCase())

      toast.success('Scanned', `${docType} details extracted.`)
    } catch (err) {
      toast.error('Scan failed', err.response?.data?.detail || 'Could not extract details.')
    } finally {
      setScanning((p) => ({ ...p, [docType]: false }))
    }
  }

  const handleVerifyPan = async () => {

    if (!form.pan_number) {

      toast.error(
        "Validation Error",
        "Please enter PAN Number"
      )

      return
    }

    setPanLoading(true)

    try {

      const response = await api.post(
        "/onboarding/verify-pan/",
        {
          onboarding_id: data.id,
          pan_number: form.pan_number,
          date_of_birth: form.date_of_birth,
          name: form.company_name
        }
      )

      setPanVerification(response.data)

      if (response.data.verified) {

        toast.success(
          "Success",
          response.data.verification_status
        )

      } else {

        toast.error(
          "Failed",
          response.data.verification_status
        )
      }

    } catch (error) {

      toast.error(
        "Error",
        error.response?.data?.error ||
        "PAN Verification Failed"
      )

    } finally {

      setPanLoading(false)

    }
  }

  const [gstVerification, setGstVerification] = useState(null)
  const [gstLoading, setGstLoading] = useState(false)

  const handleVerifyGst = async () => {
    const liveErrors = validateLiveTaxFields(form)
    if (liveErrors.gst_number) {
      setErrors((prev) => ({ ...prev, ...liveErrors }))
      toast.error("Validation Error", liveErrors.gst_number)
      return
    }

    setGstLoading(true)
    try {
      const response = await api.post("/onboarding/verify-gst/", {
        onboarding_id: data.id,
        gst_number: form.gst_number
      })

      setGstVerification(response.data)

      if (response.data.verified) {
        toast.success("Success", response.data.verification_status)
      } else {
        toast.error("Failed", response.data.verification_status)
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.error || "GST Verification Failed"
      )
    } finally {
      setGstLoading(false)
    }
  }

  const handleDocDelete = async (docType) => {
    try {
      await api.delete(`/documents/admin/${data.id}/?type=${docType}`)
      setDocDocs((prev) => prev.filter((d) => d.document_type !== docType))
      toast.success('Removed', `${docType} document removed.`)
    } catch {
      toast.error('Failed', 'Could not remove document.')
    }
  }

  const entityType = data.onboarding_type === 'VENDOR' ? 'Vendor' : 'Customer'
  const canApprove = ['ADMIN', 'BOSS'].includes(user?.role)
  const canSave = user?.role === 'ADMIN' || (user?.role === 'EMPLOYEE' && data.status === 'DRAFT')

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel edit-panel">

        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
              Edit — {data.onboarding_code}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {entityType} Registration Details
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Company & Contact ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🏢</div>Company & Contact</div>
          <div className="grid-2">
            <div className="field span-2">
              <label>{entityType} / Company Name <span className="req">*</span></label>
              <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)}
                placeholder="e.g. Acme Technologies Pvt. Ltd." className={errors.company_name ? 'error' : ''} />
              {errors.company_name && <span className="field-error">{errors.company_name}</span>}
            </div>
            <div className="field span-2">
              <label>Contact Person</label>
              <input type="text" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="Full name" />
            </div>
            <div className="field span-2">
              <label>Email Address(es) <span className="req">*</span></label>
              <MultiEntryField type="email" values={form.emails} onChange={(v) => set('emails', v)} placeholder="contact@company.com" tag="Email" />
              {errors.emails && <span className="field-error">{errors.emails}</span>}
            </div>
            <div className="field span-2">
              <label>Phone Number(s)</label>
              <MultiEntryField
                type="tel"
                values={form.phones}
                onChange={(v) => set('phones', v)}
                placeholder="+91 98765 43210"
                tag="Phone"
              />
        </div>
        </div></div>

        {/* ── Address ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">📍</div>Registered Address</div>
          <div className="grid-2">
            <div className="field">
              <label>District</label>
              <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="District" />
            </div>
            <div className="field">
              <label>City</label>
              <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" />
            </div>
            <div className="field">
              <label>State</label>
              <select value={form.state} onChange={(e) => set('state', e.target.value)} className={errors.state ? 'error' : ''}>
                <option value="">— Select state —</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <span className="field-error">{errors.state}</span>}
            </div>
            <div className="field">
              <label>PIN Code</label>
              <input type="text" value={form.pincode}
                onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN" className={errors.pincode ? 'error' : ''} />
              {errors.pincode && <span className="field-error">{errors.pincode}</span>}
            </div>
            <div className="field">
              <label>Country</label>
              <input type="text" value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
            <div className="field span-2">
              <label>Street / House No.</label>
              <input type="text" value={form.street1} onChange={(e) => set('street1', e.target.value)} maxLength={35} placeholder="Building / Plot No., Street Name" />
            </div>
            <div className="field">
              <label>Street 2</label>
              <input type="text" value={form.street2} onChange={(e) => set('street2', e.target.value)} maxLength={40} placeholder="Area or Locality" />
            </div>
            <div className="field">
              <label>Street 3</label>
              <input type="text" value={form.street3} onChange={(e) => set('street3', e.target.value)} maxLength={40} placeholder="Landmark (optional)" />
            </div>
            <div className="field span-2">
              <label>Street 4</label>
              <input type="text" value={form.street4} onChange={(e) => set('street4', e.target.value)} maxLength={40} placeholder="Additional detail (optional)" />
            </div>
          </div>
        </div>

        {/* ── Tax & Compliance ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🏛️</div>Tax & Compliance</div>
          <div className="grid-2">
            <div className="field span-2">
              <label>Date of Birth/Commencement</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set('date_of_birth', e.target.value)}
              />
            </div>
            <div className="field span-2">
  <label>PAN Number</label>

  <div style={{ display: 'flex', gap: '8px' }}>
    <input
      type="text"
      value={form.pan_number}
      onChange={(e) =>
        set('pan_number', e.target.value.toUpperCase().slice(0, 10))
      }
      placeholder="ABCDE1234F"
      maxLength={10}
      style={{
        flex: 1,
        textTransform: 'uppercase',
        fontFamily: 'var(--mono)'
      }}
      className={errors.pan_number ? 'error' : ''}
    />

  <button
    type="button"
    className="btn btn-verify"
    onClick={handleVerifyPan}
  >
    ✓ Verify PAN
  </button>
  </div>

  {panVerification && (

  <div
    style={{
      marginTop: "14px",
      borderRadius: "12px",
      border: panVerification.verified
        ? "1px solid #22c55e"
        : "1px solid #ef4444",
      background: panVerification.verified
        ? "#f0fdf4"
        : "#fef2f2",
      padding: "16px",
      display: "flex",
      gap: "14px",
      alignItems: "flex-start"
    }}
  >

    <div
      style={{
        fontSize: "28px"
      }}
    >
      {panVerification.verified
        ? "✅"
        : "❌"}
    </div>

    <div style={{ flex: 1 }}>

      <div
        style={{
          fontWeight: 700,
          fontSize: "15px",
          color: panVerification.verified
            ? "#166534"
            : "#991b1b"
        }}
      >
        {panVerification.verified
          ? "PAN Verified Successfully"
          : "PAN Verification Failed"}
      </div>

      <div
        style={{
          marginTop: "6px",
          color: "#475569",
          fontSize: "13px"
        }}
      >
        {panVerification.verification_status}
      </div>

      {panVerification?.sandbox_response?.data && (

        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: "10px"
          }}
        >

          <div>
            <strong>PAN</strong>
            <div>
              {panVerification.sandbox_response.data.pan}
            </div>
          </div>

          <div>
            <strong>Category</strong>
            <div>
              {panVerification.sandbox_response.data.category}
            </div>
          </div>

          <div>
            <strong>Aadhaar Status</strong>
            <div>
              {panVerification.sandbox_response.data
                .aadhaar_seeding_status === "y"
                ? "Linked"
                : "Not Linked"}
            </div>
          </div>

          <div>
            <strong>Status</strong>
            <div>
              {panVerification.sandbox_response.data.status}
            </div>
          </div>

        </div>
      )}

    </div>

  </div>
)}



  <span className="hint">
    Format: 5 letters + 4 digits + 1 letter
  </span>

  {errors.pan_number && (
    <span className="field-error">{errors.pan_number}</span>
  )}
</div>
            <div className="field span-2">
              <label>GST Applicable?</label>
              <div className="toggle-group" style={{ marginTop: 6 }}>
                <div className="toggle-opt">
                  <input type="radio" id="edit-gst-yes" name="edit-gst" checked={form.gst_applicable === true} onChange={() => set('gst_applicable', true)} />
                  <label htmlFor="edit-gst-yes">Yes — Has GST Number</label>
                </div>
                <div className="toggle-opt">
                  <input type="radio" id="edit-gst-no" name="edit-gst" checked={form.gst_applicable === false} onChange={() => set('gst_applicable', false)} />
                  <label htmlFor="edit-gst-no">No — Not Registered</label>
                </div>
              </div>
            </div>
            {form.gst_applicable && (
  <div className="field span-2">
    <label>GST Number</label>

    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={form.gst_number}
        onChange={(e) => set('gst_number', e.target.value.toUpperCase().slice(0, 15))}
        placeholder="22ABCDE1234F1Z5"
        maxLength={15}
        style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
        className={errors.gst_number ? 'error' : ''}
      />
      <button
        type="button"
        className="btn btn-verify"
        onClick={handleVerifyGst}
        disabled={gstLoading}
      >
        {gstLoading ? 'Verifying…' : '✓ Verify GST'}
      </button>
    </div>

    {gstVerification && (
      <div style={{
        marginTop: "14px", borderRadius: "12px",
        border: gstVerification.verified ? "1px solid #22c55e" : "1px solid #ef4444",
        background: gstVerification.verified ? "#f0fdf4" : "#fef2f2",
        padding: "16px", display: "flex", gap: "14px", alignItems: "flex-start"
      }}>
        <div style={{ fontSize: "28px" }}>
          {gstVerification.verified ? "✅" : "❌"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 700, fontSize: "15px",
            color: gstVerification.verified ? "#166534" : "#991b1b"
          }}>
            {gstVerification.verified ? "GST Verified Successfully" : "GST Verification Failed"}
          </div>
          <div style={{ marginTop: "6px", color: "#475569", fontSize: "13px" }}>
            {gstVerification.verification_status}
          </div>

          {gstVerification?.sandbox_response?.data?.data && (
            <div style={{
              marginTop: "12px", display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "10px"
            }}>
              <div>
                <strong>Legal Name</strong>
                <div>{gstVerification.sandbox_response.data.data.lgnm}</div>
              </div>
              <div>
                <strong>Trade Name</strong>
                <div>{gstVerification.sandbox_response.data.data.tradeNam}</div>
              </div>
              <div>
                <strong>Constitution</strong>
                <div>{gstVerification.sandbox_response.data.data.ctb}</div>
              </div>
              <div>
                <strong>Status</strong>
                <div>{gstVerification.sandbox_response.data.data.sts}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    <span className="hint">15-character GSTIN</span>
    {errors.gst_number && <span className="field-error">{errors.gst_number}</span>}
  </div>
)}
            
          </div>
        </div>

        {/* ── Bank Account ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🏦</div>Bank Account Details</div>
          <div className="grid-2">
            <div className="field span-2">
              <label>Account Holder Name <span className="req">*</span></label>
              <input type="text" value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder="As per bank records" className={errors.account_holder_name ? 'error' : ''} />
              {errors.account_holder_name && <span className="field-error">{errors.account_holder_name}</span>}
            </div>
            <div className="field">
              <label>Bank Name <span className="req">*</span></label>
              <select value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={errors.bank_name ? 'error' : ''}>
                <option value="">— Select bank —</option>
                {BANKS.map((b) => <option key={b}>{b}</option>)}
              </select>
              {errors.bank_name && <span className="field-error">{errors.bank_name}</span>}
            </div>
            <div className="field">
              <label>Branch Name <span className="req">*</span></label>
              <input type="text" value={form.branch_name} onChange={(e) => set('branch_name', e.target.value)} placeholder="Branch" className={errors.branch_name ? 'error' : ''} />
              {errors.branch_name && <span className="field-error">{errors.branch_name}</span>}
            </div>
            <div className="field">
              <label>Account Number <span className="req">*</span></label>
              <input type="text" value={form.account_number}
                onChange={(e) => set('account_number', e.target.value.replace(/\D/g, ''))}
                placeholder="Account number" style={{ fontFamily: 'var(--mono)' }} className={errors.account_number ? 'error' : ''} />
              {errors.account_number && <span className="field-error">{errors.account_number}</span>}
            </div>
            <div className="field">
              <label>IFSC Code <span className="req">*</span></label>
              <input type="text" value={form.ifsc_code}
                onChange={(e) => set('ifsc_code', e.target.value.toUpperCase().slice(0, 11))}
                placeholder="SBIN0001234" maxLength={11}
                style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                className={errors.ifsc_code ? 'error' : ''} />
              <span className="hint">Format: 4 letters + 0 + 6 alphanumeric</span>
              {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
            </div>
          </div>
        </div>

        {/* ── MSME ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🏅</div>MSME Status</div>
          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>MSME Registered?</label>
            <div className="toggle-group" style={{ marginTop: 6 }}>
              <div className="toggle-opt">
                <input type="radio" id="edit-msme-yes" name="edit-msme" checked={form.msme_applicable === true} onChange={() => set('msme_applicable', true)} />
                <label htmlFor="edit-msme-yes">Yes — MSME Registered</label>
              </div>
              <div className="toggle-opt">
                <input type="radio" id="edit-msme-no" name="edit-msme" checked={form.msme_applicable === false} onChange={() => set('msme_applicable', false)} />
                <label htmlFor="edit-msme-no">No — Not Registered (MNA)</label>
              </div>
            </div>
          </div>
          {form.msme_applicable && (
            <div className="grid-2">
              <div className="field">
                <label>MSME Category</label>
                <select value={form.msme_category} onChange={(e) => set('msme_category', e.target.value)}>
                  <option value="">— Select —</option>
                  {MSME_REGISTERED_OPTIONS.map(({ code, description }) => (
                    <option key={code} value={code}>{code} - {description}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Udyam Number</label>
                <input type="text" value={form.udyam_number}
                  onChange={(e) => set('udyam_number', e.target.value.toUpperCase())}
                  placeholder="UDYAM-XX-00-0000000"
                  style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── SAP / ERP Reference Details ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🔗</div>SAP / ERP Reference Details</div>
          <div className="grid-2">
            <VendorReferenceLookupFields
              code={form.reference_vendor_code}
              onCodeChange={(value) => set('reference_vendor_code', value)}
              onRangeChange={(value) => set('vendor_reference_range', value)}
              onMappingChange={applyVendorReferenceMapping}
            />
            <PurchaseOrganizationFields
              referenceValue={form.reference_purchase_orgs}
              onReferenceChange={(value) => set('reference_purchase_orgs', value)}
              openValue={form.purchase_orgs_to_open}
              onOpenChange={setCreatedPurchaseOrgs}
              searchTermField={
                <div className="field">
                  <label>Search Term</label>
                  <SearchTermSelect value={form.search_term} onChange={(value) => set('search_term', value)} />
                </div>
              }
              companyCodeField={
                <div className="field">
                  <label>Company Code (In which to be opened)</label>
                  <CompanyCodeSelect
                    value={form.company_code_to_open}
                    onChange={(value) => set('company_code_to_open', value)}
                    disabled={!!form.reference_purchase_orgs.length}
                  />
                </div>
              }
            />
            <div className="field">
              <label>Payment Terms</label>
              <select value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}>
                <option value="">— Select —</option>
                <PaymentTermsSelect />
              </select>
            </div>
            <div className="field">
              <label>TDS Codes</label>
              <TDSCodeSelect value={form.tds_codes} onChange={(value) => set('tds_codes', value)} />
            </div>
          </div>
        </div>

        {/* ── Documents ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">
            <div className="card-title-icon">📎</div>Documents
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontWeight: 400 }}>
              PDF, JPG, PNG · Max 10 MB · Uploads apply immediately
            </span>
          </div>
          <div className="doc-section">
            {DOC_TYPES.map(({ type, label, icon }) => {
              const existing = docDocs.find((d) => d.document_type === type)
              const uploading = docUploading[type]
              const isRequired = requiredDocTypes().includes(type)
              const docError = errors[`${type.toLowerCase()}_doc`]
              return (
                <div key={type} className="doc-card">
                  <div className="doc-card-head">
                    <div className="doc-card-title">{icon} {label}</div>
                    {isRequired && (
                      <span className="badge badge-required">Required</span>
                    )}
                    {existing && !uploading && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#DCFCE7', color: '#166534', textTransform: 'uppercase', letterSpacing: '.3px' }}>
                        Uploaded
                      </span>
                    )}
                  </div>

                  {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 13, color: 'var(--muted)' }}>
                      <div className="spinner" style={{ width: 16, height: 16, borderColor: 'var(--border-2)', borderTopColor: 'var(--brand)' }} />
                      Uploading…
                    </div>
                  ) : existing ? (
                    <>
                      <div className="file-selected" style={{ marginBottom: 8 }}>
                        <span>📄</span>
                        <span className="file-name">{existing.original_filename || type}</span>
                        {existing.file_url && (
                          <a href={existing.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'underline' }}>
                            View
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <label style={{
                          cursor: 'pointer', fontSize: 11, color: 'var(--brand)', fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '3px 10px', background: 'var(--brand-light)',
                          borderRadius: 6, border: '1px solid rgba(26,86,219,.15)',
                        }}>
                          Replace
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(type, f); e.target.value = '' }} />
                        </label>
                        <button
                          onClick={() => handleDocDelete(type)}
                          style={{
                            fontSize: 11, color: 'var(--danger)', fontWeight: 600, cursor: 'pointer',
                            padding: '3px 10px', background: 'var(--danger-bg)',
                            border: '1px solid rgba(185,28,28,.15)', borderRadius: 6,
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      {/* ── Scan button ── */}
                      <button
                        type="button"
                        onClick={() => handleScanDoc(existing.id, type)}
                        disabled={scanning[type]}
                        style={{
                          marginTop: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          padding: '3px 10px', color: 'var(--brand)',
                          background: 'var(--brand-light)', borderRadius: 6,
                          border: '1px solid rgba(26,86,219,.15)',
                        }}
                      >
                        {scanning[type] ? 'Scanning…' : '✨ Scan details'}
                      </button>

                      {/* ── Extracted fields ── */}
                      {scanResults[type] && (
                        <div style={{
                          marginTop: 8, padding: 10, borderRadius: 8,
                          background: 'var(--bg)', border: '1px solid var(--border-2)',
                          fontSize: 12, lineHeight: 1.6,
                        }}>
                          {Object.entries(scanResults[type]).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 6 }}>
                              <span style={{ color: 'var(--muted)', minWidth: 120, textTransform: 'capitalize' }}>
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontWeight: 500, fontFamily: 'var(--mono)' }}>
                                {v == null ? '—' : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="file-upload-zone" style={{ padding: 14 }}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(type, f); e.target.value = '' }} />
                      <div className="file-icon" style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                      <div className="file-label"><span>Click to upload</span> or drag & drop</div>
                      <div className="file-sub">PDF, JPG, PNG · Max 10 MB</div>
                    </div>
                  )}
                  {docError && <span className="field-error">{docError}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer ── */}
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
              <button className="btn btn-success" onClick={handleApprove} disabled={!!actionLoading || saving}>
                {actionLoading === 'approve' ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Approving…</> : '✅ Approve'}
              </button>
              <button className="btn btn-danger" onClick={handleReject} disabled={!!actionLoading || saving}>
                {actionLoading === 'reject' ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Rejecting…</> : '❌ Reject'}
              </button>
              {user?.role === 'ADMIN' && (
                <button className="btn btn-secondary" onClick={handleResend} disabled={!!actionLoading || saving}>
                  {actionLoading === 'resend' ? 'Sending…' : 'Resend Invite'}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          paddingTop: '1rem', paddingBottom: '0.5rem',
          borderTop: '1px solid var(--border)',
          position: 'sticky', bottom: 0, background: 'var(--surface)',
        }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          {canSave && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Saving…</>
              : 'Save Changes'
            }
          </button>
          )}
        </div>

      </div>
    </div>
  )
}
