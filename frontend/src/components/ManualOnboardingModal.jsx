import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
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

const DOC_TYPES = [
  { type: 'PAN',    label: 'PAN Card',          icon: '🪪' },
  { type: 'GST',    label: 'GST Certificate',    icon: '🧾' },
  { type: 'CHEQUE', label: 'Cancelled Cheque',   icon: '🏦' },
  { type: 'MSME',   label: 'MSME Certificate',   icon: '🏅' },
]

const EMPTY_FORM = {
  onboarding_type:     '',
  company_name:        '',
  contact_person:      '',
  emails:              [''],
  phones:              [''],
  date_of_birth:       '',
  district:            '',
  city:                '',
  state:               '',
  pincode:             '',
  country:             'India',
  street1:             '',
  street2:             '',
  street3:             '',
  street4:             '',
  pan_number:          '',
  gst_applicable:      null,
  gst_number:          '',
  account_holder_name: '',
  bank_name:           '',
  branch_name:         '',
  account_number:      '',
  ifsc_code:           '',
  msme_applicable:         null,
  msme_category:           '',
  udyam_number:            '',
  reference_vendor_code:   '',
  vendor_reference_range:  '',
  reference_name:          '',
  gl_account_number:       '',
  gl_account_description:  '',
  reference_purchase_orgs: [],
  purchase_orgs_to_open:   '',
  search_term:             '',
  company_code_to_open:    '',
  payment_terms:           '',
  tds_codes:               '',
}

