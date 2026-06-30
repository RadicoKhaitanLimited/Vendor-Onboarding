export default function MultiEntryField({ values, onChange, type = 'text', placeholder, tag, disabled }) {
  const add = () => onChange([...values, ''])
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i))
  const update = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)))

  return (
    <div className="multi-entry-list">
      {values.map((v, i) => (
        <div className="multi-entry-row" key={i}>
          <span className="entry-tag">{tag} {i + 1}</span>
          <input
            type={type}
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
          {values.length > 1 && !disabled && (
            <button type="button" className="btn-remove-entry" onClick={() => remove(i)} title="Remove">✕</button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="btn-add-entry" onClick={add}>
          ＋ Add Another {tag}
        </button>
      )}
    </div>
  )
}
