export default function PageStatus({ status, empty = '', noteClass = 'empty-note' }) {
  if (status === 'loading') {
    return (
      <p className={`page-loading ${noteClass}`}>
        <span className="page-spinner" aria-hidden="true" />
        Yuklanmoqda...
      </p>
    )
  }
  if (status === 'error') return <p className="form-error">Ma’lumot yuklanmadi.</p>
  if (status === 'ready' && empty) return <p className={noteClass}>{empty}</p>
  return null
}