export default function ManualOnboardingModal({ onClose, onCreated }) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [files, setFiles] = useState({ PAN: null, GST: null, CHEQUE: null, MSME: null })

  const validateForm = (nextForm, nextFiles, nextTouched = touched, showAll = submitAttempted) => {
    const e = {}
    const shouldRequire = (field) => showAll || nextTouched[field]

    if (shouldRequire('onboarding_type') && !nextForm.onboarding_type) e.onboarding_type = 'Please select Vendor or Customer.'
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

    if (shouldRequire('pan_doc') && !nextFiles.PAN) e.pan_doc = 'PAN Card document is required.'
    if (nextForm.gst_applicable && shouldRequire('gst_doc') && !nextFiles.GST) e.gst_doc = 'GST Certificate is required.'
    if (shouldRequire('cheque_doc') && !nextFiles.CHEQUE) e.cheque_doc = 'Cancelled cheque is required.'
    if (nextForm.msme_applicable && shouldRequire('msme_doc') && !nextFiles.MSME) e.msme_doc = 'MSME Certificate is required.'

    return e
  }

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

  const validate = () => {
    const e = validateForm(form, files, touched, true)
    setSubmitAttempted(true)
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFileChange = (docType, file) => {
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) { toast.error('Invalid file', 'Only PDF, JPG, PNG allowed.'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Too large', 'File must be under 10 MB.'); return }
    updateFile(docType, file)
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

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      // 1. Create the onboarding record
      const { data: onboarding } = await api.post('/onboarding/manual/', {
        onboarding_type:     form.onboarding_type,
        company_name:        form.company_name,
        contact_person:      form.contact_person,
        emails:              form.emails.filter(Boolean),
        phones:              form.phones.filter(Boolean),
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

      // 2. Upload selected documents
      const uploads = Object.entries(files)
        .filter(([, file]) => file)
        .map(([docType, file]) => {
          const fd = new FormData()
          fd.append('document_type', docType)
          fd.append('file', file)
          return api.post(`/documents/admin/${onboarding.id}/`, fd, {
            headers: { 'Content-Type': undefined },
          })
        })
      if (uploads.length) await Promise.all(uploads)

      const label = form.onboarding_type === 'VENDOR' ? 'Vendor' : 'Customer'
      toast.success('Created', `${label} ${onboarding.onboarding_code} created successfully.`)
      onCreated()
    } catch (err) {
      const errData = err.response?.data
      if (errData && typeof errData === 'object' && !errData.detail) {
        setErrors(errData)
        toast.error('Validation error', 'Please fix the highlighted fields.')
      } else {
        toast.error('Failed', errData?.detail || 'Could not create onboarding.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const entityType = form.onboarding_type === 'VENDOR' ? 'Vendor'
    : form.onboarding_type === 'CUSTOMER' ? 'Customer' : ''

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel edit-panel">

        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Manual Onboarding</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Fill all details to register a vendor or customer directly.
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Type Selector ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">
            <div className="card-title-icon">🏷️</div>Registration Type
            <span className="req" style={{ marginLeft: 4 }}>*</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { type: 'VENDOR',   label: 'Vendor',   desc: 'Supplier / manufacturer providing goods or services', color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE' },
              { type: 'CUSTOMER', label: 'Customer',  desc: 'Buyer / distributor purchasing goods or services',    color: '#15803D', bg: '#DCFCE7', border: '#A7F3C5' },
            ].map(({ type, label, desc, color, bg, border }) => (
              <button
                key={type}
                type="button"
                onClick={() => set('onboarding_type', type)}
                style={{
                  padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  border: `2px solid ${form.onboarding_type === type ? color : 'var(--border-2)'}`,
                  background: form.onboarding_type === type ? bg : 'var(--surface)',
                  textAlign: 'left', transition: 'all .15s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: form.onboarding_type === type ? color : 'var(--text)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
          {errors.onboarding_type && <span className="field-error" style={{ marginTop: 6, display: 'block' }}>{errors.onboarding_type}</span>}
        </div>

        {/* ── Company & Contact ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">🏢</div>Company & Contact</div>
          <div className="grid-2">
            <div className="field span-2">
              <label>{entityType || 'Company'} Name <span className="req">*</span></label>
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
              <label>Phone Number(s) <span className="req">*</span></label>
              <MultiEntryField type="tel" values={form.phones} onChange={(v) => set('phones', v)} placeholder="+91 98765 43210" tag="Phone" />
              {errors.phones && <span className="field-error">{errors.phones}</span>}
            </div>

          </div>
        </div>

        {/* ── Address ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title"><div className="card-title-icon">📍</div>Registered Address</div>
          <div className="grid-2">
            <div className="field">
              <label>District <span className="req">*</span></label>
              <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="District" className={errors.district ? 'error' : ''} />
              {errors.district && <span className="field-error">{errors.district}</span>}
            </div>
            <div className="field">
              <label>City <span className="req">*</span></label>
              <input type="text" value={form.city} onChange={(e) => set('city', e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="City" className={errors.city ? 'error' : ''} />
              {errors.city && <span className="field-error">{errors.city}</span>}
            </div>
            <div className="field">
              <label>State <span className="req">*</span></label>
              <select value={form.state} onChange={(e) => set('state', e.target.value)} className={errors.state ? 'error' : ''}>
                <option value="">— Select state —</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <span className="field-error">{errors.state}</span>}
            </div>
            <div className="field">
              <label>PIN Code <span className="req">*</span></label>
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
              <label>Street / House No. <span className="req">*</span></label>
              <input type="text" value={form.street1} onChange={(e) => set('street1', e.target.value)} maxLength={35} placeholder="Building / Plot No., Street Name" className={errors.street1 ? 'error' : ''} />
              {errors.street1 && <span className="field-error">{errors.street1}</span>}
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
              <label>PAN Number <span className="req">*</span></label>
              <input type="text" value={form.pan_number}
                onChange={(e) => set('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F" maxLength={10}
                style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                className={errors.pan_number ? 'error' : ''} />
              <span className="hint">Format: 5 letters + 4 digits + 1 letter</span>
              {errors.pan_number && <span className="field-error">{errors.pan_number}</span>}
            </div>
            <div className="field span-2">
              <label>GST Applicable? <span className="req">*</span></label>
              <div className="toggle-group" style={{ marginTop: 6 }}>
                <div className="toggle-opt">
                  <input type="radio" id="man-gst-yes" name="man-gst" checked={form.gst_applicable === true} onChange={() => set('gst_applicable', true)} />
                  <label htmlFor="man-gst-yes">Yes — Has GST Number</label>
                </div>
                <div className="toggle-opt">
                  <input type="radio" id="man-gst-no" name="man-gst" checked={form.gst_applicable === false} onChange={() => set('gst_applicable', false)} />
                  <label htmlFor="man-gst-no">No — Not Registered</label>
                </div>
              </div>
              {errors.gst_applicable && <span className="field-error">{errors.gst_applicable}</span>}
            </div>
            {form.gst_applicable && (
              <div className="field span-2">
                <label>GST Number <span className="req">*</span></label>
                <input type="text" value={form.gst_number}
                  onChange={(e) => set('gst_number', e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="22ABCDE1234F1Z5" maxLength={15}
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                  className={errors.gst_number ? 'error' : ''} />
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
            <label>MSME Registered? <span className="req">*</span></label>
            <div className="toggle-group" style={{ marginTop: 6 }}>
              <div className="toggle-opt">
                <input type="radio" id="man-msme-yes" name="man-msme" checked={form.msme_applicable === true} onChange={() => set('msme_applicable', true)} />
                <label htmlFor="man-msme-yes">Yes — MSME Registered</label>
              </div>
              <div className="toggle-opt">
                <input type="radio" id="man-msme-no" name="man-msme" checked={form.msme_applicable === false} onChange={() => set('msme_applicable', false)} />
                <label htmlFor="man-msme-no">No — Not Registered (MNA)</label>
              </div>
            </div>
            {errors.msme_applicable && <span className="field-error">{errors.msme_applicable}</span>}
          </div>
          {form.msme_applicable && (
            <div className="grid-2">
              <div className="field">
                <label>MSME Category <span className="req">*</span></label>
                <select value={form.msme_category} onChange={(e) => set('msme_category', e.target.value)} className={errors.msme_category ? 'error' : ''}>
                  <option value="">— Select —</option>
                  {MSME_REGISTERED_OPTIONS.map(({ code, description }) => (
                    <option key={code} value={code}>{code} - {description}</option>
                  ))}
                </select>
                {errors.msme_category && <span className="field-error">{errors.msme_category}</span>}
              </div>
              <div className="field">
                <label>Udyam Number <span className="req">*</span></label>
                <input type="text" value={form.udyam_number}
                  onChange={(e) => set('udyam_number', e.target.value.toUpperCase())}
                  placeholder="UDYAM-XX-00-0000000"
                  style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                  className={errors.udyam_number ? 'error' : ''} />
                {errors.udyam_number && <span className="field-error">{errors.udyam_number}</span>}
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
              PDF, JPG, PNG · Max 10 MB
            </span>
          </div>
          <div className="doc-section">
            {DOC_TYPES.map(({ type, label, icon }) => {
              const file = files[type]
              return (
                  <div key={type} className="doc-card">
                    <div className="doc-card-head">
                      <div className="doc-card-title">{icon} {label}</div>
                      {(type === 'PAN' || type === 'CHEQUE' || (type === 'GST' && form.gst_applicable) || (type === 'MSME' && form.msme_applicable)) && (
                        <span className="badge badge-required">Required</span>
                      )}
                      {file && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#DCFCE7', color: '#166534', textTransform: 'uppercase', letterSpacing: '.3px' }}>
                          Ready
                      </span>
                    )}
                  </div>
                  {file ? (
                    <>
                      <div className="file-selected" style={{ marginBottom: 8 }}>
                        <span>📄</span>
                        <span className="file-name">{file.name}</span>
                        <button className="file-remove" onClick={() => updateFile(type, null)}>✕</button>
                      </div>
                      <label style={{ cursor: 'pointer', fontSize: 11, color: 'var(--brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: 'var(--brand-light)', borderRadius: 6, border: '1px solid rgba(26,86,219,.15)' }}>
                        Replace
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                          onChange={(e) => { handleFileChange(type, e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                    </>
                  ) : (
                    <div className="file-upload-zone" style={{ padding: 14 }}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => { handleFileChange(type, e.target.files?.[0]); e.target.value = '' }} />
                      <div className="file-icon" style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                      <div className="file-label"><span>Click to upload</span> or drag & drop</div>
                      <div className="file-sub">PDF, JPG, PNG · Max 10 MB</div>
                    </div>
                  )}
                  {errors[`${type.toLowerCase()}_doc`] && (
                    <span className="field-error">{errors[`${type.toLowerCase()}_doc`]}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          paddingTop: '1rem', paddingBottom: '0.5rem',
          borderTop: '1px solid var(--border)',
          position: 'sticky', bottom: 0, background: 'var(--surface)',
        }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Creating…</>
              : `Create ${entityType || 'Onboarding'}`
            }
          </button>
        </div>

      </div>
    </div>
  )
}
