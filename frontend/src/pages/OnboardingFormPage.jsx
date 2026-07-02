import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import MultiEntryField from '../components/MultiEntryField'
import FileUploadField from '../components/FileUploadField'
import { MSME_REGISTERED_OPTIONS, formatMsmeOption, normalizeMsmeCode } from '../constants/msme'
import { validateGstStateCode } from '../constants/gstStateCodes'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Tax & Bank' },
  { id: 3, label: 'MSME & Docs' },
  { id: 4, label: 'Review' },
]

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

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

function validatePanGst(pan, gst) {
  if (!pan || !gst) return null
  return gst.substring(2, 12).toUpperCase() === pan.toUpperCase() ? 'match' : 'no-match'
}

function getEntityType(tokenPayload, search = '') {
  const onboarding = tokenPayload?.onboarding
  const queryType = new URLSearchParams(search).get('type')
  const code = String(onboarding?.onboarding_code || tokenPayload?.onboarding_code || '').trim().toUpperCase()
  if (code.startsWith('V')) return 'Vendor'
  if (code.startsWith('C')) return 'Customer'

  const type = String(
    onboarding?.onboarding_type ||
    tokenPayload?.onboarding_type ||
    tokenPayload?.entity_type ||
    queryType ||
    ''
  ).trim().toUpperCase()
  if (type === 'VENDOR') return 'Vendor'
  if (type === 'CUSTOMER') return 'Customer'
  if (type === 'VENDOR ONBOARDING') return 'Vendor'
  if (type === 'CUSTOMER ONBOARDING') return 'Customer'

  return 'Business Partner'
}

