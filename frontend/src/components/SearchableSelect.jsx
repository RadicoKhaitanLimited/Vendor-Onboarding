import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- Select --',
  disabled = false,
  emptyMessage = 'No matching options.',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState({})
  const ref = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      })
    }
  }, [open])

  const optionValue = (option) => (typeof option === 'string' ? option : option.value)
  const optionLabel = (option) => (typeof option === 'string' ? option : option.label)
  const selectedOption = options.find((option) => optionValue(option) === value)

  const select = (option) => {
    onChange(optionValue(option))
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setOpen(false)
  }

  const filteredOptions = options.filter((option) =>
    optionLabel(option).toLowerCase().includes(search.trim().toLowerCase())
  )

  const dropdown = open && (
    <div style={{
      ...dropdownStyle,
      background: 'var(--surface)',
      border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      maxHeight: 260,
      overflowY: 'auto',
    }}>
      <div style={{
        padding: 8, position: 'sticky', top: 0,
        background: 'var(--surface)', zIndex: 1,
        borderBottom: '1px solid var(--border)',
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          autoFocus
          style={{ fontSize: 12, padding: '7px 9px', width: '100%' }}
        />
      </div>
      {value && (
        <div
          onMouseDown={(e) => { e.preventDefault(); clear() }}
          style={{
            padding: '9px 12px', cursor: 'pointer', fontSize: 13,
            color: 'var(--muted)', borderBottom: '1px solid var(--border)',
          }}
        >
          -- Clear selection --
        </div>
      )}
      {filteredOptions.map((option, i) => {
        const optValue = optionValue(option)
        const selected = optValue === value
        return (
          <div
            key={optValue}
            onMouseDown={(e) => { e.preventDefault(); select(option) }}
            style={{
              padding: '9px 12px', cursor: 'pointer', fontSize: 13,
              background: selected ? 'var(--brand-light)' : 'transparent',
              color: selected ? 'var(--brand)' : 'var(--text)',
              borderBottom: i < filteredOptions.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            {optionLabel(option)}
          </div>
        )
      })}
      {filteredOptions.length === 0 && (
        <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>{emptyMessage}</div>
      )}
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 12px',
          background: disabled ? 'var(--bg)' : '#fff', border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius)', fontSize: 13,
          color: selectedOption ? 'var(--text)' : 'var(--muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span>{selectedOption ? optionLabel(selectedOption) : placeholder}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  )
}
