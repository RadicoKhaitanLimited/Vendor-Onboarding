import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import PaymentTermsSelect from './PaymentTermsSelect'
import PurchaseOrganizationFields from './PurchaseOrganizationFields'
import CompanyCodeSelect from './CompanyCodeSelect'
import TDSCodeSelect from './TDSCodeSelect'
import SearchTermSelect from './SearchTermSelect'
import SalesOrganizationSelect from './SalesOrganizationSelect'
import DistributionChannelSelect from './DistributionChannelSelect'
import DivisionSelect from './DivisionSelect'
import TransportationZoneSelect from './TransportationZoneSelect'
import CustomerCompanyCodeSelect from './CustomerCompanyCodeSelect'
import CustomerSearchTermSelect from './CustomerSearchTermSelect'
import SalesReferenceOrgSelect from './SalesReferenceOrgSelect'
import DeliveryPlantSelect from './DeliveryPlantSelect'
import VendorReferenceLookupFields from './VendorReferenceLookupFields'
import { companyCodeForPurchaseOrg } from '../utils/companyCode'
import { useIfscVerification } from '../utils/useIfscVerification'

const ACCOUNT_NUMBER_RE = /^[A-Za-z0-9]{9,34}$/
const isValidAccountNumber = (value) => ACCOUNT_NUMBER_RE.test(value.trim())
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

const BANKS = [
  'State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra Bank',
  'Punjab National Bank','Bank of Baroda','Canara Bank','Union Bank of India',
  'IDFC First Bank','Yes Bank','IndusInd Bank','Federal Bank','UCO Bank',
  'Indian Bank','Central Bank of India','Bank of India','Other',
]

const REQUEST_TYPES = [
  { type: 'EXTENSION', label: 'Extension', desc: 'Add a new purchase org / sales area to an existing account', color: 'var(--brand-dark)', bg: 'var(--brand-light)', border: 'rgba(26,86,219,.35)' },
  { type: 'EDIT', label: 'Edit', desc: 'Change SAP / ERP reference details on an existing account', color: 'var(--gold-dark)', bg: 'var(--gold-light)', border: 'var(--gold-border)' },
]

const TARGET_TYPES = [
  { type: 'VENDOR', label: 'Vendor', desc: 'Supplier / manufacturer providing goods or services', color: 'var(--brand-dark)', bg: 'var(--brand-light)', border: 'rgba(26,86,219,.35)' },
  { type: 'CUSTOMER', label: 'Customer', desc: 'Buyer / distributor purchasing goods or services', color: 'var(--gold-dark)', bg: 'var(--gold-light)', border: 'var(--gold-border)' },
]

const EMPTY_FORM = {
  account_number:          '',
  company_name:            '',
  remarks_request:         '',
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
  account_holder_name:     '',
  bank_name:               '',
  branch_name:             '',
  bank_account_number:     '',
  ifsc_code:               '',
  sales_reference_orgs:    [],
  customer_search_term:    '',
  sales_organization:      [],
  distribution_channel:    '',
  division:                '',
  delivery_plant:          '',
  transportation_zone:     '',
  customer_company_code:   '',
}

