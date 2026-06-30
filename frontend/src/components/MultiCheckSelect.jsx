import { useState, useRef, useEffect } from 'react'

export default function MultiSelectDropdown({
  options,
  value = [],
  onChange,
  placeholder = 'Select...',
  disabled,
  emptyMessage = 'No matching options.',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const optionValue = (option) => typeof option === 'string' ? option : option.value
  const optionLabel = (option) => typeof option === 'string' ? option : option.label
  const labelForValue = (selectedValue) => {
    const option = options.find((item) => optionValue(item) === selectedValue)
    return option ? optionLabel(option) : selectedValue
  }

  const toggle = (opt) => {
    if (disabled) return
    const selectedValue = optionValue(opt)
    onChange(value.includes(selectedValue) ? value.filter((v) => v !== selectedValue) : [...value, selectedValue])
  }

  const btnLabel = value.length === 0
    ? placeholder
    : value.length === 1
      ? labelForValue(value[0])
      : `${value.length} selected`
  const filteredOptions = options.filter((option) =>
    optionLabel(option).toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 12px',
          background: 'var(--bg)', border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius)', fontSize: 13,
          color: value.length ? 'var(--text)' : 'var(--muted)',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span>{btnLabel}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          <div style={{ padding: 8, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code or description..."
              autoFocus
              style={{ fontSize: 12, padding: '7px 9px' }}
            />
          </div>
          {filteredOptions.map((opt, i) => {
            const selectedValue = optionValue(opt)
            const selected = value.includes(selectedValue)
            return (
              <div
                key={selectedValue}
                onMouseDown={(e) => { e.preventDefault(); toggle(opt) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                  background: selected ? 'var(--brand-light)' : 'transparent',
                  color: selected ? 'var(--brand)' : 'var(--text)',
                  borderBottom: i < filteredOptions.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}
              >
                <span style={{
                  width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-2)'}`,
                  background: selected ? 'var(--brand)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </span>
                {optionLabel(opt)}
              </div>
            )
          })}
          {filteredOptions.length === 0 && (
            <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>{emptyMessage}</div>
          )}
        </div>
      )}

      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {value.map((v) => (
            <span key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: 'var(--brand-light)', color: 'var(--brand)',
              border: '1px solid rgba(26,86,219,.2)',
            }}>
              {labelForValue(v)}
              {!disabled && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); toggle(v) }}
                  style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1, fontWeight: 700 }}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
