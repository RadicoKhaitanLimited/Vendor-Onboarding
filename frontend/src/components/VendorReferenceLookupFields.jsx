import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function VendorReferenceLookupFields({
  code,
  onCodeChange,
  onRangeChange,
  onMappingChange,
  required,
  error,
}) {
  const [lookupValue, setLookupValue] = useState(code || '')
  const [loading, setLoading] = useState(false)
  const [mapping, setMapping] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setLookupValue(code || '')
  }, [code])

  const MAX_LENGTH = 6
  const INVALID_MESSAGE = 'Please provide the right business partner number.'

  useEffect(() => {
    const enteredValue = String(lookupValue || '').trim()
    const normalizedValue = enteredValue.replace(/\s/g, '')

    setMapping(null)
    setMessage('')
    onMappingChange?.(null)

    if (!normalizedValue) return

    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await api.post('/onboarding/vendor-reference-master/process/', {
          vendor_reference_code: normalizedValue,
        })
        setMapping(data)
        onRangeChange?.(data.vendor_reference_range)
        onMappingChange?.(data)
        setMessage('')
      } catch {
        setMapping(null)
        onMappingChange?.(null)
        setMessage(INVALID_MESSAGE)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [lookupValue])

  return (
    <div className="vendor-ref-result span-2">
      <div className="field vendor-ref-range-field">
        <label>Business Partner Number {required && <span className="req">*</span>}</label>
        <input
          type="text"
          inputMode="numeric"
          value={lookupValue}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, MAX_LENGTH)
            setLookupValue(digitsOnly)
            onCodeChange?.(digitsOnly)
            onRangeChange?.('')
          }}
          placeholder="Enter business partner number"
          style={{ fontFamily: 'var(--mono)' }}
          className={(!loading && message) || error ? 'error' : ''}
        />
        {error && <span className="field-error">{error}</span>}
      </div>

      <div className="vendor-ref-result-head">
        <span>Vendor Reference Master</span>
        {loading && <strong>Fetching...</strong>}
        {!loading && mapping && <strong>Matched {mapping.vendor_reference_range_display}</strong>}
        {!loading && !mapping && message && <strong className="warn">Not found</strong>}
      </div>

      {mapping ? (
        <div className="vendor-ref-result-grid">
          <div>
            <span>Reference Range</span>
            <strong>{mapping.vendor_reference_range_display}</strong>
          </div>
          <div>
            <span>Reference Name</span>
            <strong>{mapping.reference_name}</strong>
          </div>
          <div>
            <span>New Grouping</span>
            <strong>{mapping.group_code || '-'}</strong>
          </div>
          <div>
            <span>NR</span>
            <strong>{mapping.nr_group || '-'}</strong>
          </div>
          <div>
            <span>GL Account Number</span>
            <strong>{mapping.gl_account_number}</strong>
          </div>
          <div>
            <span>GL Account Description</span>
            <strong>{mapping.gl_account_description}</strong>
          </div>
        </div>
      ) : (
        <div className="vendor-ref-empty">{message || 'Enter a Business Partner Number to fetch GL details.'}</div>
      )}
    </div>
  )
}
