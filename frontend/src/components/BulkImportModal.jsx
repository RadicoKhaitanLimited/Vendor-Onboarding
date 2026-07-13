import { useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BulkImportModal({ onClose, onImported }) {
  const toast = useToast()
  const [type, setType] = useState('')
  const [file, setFile] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const acceptFile = (selected) => {
    if (!selected) return
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowed.includes(selected.type) && !selected.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Invalid file', 'Please upload an .xlsx Excel file.')
      return
    }
    setResult(null)
    setError('')
    setFile(null)
    setScanning(true)
    setTimeout(() => {
      setFile(selected)
      setScanning(false)
    }, 900)
  }

  const handleFileChange = (event) => {
    acceptFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const handleRemoveFile = () => {
    setFile(null)
    setScanning(false)
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
      <div className="modal-dialog bulk-import-dialog">
        <div className="modal-header">
          <div>
            <h2 className="bulk-import-title">Bulk Import from Excel</h2>
            <p className="bulk-import-subtitle">
              Create multiple vendor or customer records at once. New records are saved as
              drafts — open each one to attach documents before sending for approval.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bulk-import-section">
            <div className="bulk-import-section-head">
              <span className="bulk-import-step">1</span>
              <span>Choose onboarding type</span>
            </div>
            <div className="toggle-group">
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

          <div className="bulk-import-section">
            <div className="bulk-import-section-head">
              <span className="bulk-import-step">2</span>
              <span>Upload your file</span>
              <button
                type="button"
                className="bulk-template-link"
                onClick={handleDownloadTemplate}
                disabled={downloading}
              >
                {downloading ? 'Preparing…' : '⭳ Download template'}
              </button>
            </div>

            {!file && !scanning && (
              <div
                className={`file-upload-zone bulk-dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input type="file" accept=".xlsx" onChange={handleFileChange} />
                <div className="file-icon">📊</div>
                <div className="file-label"><span>Click to upload</span> or drag & drop</div>
                <div className="file-sub">.xlsx files only</div>
              </div>
            )}

            {scanning && (
              <div className="bulk-scan-box">
                <div className="bulk-scan-icon">📄</div>
                <div className="bulk-scan-line" />
                <div className="bulk-scan-text">Scanning file…</div>
              </div>
            )}

            {file && !scanning && (
              <div className="file-selected bulk-file-ready">
                <span>✅</span>
                <span className="file-name">{file.name}</span>
                <span className="bulk-file-size">{formatFileSize(file.size)}</span>
                <button type="button" className="file-remove" onClick={handleRemoveFile}>✕</button>
              </div>
            )}
          </div>

          {error && (
            <div className="bulk-alert bulk-alert-danger">{error}</div>
          )}

          {result && (
            <div className="bulk-result">
              <div className="bulk-alert bulk-alert-success">
                <strong>{result.created_count}</strong> record(s) created successfully.
              </div>
              {result.errors?.length > 0 && (
                <div className="bulk-alert bulk-alert-danger bulk-error-list">
                  <div className="bulk-error-list-head">{result.errors.length} row(s) failed</div>
                  {result.errors.map((rowError) => (
                    <div key={rowError.row} className="bulk-error-row">
                      <span className="bulk-error-row-num">Row {rowError.row}</span>
                      {Object.values(rowError.errors).flat().join(' ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bulk-import-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><div className="spinner" /> Importing...</> : 'Import Records'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
