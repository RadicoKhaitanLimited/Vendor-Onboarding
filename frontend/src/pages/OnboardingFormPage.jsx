import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { publicApi } from '../api/axios'
import MultiEntryField from '../components/MultiEntryField'
import FileUploadField from '../components/FileUploadField'
import { MSME_REGISTERED_OPTIONS, formatMsmeOption, normalizeMsmeCode } from '../constants/msme'
import { validateGstStateCode } from '../constants/gstStateCodes'
import { isPanNameEditable } from '../utils/panName'
import { useCityPincodeSync } from '../utils/useCityPincodeSync'
import { useIfscVerification } from '../utils/useIfscVerification'

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
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RE = /^(?:\+91|91|0)?[6-9]\d{9}$/
const ACCOUNT_NUMBER_RE = /^[A-Za-z0-9]{9,34}$/

const isValidEmail = (value) => EMAIL_RE.test(value.trim())
const isValidPhone = (value) => PHONE_RE.test(value.trim().replace(/[\s-]/g, ''))
const isValidAccountNumber = (value) => ACCOUNT_NUMBER_RE.test(value.trim())

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

const stepStorageKey = (token) => `onboarding-form-step:${token}`

function readSavedStep(token) {
  try {
    const saved = Number(window.localStorage.getItem(stepStorageKey(token)))
    return saved >= 1 && saved <= STEPS.length ? saved : 1
  } catch {
    return 1
  }
}