export default function OnboardingFormPage() {
  const { token } = useParams()
  const location = useLocation()
  const [tokenData, setTokenData] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Form state
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    emails: [''],
    phones: [''],
    district: '',
    city: '',
    state: '',
  
    pincode: '',
    country: 'India',
    street1: '',
    street2: '',
    street3: '',
    street4: '',
    pan_number: '',
    gst_applicable: null,
    gst_number: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    msme_applicable: null,
    msme_category: '',
    udyam_number: '',
  })

  const [files, setFiles] = useState({ PAN: null, GST: null, CHEQUE: null, MSME: null })

  useEffect(() => {
    axios.get(`/api/v1/onboarding/form/${token}/`)
      .then(({ data }) => {
        setTokenData(data)
        const ob = data.onboarding
        if (ob) {
          setForm((prev) => ({
            ...prev,
            company_name: ob.company_name || '',
            contact_person: ob.contact_person || '',
            emails: ob.emails?.length ? ob.emails : [''],
            phones: ob.phones?.length ? ob.phones : [''],
            district: ob.district || '',
            city: ob.city || '',
            state: ob.state || '',
            pincode: ob.pincode || '',
            date_of_birth:ob.date_of_birth || "",
            country: ob.country || 'India',
            street1: ob.street1 || '',
            street2: ob.street2 || '',
            street3: ob.street3 || '',
            street4: ob.street4 || '',
            pan_number: ob.pan_number || '',
            gst_applicable: ob.gst_applicable != null ? ob.gst_applicable : null,
            gst_number: ob.gst_number || '',
            account_holder_name: ob.account_holder_name || '',
            bank_name: ob.bank_name || '',
            branch_name: ob.branch_name || '',
            account_number: ob.account_number || '',
            ifsc_code: ob.ifsc_code || '',
            msme_applicable: ob.msme_applicable != null ? ob.msme_applicable : null,
            msme_category: normalizeMsmeCode(ob.msme_category || ob.msme_status || ''),
            udyam_number: ob.udyam_number || '',
          }))
        }
      })
      .catch((err) => {
        setTokenError(err.response?.data?.detail || 'Invalid or expired link.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const entityType = getEntityType(tokenData, location.search)
  const registrationTitle = `${entityType} Registration`
  const isApproved = tokenData?.onboarding?.status === 'APPROVED'
  const hasDocument = (docType, nextFiles = files) => Boolean(nextFiles[docType] || tokenData?.onboarding?.documents?.some((doc) => doc.document_type === docType))

  const validateForm = (nextForm = form, nextFiles = files, nextTouched = touched, showAll = submitAttempted) => {
    const e = {}
    const shouldRequire = (field) => showAll || nextTouched[field]

    if (shouldRequire('company_name') && !nextForm.company_name.trim()) e.company_name = 'Company name is required.'
    if (shouldRequire('emails') && !nextForm.emails.filter(Boolean).length) e.emails = 'At least one email is required.'
    if (shouldRequire('phones') && !nextForm.phones.filter(Boolean).length) e.phones = 'At least one phone number is required.'
    if (shouldRequire('district') && !nextForm.district.trim()) e.district = 'District is required.'
    if (shouldRequire('city') && !nextForm.city.trim()) e.city = 'City is required.'
    if (shouldRequire('state') && !nextForm.state) e.state = 'State is required.'
    if (shouldRequire('pincode') && (!nextForm.pincode || nextForm.pincode.length !== 6)) e.pincode = '6-digit PIN code is required.'
    if (shouldRequire('street1') && !nextForm.street1.trim()) e.street1 = 'Street address is required.'

    const pan = nextForm.pan_number.toUpperCase()
    if (!pan) {
      if (shouldRequire('pan_number')) e.pan_number = 'Invalid PAN format. Expected: ABCDE1234F'
    } else if (!PAN_RE.test(pan)) {
      e.pan_number = 'Invalid PAN format. Expected: ABCDE1234F'
    }

    if (shouldRequire('gst_applicable') && nextForm.gst_applicable === null) e.gst_applicable = 'Please select GST status.'
    if (nextForm.gst_applicable) {
      const gst = nextForm.gst_number.toUpperCase()
      if (!gst) {
        if (shouldRequire('gst_number')) e.gst_number = 'Invalid GST Number format.'
      } else if (!GST_RE.test(gst)) {
        e.gst_number = 'Invalid GST Number format.'
      } else if (pan && gst.substring(2, 12) !== pan) {
        e.gst_number = 'GST number does not match PAN.'
      } else {
        const stateCodeError = validateGstStateCode(nextForm.state, gst)
        if (stateCodeError) e.gst_number = stateCodeError
      }
    }

    if (shouldRequire('account_holder_name') && !nextForm.account_holder_name.trim()) e.account_holder_name = 'Account holder name is required.'
    if (shouldRequire('bank_name') && !nextForm.bank_name) e.bank_name = 'Bank name is required.'
    if (shouldRequire('branch_name') && !nextForm.branch_name.trim()) e.branch_name = 'Branch name is required.'
    if (shouldRequire('account_number') && !nextForm.account_number.trim()) e.account_number = 'Account number is required.'
    if (!nextForm.ifsc_code) {
      if (shouldRequire('ifsc_code')) e.ifsc_code = 'Invalid IFSC format.'
    } else if (!IFSC_RE.test(nextForm.ifsc_code.toUpperCase())) {
      e.ifsc_code = 'Invalid IFSC format.'
    }

    if (shouldRequire('msme_applicable') && nextForm.msme_applicable === null) e.msme_applicable = 'Please select MSME status.'
    if (nextForm.msme_applicable) {
      if (shouldRequire('msme_category') && !nextForm.msme_category) e.msme_category = 'MSME category is required.'
      if (shouldRequire('udyam_number') && !nextForm.udyam_number.trim()) e.udyam_number = 'Udyam registration number is required.'
    }

    if (shouldRequire('pan_doc') && !hasDocument('PAN', nextFiles)) e.pan_doc = 'PAN Card document is required.'
    if (nextForm.gst_applicable && shouldRequire('gst_doc') && !hasDocument('GST', nextFiles)) e.gst_doc = 'GST Certificate is required.'
    if (shouldRequire('cheque_doc') && !hasDocument('CHEQUE', nextFiles)) e.cheque_doc = 'Cancelled cheque is required.'
    if (nextForm.msme_applicable && shouldRequire('msme_doc') && !hasDocument('MSME', nextFiles)) e.msme_doc = 'MSME Certificate is required.'

    return e
  }

  const validateAll = (nextForm = form, nextFiles = files) => validateForm(
    nextForm,
    nextFiles,
    {
      company_name: true,
      emails: true,
      phones: true,
      district: true,
      city: true,
      state: true,
      pincode: true,
      street1: true,
      pan_number: true,
      gst_applicable: true,
      gst_number: true,
      account_holder_name: true,
      bank_name: true,
      branch_name: true,
      account_number: true,
      ifsc_code: true,
      msme_applicable: true,
      msme_category: true,
      udyam_number: true,
      pan_doc: true,
      gst_doc: true,
      cheque_doc: true,
      msme_doc: true,
    },
    true,
  )

  const pickErrors = (source, keys) => (
    Object.fromEntries(Object.entries(source).filter(([key]) => keys.includes(key)))
  )

  const set = (key, value) => {
    setTouched((prevTouched) => {
      const nextTouched = { ...prevTouched, [key]: true }
      setForm((prevForm) => {
        const nextForm = { ...prevForm, [key]: value }
        setErrors(validateForm(nextForm, files, nextTouched))
        return nextForm
      })
      return nextTouched
    })
  }

  const updateFile = (docType, file) => {
    const errorKeyByDocType = {
      PAN: 'pan_doc',
      GST: 'gst_doc',
      CHEQUE: 'cheque_doc',
      MSME: 'msme_doc',
    }
    const errorKey = errorKeyByDocType[docType]
    setTouched((prevTouched) => {
      const nextTouched = { ...prevTouched, [errorKey]: true }
      setFiles((prevFiles) => {
        const nextFiles = { ...prevFiles, [docType]: file }
        setErrors(validateForm(form, nextFiles, nextTouched))
        return nextFiles
      })
      return nextTouched
    })
  }

  // ── Save draft ──
  const saveDraft = async () => {
    try {
      await axios.put(`/api/v1/onboarding/form/${token}/submit/`, buildPayload())
    } catch {}
  }

  const buildPayload = () => ({
    company_name: form.company_name,
    contact_person: form.contact_person,
    emails: form.emails.filter(Boolean),
    phones: form.phones.filter(Boolean),
    district: form.district,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    date_of_birth: form.date_of_birth,
    country: form.country,
    street1: form.street1,
    street2: form.street2,
    street3: form.street3,
    street4: form.street4,
    pan_number: form.pan_number.toUpperCase(),
    gst_applicable: form.gst_applicable,
    gst_number: form.gst_applicable ? form.gst_number.toUpperCase() : '',
    account_holder_name: form.account_holder_name,
    bank_name: form.bank_name,
    branch_name: form.branch_name,
    account_number: form.account_number,
    ifsc_code: form.ifsc_code.toUpperCase(),
    msme_applicable: form.msme_applicable,
    msme_status: form.msme_applicable ? normalizeMsmeCode(form.msme_category) : 'MNA',
    msme_category: form.msme_applicable ? normalizeMsmeCode(form.msme_category) : '',
    udyam_number: form.msme_applicable ? form.udyam_number : '',
  })

  // ── Step 1 validation ──
  const validateStep1 = () => {
    const e = pickErrors(validateAll(), ['company_name', 'emails', 'phones', 'district', 'city', 'state', 'pincode', 'street1'])
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step 2 validation ──
  const validateStep2 = () => {
    const e = pickErrors(validateAll(), ['pan_number', 'gst_applicable', 'gst_number', 'account_holder_name', 'bank_name', 'branch_name', 'account_number', 'ifsc_code'])
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step 3 validation ──
  const validateStep3 = () => {
    const e = pickErrors(validateAll(), ['msme_applicable', 'msme_category', 'udyam_number', 'pan_doc', 'gst_doc', 'cheque_doc', 'msme_doc'])
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goToStep = async (target) => {
    if (target > step) {
      if (step === 1 && !validateStep1()) return
      if (step === 2 && !validateStep2()) return
      if (step === 3 && !validateStep3()) return
      await saveDraft()
    }
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Upload files ──
  const uploadFile = async (docType, file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('document_type', docType)
    fd.append('file', file)
    await axios.post(`/api/v1/documents/upload/${token}/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // ── Final submit ──
  const handleSubmit = async () => {
    setSubmitAttempted(true)
    const e = validateAll()
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    try {
      await Promise.all([
        uploadFile('PAN', files.PAN),
        form.gst_applicable && uploadFile('GST', files.GST),
        uploadFile('CHEQUE', files.CHEQUE),
        form.msme_applicable && uploadFile('MSME', files.MSME),
      ])
      await axios.post(`/api/v1/onboarding/form/${token}/submit/`, buildPayload())
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const data = err.response?.data
      const msg = data?.detail || JSON.stringify(data) || 'Submission failed.'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const panGstStatus = validatePanGst(form.pan_number, form.gst_number)
  const isReadOnly = isApproved

  // ── Loading / Error states ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'linear-gradient(160deg, #0f0c08 0%, #1c1208 55%, #111827 100%)' }}>
      <img src="/radico-logo.png" alt="Radico Khaitan" style={{ height: 60, marginBottom: 8 }} />
      <div className="spinner" style={{ width: 24, height: 24, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#C9A84C' }} />
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading your onboarding form…</div>
    </div>
  )

  if (tokenError) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14, background: 'linear-gradient(160deg, #0f0c08 0%, #1c1208 55%, #111827 100%)', padding: '2rem', textAlign: 'center' }}>
      <img src="/radico-logo.png" alt="Radico Khaitan" style={{ height: 56, marginBottom: 16 }} />
      <div style={{ fontSize: 36 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Link Invalid or Expired</h2>
      <p style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 380 }}>{tokenError}</p>
      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Please contact Radico Khaitan to request a new link.</p>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #0f0c08 0%, #1c1208 55%, #111827 100%)' }}>
      <div style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: 520 }}>
        <img src="/radico-logo.png" alt="Radico Khaitan" style={{ height: 56, marginBottom: '2rem' }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(14,122,58,0.15)', border: '2px solid rgba(110,231,160,0.3)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: '.5rem' }}>Registration Submitted!</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '1.75rem', lineHeight: 1.7 }}>
          Your {entityType} onboarding application has been submitted successfully and is now under review.
        </p>
        <div className="code-display">{tokenData?.onboarding?.onboarding_code}</div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: '.75rem' }}>
          Use this code to follow up with the Radico Khaitan team.
        </p>
      </div>
    </div>
  )

  return (
    <>
      <header>
        <div className="logo">
          <img src="/radico-logo.png" alt="Radico Khaitan" className="logo-img" />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          {entityType} Onboarding · <span style={{ fontFamily: 'var(--mono)', color: '#C9A84C', fontWeight: 600 }}>{tokenData?.onboarding?.onboarding_code}</span>
        </div>
      </header>

      <div className="page">
        <div className="page-header">
          <h1>{registrationTitle}</h1>
          <p>Complete all sections to register as a {entityType.toLowerCase()}. Starred fields are mandatory.</p>
        </div>

        {isReadOnly && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3C5', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
            ✅ Your registration has been <strong>Approved</strong>. The form is now read-only.
          </div>
        )}

        {/* Step Indicator */}
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.id} className={`step ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>
              <div className="step-num">{step > s.id ? '✓' : s.id}</div>
              <div className="step-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <>
            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏢</div>Company Information</div>
              <div className="grid-2">
                <div className="field span-2">
                  <label>{entityType} / Company Name <span className="req">*</span></label>
                  <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="e.g. Acme Technologies Pvt. Ltd." disabled={isReadOnly} className={errors.company_name ? 'error' : ''} />
                  {errors.company_name && <span className="field-error">{errors.company_name}</span>}
                </div>
                <div className="field span-2">
                  <label>Contact Person</label>
                  <input type="text" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="Full name (optional)" disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label>Email Address(es) <span className="req">*</span></label>
                  <MultiEntryField type="email" values={form.emails} onChange={(v) => set('emails', v)} placeholder="contact@company.com" tag="Email" disabled={isReadOnly} />
                  {errors.emails && <span className="field-error">{errors.emails}</span>}
                </div>
                <div className="field span-2">
                  <label>Mobile Number(s) <span className="req">*</span></label>
                  <MultiEntryField type="tel" values={form.phones} onChange={(v) => set('phones', v)} placeholder="+91 98765 43210" tag="Phone" disabled={isReadOnly} />
                  {errors.phones && <span className="field-error">{errors.phones}</span>}
                </div>

              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">📍</div>Registered Address</div>
              <div className="grid-2">
                <div className="field">
                  <label>District <span className="req">*</span></label>
                  <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="District" disabled={isReadOnly} className={errors.district ? 'error' : ''} />
                  {errors.district && <span className="field-error">{errors.district}</span>}
                </div>
                <div className="field">
                  <label>City <span className="req">*</span></label>
                  <input type="text" value={form.city} onChange={(e) => set('city', e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="City" disabled={isReadOnly} className={errors.city ? 'error' : ''} />
                  {errors.city && <span className="field-error">{errors.city}</span>}
                </div>
                <div className="field">
                  <label>State <span className="req">*</span></label>
                  <select value={form.state} onChange={(e) => set('state', e.target.value)} disabled={isReadOnly} className={errors.state ? 'error' : ''}>
                    <option value="">— Select state —</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {errors.state && <span className="field-error">{errors.state}</span>}
                </div>
                <div className="field">
                  <label>PIN Code <span className="req">*</span></label>
                  <input type="text" value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN" disabled={isReadOnly} className={errors.pincode ? 'error' : ''} />
                  {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                </div>
                <div className="field">
                  <label>Country</label>
                  <input type="text" value={form.country} onChange={(e) => set('country', e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label>Street / House Number <span className="req">*</span></label>
                  <input type="text" value={form.street1} onChange={(e) => set('street1', e.target.value)} placeholder="Building / Plot No., Street Name" maxLength={35} disabled={isReadOnly} className={errors.street1 ? 'error' : ''} />
                  {errors.street1 && <span className="field-error">{errors.street1}</span>}
                </div>
                <div className="field span-2">
                  <label>Street 2</label>
                  <input type="text" value={form.street2} onChange={(e) => set('street2', e.target.value)} placeholder="Area or Locality" maxLength={40} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label>Street 3</label>
                  <input type="text" value={form.street3} onChange={(e) => set('street3', e.target.value)} placeholder="Landmark or Nearby Area (optional)" maxLength={40} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label>Street 4</label>
                  <input type="text" value={form.street4} onChange={(e) => set('street4', e.target.value)} placeholder="Additional address detail (optional)" maxLength={40} disabled={isReadOnly} />
                </div>
              </div>
            </div>

            <div className="btn-row">
              <span />
              <button className="btn btn-primary" onClick={() => goToStep(2)}>Continue → Tax & Bank</button>
            </div>
          </>
        )}

        {/* ── STEP 2: Tax & Bank ── */}
        {step === 2 && (
          <>
            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏛️</div>Tax & Compliance</div>
              <div className="grid-2">
                <div className="field span-2">
                  <label>Date of Birth/Commencement</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set('date_of_birth', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="field span-2">
                  <label>PAN Number <span className="req">*</span></label>
                  <input
                    type="text"
                    value={form.pan_number}
                    onChange={(e) => set('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                    disabled={isReadOnly}
                    className={errors.pan_number ? 'error' : ''}
                  />
                  <span className="hint">Format: 5 letters + 4 digits + 1 letter</span>
                  {errors.pan_number && <span className="field-error">{errors.pan_number}</span>}
                </div>

                <div className="field span-2">
                  <label>GST Applicable? <span className="req">*</span></label>
                  <div className="toggle-group" style={{ marginTop: 6 }}>
                    <div className="toggle-opt">
                      <input type="radio" id="gst-yes" name="gst" checked={form.gst_applicable === true} onChange={() => set('gst_applicable', true)} disabled={isReadOnly} />
                      <label htmlFor="gst-yes">✅ Yes — Has GST Number</label>
                    </div>
                    <div className="toggle-opt">
                      <input type="radio" id="gst-no" name="gst" checked={form.gst_applicable === false} onChange={() => set('gst_applicable', false)} disabled={isReadOnly} />
                      <label htmlFor="gst-no">❌ No — Not Registered</label>
                    </div>
                  </div>
                  {errors.gst_applicable && <span className="field-error">{errors.gst_applicable}</span>}
                </div>

                {form.gst_applicable && (
                  <div className="field span-2">
                    <label>GST Number <span className="req">*</span></label>
                    <input
                      type="text"
                      value={form.gst_number}
                      onChange={(e) => set('gst_number', e.target.value.toUpperCase().slice(0, 15))}
                      placeholder="22ABCDE1234F1Z5"
                      maxLength={15}
                      style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                      disabled={isReadOnly}
                      className={errors.gst_number ? 'error' : ''}
                    />
                    <span className="hint">15-character GSTIN</span>
                    {errors.gst_number && <span className="field-error">{errors.gst_number}</span>}
                  </div>
                )}
              </div>

              {form.gst_applicable && form.pan_number.length === 10 && form.gst_number.length === 15 && (
                <div className={`pan-gst-match ${panGstStatus || 'pending'}`} style={{ marginTop: 8 }}>
                  <span>{panGstStatus === 'match' ? '✅' : panGstStatus === 'no-match' ? '❌' : '⏳'}</span>
                  <span>
                    {panGstStatus === 'match' ? 'PAN & GST cross-validation passed.' :
                      panGstStatus === 'no-match' ? 'PAN & GST mismatch — digits 3–12 of GST must match PAN.' :
                      'Enter both PAN and GST to verify.'}
                  </span>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏦</div>Bank Account Details</div>
              <div className="grid-2">
                <div className="field span-2">
                  <label>Account Holder Name <span className="req">*</span></label>
                  <input type="text" value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder="As per bank records" disabled={isReadOnly} className={errors.account_holder_name ? 'error' : ''} />
                  {errors.account_holder_name && <span className="field-error">{errors.account_holder_name}</span>}
                </div>
                <div className="field">
                  <label>Bank Name <span className="req">*</span></label>
                  <select value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} disabled={isReadOnly} className={errors.bank_name ? 'error' : ''}>
                    <option value="">— Select bank —</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                  {errors.bank_name && <span className="field-error">{errors.bank_name}</span>}
                </div>
                <div className="field">
                  <label>Branch Name <span className="req">*</span></label>
                  <input type="text" value={form.branch_name} onChange={(e) => set('branch_name', e.target.value)} placeholder="Branch" disabled={isReadOnly} className={errors.branch_name ? 'error' : ''} />
                  {errors.branch_name && <span className="field-error">{errors.branch_name}</span>}
                </div>
                <div className="field">
                  <label>Account Number <span className="req">*</span></label>
                  <input type="text" value={form.account_number} onChange={(e) => set('account_number', e.target.value.replace(/\D/g, ''))} placeholder="Account number" style={{ fontFamily: 'var(--mono)' }} disabled={isReadOnly} className={errors.account_number ? 'error' : ''} />
                  {errors.account_number && <span className="field-error">{errors.account_number}</span>}
                </div>
                <div className="field">
                  <label>IFSC Code <span className="req">*</span></label>
                  <input type="text" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" maxLength={11} style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }} disabled={isReadOnly} className={errors.ifsc_code ? 'error' : ''} />
                  <span className="hint">Format: 4 letters + 0 + 6 alphanumeric</span>
                  {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
                </div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => goToStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => goToStep(3)}>Continue → MSME & Docs</button>
            </div>
          </>
        )}

        {/* ── STEP 3: MSME & Documents ── */}
        {step === 3 && (
          <>
            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏅</div>MSME Registration Status</div>
              <div className="field" style={{ marginBottom: '1rem' }}>
                <label>Is this {entityType.toLowerCase()} registered under MSME? <span className="req">*</span></label>
                <div className="toggle-group" style={{ marginTop: 6 }}>
                  <div className="toggle-opt">
                    <input type="radio" id="msme-yes" name="msme" checked={form.msme_applicable === true} onChange={() => set('msme_applicable', true)} disabled={isReadOnly} />
                    <label htmlFor="msme-yes">✅ Yes — MSME Registered</label>
                  </div>
                  <div className="toggle-opt">
                    <input type="radio" id="msme-no" name="msme" checked={form.msme_applicable === false} onChange={() => set('msme_applicable', false)} disabled={isReadOnly} />
                    <label htmlFor="msme-no">❌ No — Not Registered</label>
                  </div>
                </div>
                {errors.msme_applicable && <span className="field-error">{errors.msme_applicable}</span>}
              </div>

              {form.msme_applicable === true && (
                <div className="grid-2">
                  <div className="field">
                    <label>MSME Category <span className="req">*</span></label>
                    <select value={form.msme_category} onChange={(e) => set('msme_category', e.target.value)} disabled={isReadOnly} className={errors.msme_category ? 'error' : ''}>
                      <option value="">— Select —</option>
                      {MSME_REGISTERED_OPTIONS.map(({ code, description }) => (
                        <option key={code} value={code}>{code} - {description}</option>
                      ))}
                    </select>
                    {errors.msme_category && <span className="field-error">{errors.msme_category}</span>}
                  </div>
                  <div className="field">
                    <label>Udyam Registration Number <span className="req">*</span></label>
                    <input type="text" value={form.udyam_number} onChange={(e) => set('udyam_number', e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} disabled={isReadOnly} className={errors.udyam_number ? 'error' : ''} />
                    {errors.udyam_number && <span className="field-error">{errors.udyam_number}</span>}
                  </div>
                </div>
              )}

              {form.msme_applicable === false && (
                <div className="msme-notice">
                  <strong>MNA — MSME Not Applicable</strong><br />
                  Status will be automatically set to <em>MNA</em>. No MSME Certificate required.
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <div className="card-title-icon">📎</div>
                Document Upload
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontWeight: 400 }}>PDF, JPG, PNG · Max 10 MB</span>
              </div>

              <div className="doc-section">
                <div className="doc-card">
                  <div className="doc-card-head">
                    <div className="doc-card-title">🪪 PAN Card</div>
                    <span className="badge badge-required">Required</span>
                  </div>
                  <FileUploadField
                    value={files.PAN}
                    onChange={(f) => updateFile('PAN', f)}
                    disabled={isReadOnly}
                    existingDocs={tokenData?.onboarding?.documents}
                    docType="PAN"
                  />
                  {errors.pan_doc && <span className="field-error">{errors.pan_doc}</span>}
                </div>

                <div className="doc-card">
                  <div className="doc-card-head">
                    <div className="doc-card-title">🧾 GST Certificate</div>
                    <span className={`badge ${form.gst_applicable ? 'badge-required' : 'badge-mna'}`}>
                      {form.gst_applicable ? 'Required' : form.gst_applicable === false ? 'N/A' : '—'}
                    </span>
                  </div>
                  {form.gst_applicable ? (
                    <>
                      <FileUploadField
                        value={files.GST}
                        onChange={(f) => updateFile('GST', f)}
                        disabled={isReadOnly}
                        existingDocs={tokenData?.onboarding?.documents}
                        docType="GST"
                      />
                      {errors.gst_doc && <span className="field-error">{errors.gst_doc}</span>}
                    </>
                  ) : (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-2)' }}>
                      🚫 <strong>Not required</strong> — No GST registration
                    </div>
                  )}
                </div>

                <div className="doc-card">
                  <div className="doc-card-head">
                    <div className="doc-card-title">🏦 Cancelled Cheque</div>
                    <span className="badge badge-required">Required</span>
                  </div>
                  <FileUploadField
                    value={files.CHEQUE}
                    onChange={(f) => updateFile('CHEQUE', f)}
                    disabled={isReadOnly}
                    existingDocs={tokenData?.onboarding?.documents}
                    docType="CHEQUE"
                  />
                  {errors.cheque_doc && <span className="field-error">{errors.cheque_doc}</span>}
                </div>

                <div className="doc-card">
                  <div className="doc-card-head">
                    <div className="doc-card-title">🏅 MSME Certificate</div>
                    <span className={`badge ${form.msme_applicable ? 'badge-required' : 'badge-mna'}`}>
                      {form.msme_applicable ? 'Required' : form.msme_applicable === false ? 'MNA' : '—'}
                    </span>
                  </div>
                  {form.msme_applicable ? (
                    <>
                      <FileUploadField
                        value={files.MSME}
                        onChange={(f) => updateFile('MSME', f)}
                        disabled={isReadOnly}
                        existingDocs={tokenData?.onboarding?.documents}
                        docType="MSME"
                      />
                      {errors.msme_doc && <span className="field-error">{errors.msme_doc}</span>}
                    </>
                  ) : (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--mna)', fontSize: 13, background: 'var(--mna-bg)', borderRadius: 'var(--radius)' }}>
                      🚫 <strong>Not required</strong> — Status: MNA
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => goToStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={() => goToStep(4)}>Continue → Review</button>
            </div>
          </>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {step === 4 && (
          <>
            <div className="card">
              <div className="card-title"><div className="card-title-icon">👁️</div>Review — Basic Info</div>
              <div className="summary-grid">
                <div className="summary-row"><span className="summary-key">Company Name</span><span className="summary-val">{form.company_name}</span></div>
                <div className="summary-row"><span className="summary-key">Contact Person</span><span className="summary-val">{form.contact_person || '—'}</span></div>
                <div className="summary-row"><span className="summary-key">Emails</span><span className="summary-val">{form.emails.filter(Boolean).join(', ')}</span></div>
                <div className="summary-row"><span className="summary-key">Phones</span><span className="summary-val">{form.phones.filter(Boolean).join(', ')}</span></div>
                <div className="summary-row"><span className="summary-key">City / District</span><span className="summary-val">{form.city}, {form.district}</span></div>
                <div className="summary-row"><span className="summary-key">State / PIN</span><span className="summary-val">{form.state} — {form.pincode}</span></div>
                <div className="summary-row" style={{ gridColumn: 'span 2' }}><span className="summary-key">Address</span><span className="summary-val">{[form.street1, form.street2, form.street3, form.street4].filter(Boolean).join(', ')}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏛️</div>Review — Tax & Bank</div>
              <div className="summary-grid">
                <div className="summary-row"><span className="summary-key">PAN</span><span className="summary-val mono">{form.pan_number}</span></div>
                <div className="summary-row"><span className="summary-key">GST</span><span className="summary-val mono">{form.gst_applicable ? form.gst_number : 'Not Applicable'}</span></div>
                <div className="summary-row"><span className="summary-key">Account Holder</span><span className="summary-val">{form.account_holder_name}</span></div>
                <div className="summary-row"><span className="summary-key">Bank</span><span className="summary-val">{form.bank_name}</span></div>
                <div className="summary-row"><span className="summary-key">Branch</span><span className="summary-val">{form.branch_name}</span></div>
                <div className="summary-row"><span className="summary-key">Account No.</span><span className="summary-val mono">{form.account_number}</span></div>
                <div className="summary-row"><span className="summary-key">IFSC</span><span className="summary-val mono">{form.ifsc_code}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏅</div>Review — MSME & Documents</div>
              <div className="summary-grid" style={{ marginBottom: '1rem' }}>
                <div className="summary-row"><span className="summary-key">MSME Status</span><span className="summary-val">{form.msme_applicable ? formatMsmeOption(form.msme_category) : formatMsmeOption('MNA')}</span></div>
                {form.msme_applicable && <div className="summary-row"><span className="summary-key">Udyam No.</span><span className="summary-val mono">{form.udyam_number}</span></div>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['PAN', 'GST', 'CHEQUE', 'MSME'].map((t) => {
                  const f = files[t]
                  const required = t === 'PAN' || t === 'CHEQUE' || (t === 'GST' && form.gst_applicable) || (t === 'MSME' && form.msme_applicable)
                  if (!required) return null
                  return (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: f ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${f ? '#A7F3C5' : '#FCA5A5'}`, fontSize: 12, fontWeight: 500, color: f ? 'var(--success)' : 'var(--danger)' }}>
                      {f ? '✅' : '⚠️'} {t} {f ? f.name : '(missing)'}
                    </div>
                  )
                })}
              </div>
            </div>

            {errors.submit && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '1rem', fontSize: 13, color: 'var(--danger)' }}>
                ❌ {errors.submit}
              </div>
            )}

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => goToStep(3)}>← Back</button>
              {!isReadOnly && (
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><div className="spinner" />Submitting…</> : '✅ Submit Registration'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
