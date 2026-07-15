export default function FileUploadField({ value, onChange, disabled, existingDocs, docType }) {
  const existing = existingDocs?.find((d) => d.document_type === docType)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      alert('Only PDF, JPG, and PNG files are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10 MB.')
      return
    }
    onChange(file)
  }

  if (disabled) {
    return existing ? (
      <div className="file-selected">
        <span>📄</span>
        <span className="file-name">{existing.original_filename || docType}</span>
        {existing.file_url && (
          <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'underline' }}>View</a>
        )}
      </div>
    ) : (
      <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>No file uploaded</div>
    )
  }

  return (
    <>
      {!value && !existing && (
        <div className="file-upload-zone">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} />
          <div className="file-icon">📄</div>
          <div className="file-label"><span>Click to upload</span> or drag & drop</div>
          <div className="file-sub">PDF, JPG, PNG · Max 10 MB</div>
        </div>
      )}

      {(value || existing) && (
        <div className="file-selected">
          <span>📄</span>
          <span className="file-name">{value ? value.name : existing?.original_filename}</span>
          {!value && existing?.file_url && (
            <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'underline', marginRight: 4 }}>View</a>
          )}
          <button
            type="button"
            className="file-remove"
            onClick={() => onChange(null)}
            title="Remove"
            aria-label="Remove uploaded file"
          >✕</button>
        </div>
      )}

      {(value || existing) && (
        <div style={{ marginTop: 6 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--brand)', textDecoration: 'underline', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
            Replace file
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}
    </>
  )
}