export default function OnboardingFormPage() {
  const { token } = useParams()
  const location = useLocation()
  const [tokenData, setTokenData] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(() => readSavedStep(token))
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
    pan_name: '',
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
  const [extraDocs, setExtraDocs] = useState([])

  useEffect(() => {
    publicApi.get(`/onboarding/form/${token}/`)
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
            pan_name: ob.pan_name || ob.company_name || '',
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

  useEffect(() => {
    if (submitted) return
    try {
      window.localStorage.setItem(stepStorageKey(token), String(step))
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — resuming step just won't persist.
    }
  }, [token, step, submitted])

  const entityType = getEntityType(tokenData, location.search)
  const isCustomer = entityType === 'Customer'
  const registrationTitle = `${entityType} Registration`
  const isApproved = tokenData?.onboarding?.status === 'APPROVED'
  const hasDocument = (docType, nextFiles = files) => Boolean(nextFiles[docType] || tokenData?.onboarding?.documents?.some((doc) => doc.document_type === docType))

  const validateForm = (nextForm = form, nextFiles = files, nextTouched = touched, showAll = submitAttempted) => {
    const e = {}
    const shouldRequire = (field) => showAll || nextTouched[field]

    if (shouldRequire('company_name') && !nextForm.company_name.trim()) e.company_name = 'Company name is required.'
    const nonEmptyEmails = nextForm.emails.filter(Boolean)
    if (shouldRequire('emails') && !nonEmptyEmails.length) e.emails = 'At least one email is required.'
    else if (nonEmptyEmails.some((email) => !isValidEmail(email))) e.emails = 'Enter valid email address(es).'

    const nonEmptyPhones = nextForm.phones.filter(Boolean)
    if (shouldRequire('phones') && !nonEmptyPhones.length) e.phones = 'At least one phone number is required.'
    else if (nonEmptyPhones.some((phone) => !isValidPhone(phone))) e.phones = 'Enter valid 10-digit phone number(s).'
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

    if (isPanNameEditable(pan) && shouldRequire('pan_name') && !nextForm.pan_name.trim()) {
      e.pan_name = 'PAN name is required.'
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

    if (!isCustomer) {
      if (shouldRequire('account_holder_name') && !nextForm.account_holder_name.trim()) e.account_holder_name = 'Account holder name is required.'
      if (shouldRequire('bank_name') && !nextForm.bank_name) e.bank_name = 'Bank name is required.'
      if (shouldRequire('branch_name') && !nextForm.branch_name.trim()) e.branch_name = 'Branch name is required.'
      const accountNumber = nextForm.account_number.trim()
      if (shouldRequire('account_number') && !accountNumber) e.account_number = 'Account number is required.'
      else if (accountNumber && !isValidAccountNumber(accountNumber)) e.account_number = 'Account number must be 9-34 alphanumeric characters, no spaces.'

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
    }

    if (shouldRequire('pan_doc') && !hasDocument('PAN', nextFiles)) e.pan_doc = 'PAN Card document is required.'
    if (nextForm.gst_applicable && shouldRequire('gst_doc') && !hasDocument('GST', nextFiles)) e.gst_doc = 'GST Certificate is required.'
    if (!isCustomer) {
      if (shouldRequire('cheque_doc') && !hasDocument('CHEQUE', nextFiles)) e.cheque_doc = 'Cancelled cheque is required.'
      if (nextForm.msme_applicable && shouldRequire('msme_doc') && !hasDocument('MSME', nextFiles)) e.msme_doc = 'MSME Certificate is required.'
    }

    return e
  }

  const validateAll = (nextForm = form, nextFiles = files) => validateForm(
    nextForm,
    nextFiles,
    {
      company_name: true,
      emails: true,
      phones: true,
      city: true,
      state: true,
      pincode: true,
      street1: true,
      pan_number: true,
      pan_name: true,
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
        if ((key === 'company_name' || key === 'pan_number') && !isPanNameEditable(nextForm.pan_number)) {
          nextForm.pan_name = nextForm.company_name
        }
        setErrors(validateForm(nextForm, files, nextTouched))
        return nextForm
      })
      return nextTouched
    })
  }

  const {
    pincodeSuggestions,
    pincodeLookupLoading,
    cityLookupLoading,
    applyPincodeSuggestion,
  } = useCityPincodeSync(form.city, form.state, form.pincode, set)

  const {
    ifscLookupLoading,
    ifscBankMismatch,
    ifscNotFound,
  } = useIfscVerification(form.ifsc_code, form.bank_name, form.branch_name, set)

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
      await publicApi.put(`/onboarding/form/${token}/submit/`, buildPayload())
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
    pan_name: form.pan_name,
    gst_applicable: form.gst_applicable,
    gst_number: form.gst_applicable ? form.gst_number.toUpperCase() : '',
    account_holder_name: isCustomer ? '' : form.account_holder_name,
    bank_name: isCustomer ? '' : form.bank_name,
    branch_name: isCustomer ? '' : form.branch_name,
    account_number: isCustomer ? '' : form.account_number,
    ifsc_code: isCustomer ? '' : form.ifsc_code.toUpperCase(),
    msme_applicable: isCustomer ? false : form.msme_applicable,
    msme_status: !isCustomer && form.msme_applicable ? normalizeMsmeCode(form.msme_category) : 'MNA',
    msme_category: !isCustomer && form.msme_applicable ? normalizeMsmeCode(form.msme_category) : '',
    udyam_number: !isCustomer && form.msme_applicable ? form.udyam_number : '',
  })

  // ── Autosave draft on change (debounced) ──
  const autosaveSkipRef = useRef(true)
  useEffect(() => {
    if (loading || submitted || isApproved) return
    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false
      return
    }
    const timer = setTimeout(() => { saveDraft() }, 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading, submitted, isApproved])

  // ── Step 1 validation ──
  const validateStep1 = () => {
    const e = pickErrors(validateAll(), ['company_name', 'emails', 'phones', 'city', 'state', 'pincode', 'street1'])
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step 2 validation ──
  const validateStep2 = () => {
    const e = pickErrors(validateAll(), ['pan_number', 'pan_name', 'gst_applicable', 'gst_number', 'account_holder_name', 'bank_name', 'branch_name', 'account_number', 'ifsc_code'])
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
  const uploadFile = async (docType, file, label) => {
    if (!file) return
    const fd = new FormData()
    fd.append('document_type', docType)
    if (label) fd.append('label', label)
    fd.append('file', file)
    await publicApi.post(`/documents/upload/${token}/`, fd)
  }

  // ── Extra documents ──
  const addExtraDoc = () => {
    setExtraDocs((prev) => [...prev, { id: `new-${Date.now()}-${Math.random()}`, label: '', file: null }])
  }
  const updateExtraDoc = (id, patch) => {
    setExtraDocs((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)))
  }
  const removeExtraDoc = (id) => {
    setExtraDocs((prev) => prev.filter((doc) => doc.id !== id))
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
        !isCustomer && uploadFile('CHEQUE', files.CHEQUE),
        !isCustomer && form.msme_applicable && uploadFile('MSME', files.MSME),
        ...extraDocs.filter((doc) => doc.file).map((doc) => uploadFile('OTHER', doc.file, doc.label)),
      ])
      await publicApi.post(`/onboarding/form/${token}/submit/`, buildPayload())
      setSubmitted(true)
      try {
        window.localStorage.removeItem(stepStorageKey(token))
      } catch {
        // Best-effort cleanup only.
      }
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
    <div className="onboarding-fullscreen" role="status" aria-live="polite">
      <img src="/radico-logo.png" alt="Radico Khaitan" className="onboarding-fullscreen-logo" />
      <div className="spinner" style={{ width: 26, height: 26, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#C9A84C' }} aria-hidden="true" />
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13.5 }}>Loading your onboarding form…</div>
      <div className="onboarding-loading-track" aria-hidden="true" />
    </div>
  )

  if (tokenError) return (
    <div className="onboarding-fullscreen" role="alert">
      <img src="/radico-logo.png" alt="Radico Khaitan" className="onboarding-fullscreen-logo" />
      <div className="onboarding-fullscreen-card">
        <div className="onboarding-status-icon is-error" aria-hidden="true">🔒</div>
        <h2>Link Invalid or Expired</h2>
        <p className="onboarding-lede">{tokenError}</p>
        <p className="onboarding-footnote">Please contact Radico Khaitan to request a new link.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="onboarding-fullscreen" role="status">
      <img src="/radico-logo.png" alt="Radico Khaitan" className="onboarding-fullscreen-logo" />
      <div className="onboarding-fullscreen-card">
        <div className="onboarding-status-icon is-success" aria-hidden="true">✅</div>
        <h2>Registration Submitted!</h2>
        <p className="onboarding-lede">
          Your {entityType} onboarding application has been submitted successfully and is now under review.
        </p>
        <div className="code-display">{tokenData?.onboarding?.onboarding_code}</div>
        <p className="onboarding-footnote">
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
        <div className="onboarding-header-meta">
          {entityType} Onboarding · <span className="onboarding-header-code">{tokenData?.onboarding?.onboarding_code}</span>
        </div>
      </header>

      <div className="page onboarding-page">
        <div className="page-header">
          <h1>{registrationTitle}</h1>
          <p>Complete all sections to register as a {entityType.toLowerCase()}. Starred fields are mandatory.</p>
        </div>

        {isReadOnly && (
          <div className="onboarding-approved-banner">
            <span className="onboarding-approved-banner-icon" aria-hidden="true">✅</span>
            <span>Your registration has been <strong>Approved</strong>. The form is now read-only.</span>
          </div>
        )}

        {/* Step Indicator */}
        <nav className="onb-steps" aria-label="Registration steps">
          {STEPS.map((s) => (
            <div key={s.id} className={`onb-step ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`} aria-current={step === s.id ? 'step' : undefined}>
              <div className="onb-step-num" aria-hidden="true">{step > s.id ? '✓' : s.id}</div>
              <div className="onb-step-text">
                <span className="onb-step-sub">Step {s.id}</span>
                <span className="onb-step-label">{s.label}</span>
              </div>
            </div>
          ))}
        </nav>

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <>
            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏢</div>Company Information</div>
              <div className="grid-2">
                <div className="field span-2">
                  <label htmlFor="f-company-name">{entityType} / Company Name <span className="req">*</span></label>
                  <input id="f-company-name" type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="e.g. Acme Technologies Pvt. Ltd." disabled={isReadOnly} className={errors.company_name ? 'error' : ''} />
                  {errors.company_name && <span className="field-error">{errors.company_name}</span>}
                </div>
                <div className="field span-2">
                  <label htmlFor="f-contact-person">Contact Person</label>
                  <input id="f-contact-person" type="text" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="Full name (optional)" disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label>Email Address(es) <span className="req">*</span></label>
                  <MultiEntryField type="email" values={form.emails} onChange={(v) => set('emails', v)} placeholder="contact@company.com" tag="Email" disabled={isReadOnly} />
                  {errors.emails && <span className="field-error">{errors.emails}</span>}
                </div>
                <div className="field span-2">
                  <label>Mobile Number(s) <span className="req">*</span></label>
                  <MultiEntryField type="tel" values={form.phones} onChange={(v) => set('phones', v)} placeholder="9876543210" tag="Phone" disabled={isReadOnly} />
                  {errors.phones && <span className="field-error">{errors.phones}</span>}
                </div>

              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">📍</div>Registered Address</div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="f-district">District</label>
                  <input id="f-district" type="text" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="District" disabled={isReadOnly} className={errors.district ? 'error' : ''} />
                  {errors.district && <span className="field-error">{errors.district}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-city">City <span className="req">*</span></label>
                  <input id="f-city" type="text" value={form.city} onChange={(e) => set('city', e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="City" disabled={isReadOnly} className={errors.city ? 'error' : ''} />
                  {errors.city && <span className="field-error">{errors.city}</span>}
                  {pincodeLookupLoading && (
                    <span className="field-hint-row"><span className="spinner-mini" aria-hidden="true" />Looking up PIN code…</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="f-state">State <span className="req">*</span></label>
                  <select id="f-state" value={form.state} onChange={(e) => set('state', e.target.value)} disabled={isReadOnly} className={errors.state ? 'error' : ''}>
                    <option value="">— Select state —</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {errors.state && <span className="field-error">{errors.state}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-pincode">PIN Code <span className="req">*</span></label>
                  <input id="f-pincode" type="text" value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN" disabled={isReadOnly} className={errors.pincode ? 'error' : ''} />
                  {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                  {cityLookupLoading && (
                    <span className="field-hint-row"><span className="spinner-mini" aria-hidden="true" />Looking up city…</span>
                  )}
                  {pincodeSuggestions.length > 0 && (
                    <div className="pincode-suggestions">
                      <div className="pincode-suggestions-head">Multiple PIN codes found for this city — pick one:</div>
                      {pincodeSuggestions.map((match) => (
                        <button
                          type="button"
                          key={`${match.pincode}-${match.city}`}
                          onClick={() => applyPincodeSuggestion(match)}
                          className="pincode-suggestion-btn"
                        >
                          {match.pincode} — {match.city}, {match.district}, {match.state}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="f-country">Country</label>
                  <input id="f-country" type="text" value={form.country} onChange={(e) => set('country', e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label htmlFor="f-street1">Street / House Number <span className="req">*</span></label>
                  <input id="f-street1" type="text" value={form.street1} onChange={(e) => set('street1', e.target.value)} placeholder="Building / Plot No., Street Name" maxLength={35} disabled={isReadOnly} className={errors.street1 ? 'error' : ''} />
                  {errors.street1 && <span className="field-error">{errors.street1}</span>}
                </div>
                <div className="field span-2">
                  <label htmlFor="f-street2">Street 2</label>
                  <input id="f-street2" type="text" value={form.street2} onChange={(e) => set('street2', e.target.value)} placeholder="Area or Locality" maxLength={40} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label htmlFor="f-street3">Street 3</label>
                  <input id="f-street3" type="text" value={form.street3} onChange={(e) => set('street3', e.target.value)} placeholder="Landmark or Nearby Area (optional)" maxLength={40} disabled={isReadOnly} />
                </div>
                <div className="field span-2">
                  <label htmlFor="f-street4">Street 4</label>
                  <input id="f-street4" type="text" value={form.street4} onChange={(e) => set('street4', e.target.value)} placeholder="Additional address detail (optional)" maxLength={40} disabled={isReadOnly} />
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
                  <label htmlFor="f-dob">Date of Birth/Commencement</label>
                  <input
                    id="f-dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set('date_of_birth', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="field span-2">
                  <label htmlFor="f-pan-number">PAN Number <span className="req">*</span></label>
                  <input
                    id="f-pan-number"
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
                  <label htmlFor="f-pan-name">PAN Name {isPanNameEditable(form.pan_number) && <span className="req">*</span>}</label>
                  <input
                    id="f-pan-name"
                    type="text"
                    value={form.pan_name}
                    onChange={(e) => set('pan_name', e.target.value)}
                    placeholder="Name as per PAN card"
                    disabled={isReadOnly || !isPanNameEditable(form.pan_number)}
                    className={errors.pan_name ? 'error' : ''}
                  />
                  <span className="hint">
                    {isPanNameEditable(form.pan_number)
                      ? 'Individual/HUF PAN — enter the name exactly as per the PAN card.'
                      : 'Defaults to company name for this PAN type.'}
                  </span>
                  {errors.pan_name && <span className="field-error">{errors.pan_name}</span>}
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
                    <label htmlFor="f-gst-number">GST Number <span className="req">*</span></label>
                    <input
                      id="f-gst-number"
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

            {!isCustomer && (
            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏦</div>Bank Account Details</div>
              <div className="grid-2">
                <div className="field span-2">
                  <label htmlFor="f-account-holder">Account Holder Name <span className="req">*</span></label>
                  <input id="f-account-holder" type="text" value={form.account_holder_name} onChange={(e) => set('account_holder_name', e.target.value)} placeholder="As per bank records" disabled={isReadOnly} className={errors.account_holder_name ? 'error' : ''} />
                  {errors.account_holder_name && <span className="field-error">{errors.account_holder_name}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-bank-name">Bank Name <span className="req">*</span></label>
                  <select id="f-bank-name" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} disabled={isReadOnly} className={errors.bank_name ? 'error' : ''}>
                    <option value="">— Select bank —</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                  {errors.bank_name && <span className="field-error">{errors.bank_name}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-branch-name">Branch Name <span className="req">*</span></label>
                  <input id="f-branch-name" type="text" value={form.branch_name} onChange={(e) => set('branch_name', e.target.value)} placeholder="Branch" disabled={isReadOnly} className={errors.branch_name ? 'error' : ''} />
                  {errors.branch_name && <span className="field-error">{errors.branch_name}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-account-number">Account Number <span className="req">*</span></label>
                  <input id="f-account-number" type="text" value={form.account_number} onChange={(e) => set('account_number', e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 34))} placeholder="Account number" maxLength={34} style={{ fontFamily: 'var(--mono)' }} disabled={isReadOnly} className={errors.account_number ? 'error' : ''} />
                  {errors.account_number && <span className="field-error">{errors.account_number}</span>}
                </div>
                <div className="field">
                  <label htmlFor="f-ifsc">IFSC Code <span className="req">*</span></label>
                  <input id="f-ifsc" type="text" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" maxLength={11} style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }} disabled={isReadOnly} className={errors.ifsc_code ? 'error' : ''} />
                  <span className="hint">Format: 4 letters + 0 + 6 alphanumeric</span>
                  {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
                  {ifscLookupLoading && (
                    <span className="field-hint-row"><span className="spinner-mini" aria-hidden="true" />Verifying IFSC…</span>
                  )}
                  {ifscNotFound && <span className="field-error">IFSC code not found in bank registry.</span>}
                  {ifscBankMismatch && (
                    <span className="field-error">Selected bank doesn't match this IFSC's bank ({ifscBankMismatch}).</span>
                  )}
                </div>
              </div>
            </div>
            )}

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => goToStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => goToStep(3)}>Continue → MSME & Docs</button>
            </div>
          </>
        )}

        {/* ── STEP 3: MSME & Documents ── */}
        {step === 3 && (
          <>
            {!isCustomer && (
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
                    <label htmlFor="f-msme-category">MSME Category <span className="req">*</span></label>
                    <select id="f-msme-category" value={form.msme_category} onChange={(e) => set('msme_category', e.target.value)} disabled={isReadOnly} className={errors.msme_category ? 'error' : ''}>
                      <option value="">— Select —</option>
                      {MSME_REGISTERED_OPTIONS.map(({ code, description }) => (
                        <option key={code} value={code}>{code} - {description}</option>
                      ))}
                    </select>
                    {errors.msme_category && <span className="field-error">{errors.msme_category}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="f-udyam-number">Udyam Registration Number <span className="req">*</span></label>
                    <input id="f-udyam-number" type="text" value={form.udyam_number} onChange={(e) => set('udyam_number', e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} disabled={isReadOnly} className={errors.udyam_number ? 'error' : ''} />
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
            )}

            <div className="card">
              <div className="card-title">
                <div className="card-title-icon">📎</div>
                Document Upload
                <span className="doc-upload-hint">PDF, JPG, PNG · Max 10 MB</span>
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
                    <div className="doc-empty-note">
                      🚫 <strong>Not required</strong> — No GST registration
                    </div>
                  )}
                </div>

                {!isCustomer && (
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
                )}

                {!isCustomer && (
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
                    <div className="doc-empty-note is-mna">
                      🚫 <strong>Not required</strong> — Status: MNA
                    </div>
                  )}
                </div>
                )}

                {tokenData?.onboarding?.documents?.filter((doc) => doc.document_type === 'OTHER').map((doc) => (
                  <div className="doc-card" key={doc.id}>
                    <div className="doc-card-head">
                      <div className="doc-card-title">📎 {doc.label || 'Additional Document'}</div>
                    </div>
                    <div className="file-selected">
                      <span>📄</span>
                      <span className="file-name">{doc.original_filename}</span>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="doc-view-link">View</a>
                      )}
                    </div>
                  </div>
                ))}

                {!isReadOnly && extraDocs.map((doc) => (
                  <div className="doc-card" key={doc.id}>
                    <div className="doc-card-head">
                      <div className="doc-card-title">📎 Additional Document</div>
                      <button type="button" className="file-remove" onClick={() => removeExtraDoc(doc.id)} title="Remove" aria-label="Remove this additional document">✕</button>
                    </div>
                    <label htmlFor={`extra-doc-label-${doc.id}`} className="sr-only">Document name</label>
                    <input
                      id={`extra-doc-label-${doc.id}`}
                      type="text"
                      value={doc.label}
                      onChange={(e) => updateExtraDoc(doc.id, { label: e.target.value })}
                      placeholder="Document name (e.g. Board Resolution)"
                      style={{ marginBottom: 8 }}
                    />
                    <FileUploadField
                      value={doc.file}
                      onChange={(f) => updateExtraDoc(doc.id, { file: f })}
                    />
                  </div>
                ))}
              </div>

              {!isReadOnly && (
                <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={addExtraDoc}>
                  + Add Document
                </button>
              )}
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
                <div className="summary-row span-2"><span className="summary-key">Address</span><span className="summary-val">{[form.street1, form.street2, form.street3, form.street4].filter(Boolean).join(', ')}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">🏛️</div>Review — Tax{!isCustomer ? ' & Bank' : ''}</div>
              <div className="summary-grid">
                <div className="summary-row"><span className="summary-key">PAN</span><span className="summary-val mono">{form.pan_number}</span></div>
                <div className="summary-row"><span className="summary-key">PAN Name</span><span className="summary-val">{form.pan_name}</span></div>
                <div className="summary-row"><span className="summary-key">GST</span><span className="summary-val mono">{form.gst_applicable ? form.gst_number : 'Not Applicable'}</span></div>
                {!isCustomer && (
                  <>
                    <div className="summary-row"><span className="summary-key">Account Holder</span><span className="summary-val">{form.account_holder_name}</span></div>
                    <div className="summary-row"><span className="summary-key">Bank</span><span className="summary-val">{form.bank_name}</span></div>
                    <div className="summary-row"><span className="summary-key">Branch</span><span className="summary-val">{form.branch_name}</span></div>
                    <div className="summary-row"><span className="summary-key">Account No.</span><span className="summary-val mono">{form.account_number}</span></div>
                    <div className="summary-row"><span className="summary-key">IFSC</span><span className="summary-val mono">{form.ifsc_code}</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-title"><div className="card-title-icon">📎</div>Review — Documents</div>
              {!isCustomer && (
                <div className="summary-grid" style={{ marginBottom: '1rem' }}>
                  <div className="summary-row"><span className="summary-key">MSME Status</span><span className="summary-val">{form.msme_applicable ? formatMsmeOption(form.msme_category) : formatMsmeOption('MNA')}</span></div>
                  {form.msme_applicable && <div className="summary-row"><span className="summary-key">Udyam No.</span><span className="summary-val mono">{form.udyam_number}</span></div>}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['PAN', 'GST', 'CHEQUE', 'MSME'].map((t) => {
                  const f = files[t]
                  if (isCustomer && (t === 'CHEQUE' || t === 'MSME')) return null
                  const required = t === 'PAN' || t === 'CHEQUE' || (t === 'GST' && form.gst_applicable) || (t === 'MSME' && form.msme_applicable)
                  if (!required) return null
                  return (
                    <div key={t} className={`review-doc-chip ${f ? 'is-present' : 'is-missing'}`}>
                      {f ? '✅' : '⚠️'} {t} {f ? f.name : '(missing)'}
                    </div>
                  )
                })}
              </div>
            </div>

            {errors.submit && (
              <div className="onboarding-error-banner" role="alert">
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