export default function ExtensionEditModal({ onClose, onCreated }) {
  const toast = useToast()
  const [requestType, setRequestType] = useState('')
  const [targetType, setTargetType] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const isCustomer = targetType === 'CUSTOMER'
  const step = !requestType ? 1 : !targetType ? 2 : 3

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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

  const setSalesReferenceOrgs = (value) => {
    const selectedValues = Array.isArray(value) ? value : []
    setForm((f) => ({
      ...f,
      sales_reference_orgs: selectedValues,
      sales_organization: selectedValues,
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

  const { ifscLookupLoading, ifscBankMismatch, ifscNotFound } = useIfscVerification(
    form.ifsc_code, form.bank_name, form.branch_name, set
  )

  const validate = () => {
    const e = {}

    if (!isCustomer) {
      const bankAccountNumber = form.bank_account_number.trim()
      if (bankAccountNumber && !isValidAccountNumber(bankAccountNumber)) e.bank_account_number = 'Account number must be 9-34 alphanumeric characters, no spaces.'
      if (form.ifsc_code && !IFSC_RE.test(form.ifsc_code.toUpperCase())) e.ifsc_code = 'Invalid IFSC format.'
    }

    return e
  }

  const handleBack = () => {
    if (step === 3) setTargetType('')
    else if (step === 2) setRequestType('')
  }

  const handleSubmit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return

    setSubmitting(true)
    try {
      const { data } = await api.post('/onboarding/extension-edit/create/', {
        request_type:            requestType,
        target_type:             targetType,
        account_number:          form.account_number.trim(),
        company_name:            form.company_name,
        remarks_request:         form.remarks_request,
        reference_vendor_code:   isCustomer ? '' : form.reference_vendor_code,
        vendor_reference_range:  isCustomer ? '' : form.vendor_reference_range,
        reference_name:          isCustomer ? '' : form.reference_name,
        gl_account_number:       isCustomer ? '' : form.gl_account_number,
        gl_account_description:  isCustomer ? '' : form.gl_account_description,
        reference_purchase_orgs: isCustomer ? [] : form.reference_purchase_orgs,
        purchase_orgs_to_open:   isCustomer ? '' : form.purchase_orgs_to_open,
        search_term:             isCustomer ? '' : form.search_term,
        company_code_to_open:    isCustomer ? '' : form.company_code_to_open,
        payment_terms:           form.payment_terms,
        tds_codes:                isCustomer ? '' : form.tds_codes,
        account_holder_name:     isCustomer ? '' : form.account_holder_name,
        bank_name:                isCustomer ? '' : form.bank_name,
        branch_name:              isCustomer ? '' : form.branch_name,
        bank_account_number:      isCustomer ? '' : form.bank_account_number,
        ifsc_code:                isCustomer ? '' : (form.ifsc_code ? form.ifsc_code.toUpperCase() : ''),
        sales_reference_orgs:     isCustomer ? form.sales_reference_orgs : [],
        customer_search_term:     isCustomer ? form.customer_search_term : '',
        sales_organization:       isCustomer ? form.sales_organization : [],
        distribution_channel:     isCustomer ? form.distribution_channel : '',
        division:                 isCustomer ? form.division : '',
        delivery_plant:           isCustomer ? form.delivery_plant : '',
        transportation_zone:      isCustomer ? form.transportation_zone : '',
        customer_company_code:    isCustomer ? form.customer_company_code : '',
      })

      const label = targetType === 'VENDOR' ? 'Vendor' : 'Customer'
      toast.success('Request created', `${label} ${requestType.toLowerCase()} request ${data.request_code} is ready to send for approval.`)
      onCreated()
    } catch (err) {
      const errData = err.response?.data
      if (errData && typeof errData === 'object' && !errData.detail) {
        setErrors(errData)
        toast.error('Validation error', 'Please fix the highlighted fields.')
      } else {
        toast.error('Failed', errData?.detail || 'Could not create request.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel edit-panel manual-onboarding-panel">

        <div className="modal-header manual-modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Extension / Edit Request</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Request a change to an existing, already-approved vendor or customer account.
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <div className="card manual-card manual-type-card">
            <div className="card-title">
              <div className="card-title-icon">🔧</div>Request Type
              <span className="req" style={{ marginLeft: 4 }}>*</span>
            </div>
            <div className="manual-type-grid">
              {REQUEST_TYPES.map(({ type, label, desc, color, bg, border }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRequestType(type)}
                  className="manual-type-option"
                  style={{ '--option-color': color, '--option-bg': bg, '--option-border': border }}
                >
                  <div className="manual-type-label">{label}</div>
                  <div className="manual-type-desc">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card manual-card manual-type-card">
            <div className="card-title">
              <div className="card-title-icon">🏷️</div>{requestType === 'EXTENSION' ? 'Extension' : 'Edit'} for
              <span className="req" style={{ marginLeft: 4 }}>*</span>
            </div>
            <div className="manual-type-grid">
              {TARGET_TYPES.map(({ type, label, desc, color, bg, border }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetType(type)}
                  className="manual-type-option"
                  style={{ '--option-color': color, '--option-bg': bg, '--option-border': border }}
                >
                  <div className="manual-type-label">{label}</div>
                  <div className="manual-type-desc">{desc}</div>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 14 }} onClick={handleBack}>
              ← Back
            </button>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="card manual-card" style={{ marginBottom: '1rem' }}>
              <div className="card-title">
                <div className="card-title-icon">🏢</div>
                {targetType === 'VENDOR' ? 'Vendor' : 'Customer'} {requestType === 'EXTENSION' ? 'Extension' : 'Edit'} Details
              </div>
              <div className="grid-2">
                <div className="field span-2">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={form.account_number}
                    onChange={(e) => set('account_number', e.target.value)}
                    placeholder="Existing SAP account / business partner number"
                    style={{ fontFamily: 'var(--mono)' }}
                  />
                </div>
                <div className="field span-2">
                  <label>{targetType === 'VENDOR' ? 'Vendor' : 'Customer'} Name</label>
                  <input type="text" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="For reference only" />
                </div>
                <div className="field span-2">
                  <label>What needs to be {requestType === 'EXTENSION' ? 'extended' : 'edited'}?</label>
                  <textarea
                    value={form.remarks_request}
                    onChange={(e) => set('remarks_request', e.target.value)}
                    placeholder={`Describe what needs to be ${requestType === 'EXTENSION' ? 'extended' : 'edited'}`}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="card manual-card" style={{ marginBottom: '1rem' }}>
              <div className="card-title"><div className="card-title-icon">🔗</div>SAP / ERP Reference Details</div>
              <div className="grid-2">
                {!isCustomer && (
                  <VendorReferenceLookupFields
                    code={form.reference_vendor_code}
                    onCodeChange={(value) => set('reference_vendor_code', value)}
                    onRangeChange={(value) => set('vendor_reference_range', value)}
                    onMappingChange={applyVendorReferenceMapping}
                    isCustomer={isCustomer}
                  />
                )}
                {isCustomer && (
                  <div className="field">
                    <label>Sales Reference Org</label>
                    <SalesReferenceOrgSelect value={form.sales_reference_orgs} onChange={setSalesReferenceOrgs} />
                  </div>
                )}
                {isCustomer && requestType !== 'EXTENSION' && (
                  <div className="field">
                    <label>Search Term</label>
                    <CustomerSearchTermSelect value={form.customer_search_term} onChange={(value) => set('customer_search_term', value)} />
                  </div>
                )}
                {isCustomer && (
                  <div className="field span-2">
                    <div className="sales-area-card">
                      <div className="card-title">Sales Area</div>
                      <div className="grid-2">
                        <div className="field">
                          <label>Company Code</label>
                          <CustomerCompanyCodeSelect value={form.customer_company_code} onChange={(value) => set('customer_company_code', value)} />
                        </div>
                        <div className="field">
                          <label>Sales Organization</label>
                          <SalesOrganizationSelect
                            value={form.sales_organization}
                            onChange={(value) => set('sales_organization', value)}
                            restrictTo={form.sales_reference_orgs}
                          />
                          {errors.sales_organization && <span className="field-error">{errors.sales_organization}</span>}
                        </div>
                        <div className="field">
                          <label>Distribution Channel</label>
                          <DistributionChannelSelect value={form.distribution_channel} onChange={(value) => set('distribution_channel', value)} />
                        </div>
                        <div className="field">
                          <label>Division</label>
                          <DivisionSelect value={form.division} onChange={(value) => set('division', value)} />
                        </div>
                        <div className="field">
                          <label>Delivery Plant</label>
                          <DeliveryPlantSelect
                            value={form.delivery_plant}
                            onChange={(value) => set('delivery_plant', value)}
                            salesOrganizations={form.sales_organization}
                            distributionChannel={form.distribution_channel}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isCustomer && (
                  <div className="field">
                    <label>Transportation Zone</label>
                    <TransportationZoneSelect value={form.transportation_zone} onChange={(value) => set('transportation_zone', value)} />
                  </div>
                )}
                {!isCustomer && (
                  <PurchaseOrganizationFields
                    referenceValue={form.reference_purchase_orgs}
                    onReferenceChange={(value) => set('reference_purchase_orgs', value)}
                    openValue={form.purchase_orgs_to_open}
                    onOpenChange={setCreatedPurchaseOrgs}
                    createdLabel={`Purchase Org. in which to be ${requestType === 'EXTENSION' ? 'Extended' : 'Edited'}`}
                    searchTermField={
                      requestType !== 'EXTENSION' && (
                        <div className="field">
                          <label>Search Term</label>
                          <SearchTermSelect value={form.search_term} onChange={(value) => set('search_term', value)} />
                        </div>
                      )
                    }
                    companyCodeField={
                      <div className="field">
                        <label>Company Code (In which to be {requestType === 'EXTENSION' ? 'Extended' : 'Edited'})</label>
                        <CompanyCodeSelect
                          value={form.company_code_to_open}
                          onChange={(value) => set('company_code_to_open', value)}
                          disabled={!!form.reference_purchase_orgs.length}
                        />
                      </div>
                    }
                  />
                )}
                {!isCustomer && errors.reference_purchase_orgs && (
                  <span className="field-error span-2">{errors.reference_purchase_orgs}</span>
                )}
                {requestType !== 'EXTENSION' && (
                  <div className="field">
                    <label>Payment Terms</label>
                    <select value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}>
                      <option value="">— Select —</option>
                      <PaymentTermsSelect />
                    </select>
                  </div>
                )}
                {!isCustomer && requestType !== 'EXTENSION' && (
                  <div className="field">
                    <label>TDS Codes</label>
                    <TDSCodeSelect value={form.tds_codes} onChange={(value) => set('tds_codes', value)} />
                  </div>
                )}
              </div>
            </div>

            {!isCustomer && (
              <div className="card manual-card" style={{ marginBottom: '1rem' }}>
                <div className="card-title"><div className="card-title-icon">🏦</div>Bank Account Details</div>
                <div className="grid-2">
                  <div className="field span-2">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      value={form.account_holder_name}
                      onChange={(e) => set('account_holder_name', e.target.value)}
                      placeholder="As per bank records"
                      className={errors.account_holder_name ? 'error' : ''}
                    />
                    {errors.account_holder_name && <span className="field-error">{errors.account_holder_name}</span>}
                  </div>
                  <div className="field">
                    <label>Bank Name</label>
                    <select value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} className={errors.bank_name ? 'error' : ''}>
                      <option value="">— Select bank —</option>
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                    {errors.bank_name && <span className="field-error">{errors.bank_name}</span>}
                  </div>
                  <div className="field">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      value={form.ifsc_code}
                      onChange={(e) => set('ifsc_code', e.target.value.toUpperCase().slice(0, 11))}
                      placeholder="SBIN0001234"
                      maxLength={11}
                      style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }}
                      className={errors.ifsc_code ? 'error' : ''}
                    />
                    <span className="hint">Format: 4 letters + 0 + 6 alphanumeric</span>
                    {errors.ifsc_code && <span className="field-error">{errors.ifsc_code}</span>}
                    {ifscLookupLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Verifying IFSC…</span>}
                    {ifscNotFound && <span className="field-error">IFSC code not found in bank registry.</span>}
                    {ifscBankMismatch && (
                      <span className="field-error">Selected bank doesn't match this IFSC's bank ({ifscBankMismatch}).</span>
                    )}
                  </div>
                  <div className="field">
                    <label>Branch Name</label>
                    <input type="text" value={form.branch_name} onChange={(e) => set('branch_name', e.target.value)} placeholder="Branch" className={errors.branch_name ? 'error' : ''} />
                    {errors.branch_name && <span className="field-error">{errors.branch_name}</span>}
                  </div>
                  <div className="field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={form.bank_account_number}
                      onChange={(e) => set('bank_account_number', e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 34))}
                      placeholder="Account number"
                      maxLength={34}
                      style={{ fontFamily: 'var(--mono)' }}
                      className={errors.bank_account_number ? 'error' : ''}
                    />
                    {errors.bank_account_number && <span className="field-error">{errors.bank_account_number}</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="manual-modal-footer" style={{
              display: 'flex', gap: 8, justifyContent: 'space-between',
              paddingTop: '1rem', paddingBottom: '0.5rem',
              borderTop: '1px solid var(--border)',
              position: 'sticky', bottom: 0, background: 'var(--surface)',
            }}>
              <button className="btn btn-secondary" onClick={handleBack} disabled={submitting}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />Creating…</>
                    : `Create ${requestType === 'EXTENSION' ? 'Extension' : 'Edit'} Request`
                  }
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
