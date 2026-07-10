import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function BulkImportModal({ onClose, onImported }) {
  const toast = useToast()
  const [type, setType] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowed.includes(selected.type) && !selected.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Invalid file', 'Please upload an .xlsx Excel file.')
      event.target.value = ''
      return
    }
    setFile(selected)
    setResult(null)
    setError('')
  }

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const response = await api.get('/onboarding/bulk-import/template/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'bulk_onboarding_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed', 'Could not download the template.')
    } finally {
      setDownloading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!type) {
      setError('Please select Vendor or Customer.')
      return
    }
    if (!file) {
      setError('Please choose an Excel file to upload.')
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('onboarding_type', type)
      formData.append('file', file)
      const { data } = await api.post('/onboarding/bulk-import/', formData, {
        headers: { 'Content-Type': undefined },
      })
      setResult(data)
      if (data.created_count > 0) {
        toast.success('Import complete', `${data.created_count} record(s) created${data.error_count ? `, ${data.error_count} row(s) failed` : '.'}`)
        onImported()
      } else {
        toast.error('No records created', 'All rows failed validation. See details below.')
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        setResult(data)
      } else {
        setError(data?.file?.[0] || data?.onboarding_type?.[0] || data?.detail || 'Import failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" style={{ width: 560 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Bulk Import from Excel</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: '1.25rem' }}>
          Upload an Excel file with vendor or customer details to create multiple records at once.
          New records are saved as drafts — open each one to attach documents before sending for approval.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginBottom: '1.25rem' }}
          onClick={handleDownloadTemplate}
          disabled={downloading}
        >
          {downloading ? 'Preparing…' : 'Download Excel Template'}
        </button>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: '1rem' }}>
            <label>Onboarding Type <span className="req">*</span></label>
            <div className="toggle-group" style={{ marginTop: 6 }}>
              <div className="toggle-opt">
                <input type="radio" id="bulk-type-vendor" name="bulk-ob-type" value="VENDOR" checked={type === 'VENDOR'} onChange={() => setType('VENDOR')} />
                <label htmlFor="bulk-type-vendor">Vendor Onboarding</label>
              </div>
              <div className="toggle-opt">
                <input type="radio" id="bulk-type-customer" name="bulk-ob-type" value="CUSTOMER" checked={type === 'CUSTOMER'} onChange={() => setType('CUSTOMER')} />
                <label htmlFor="bulk-type-customer">Customer Onboarding</label>
              </div>
            </div>
          </div>

          <div className="field" style={{ marginBottom: '1.5rem' }}>
            <label>Excel File <span className="req">*</span></label>
            <input type="file" accept=".xlsx" onChange={handleFileChange} />
            {file && <span className="hint">{file.name}</span>}
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3C5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--success)', marginBottom: 8 }}>
                {result.created_count} record(s) created successfully.
              </div>
              {result.errors?.length > 0 && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--danger)', maxHeight: 200, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{result.errors.length} row(s) failed:</div>
                  {result.errors.map((rowError) => (
                    <div key={rowError.row} style={{ marginBottom: 6 }}>
                      <strong>Row {rowError.row}:</strong> {Object.values(rowError.errors).flat().join(' ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><div className="spinner" /> Importing...</> : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
