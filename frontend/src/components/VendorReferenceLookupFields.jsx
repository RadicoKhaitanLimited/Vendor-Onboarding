import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function VendorReferenceLookupFields({
  code,
  onCodeChange,
  onRangeChange,
  onMappingChange,
}) {
  const [lookupValue, setLookupValue] = useState(code || '')
  const [loading, setLoading] = useState(false)
  const [mapping, setMapping] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setLookupValue(code || '')
  }, [code])

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
      } catch (error) {
        setMapping(null)
        onMappingChange?.(null)
        setMessage(error.response?.data?.detail || 'No Vendor Reference Master mapping found for this value.')
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [lookupValue])

  return (
    <div className="vendor-ref-result span-2">
      <div className="field vendor-ref-range-field">
        <label>Vendor Reference Code</label>
        <input
          type="text"
          value={lookupValue}
          onChange={(event) => {
            setLookupValue(event.target.value)
            onCodeChange?.(event.target.value)
            onRangeChange?.('')
          }}
          placeholder="Enter vendor reference code"
          style={{ fontFamily: 'var(--mono)' }}
        />
      </div>

      <div className="vendor-ref-result-head">
        <span>Vendor Reference Master</span>
        {loading && <strong>Fetching...</strong>}
        {!loading && mapping && <strong>Matched {mapping.vendor_reference_range_display}</strong>}
        {!loading && !mapping && message && <strong className="warn">Pending</strong>}
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
        <div className="vendor-ref-empty">{message || 'Enter a Vendor Reference Code to fetch GL details.'}</div>
      )}
    </div>
  )
}
