const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDate(iso, empty = '') {
  if (!iso) return empty
  const [year, month, day] = String(iso).split('-')
  if (!year || !month || !day) return empty
  return `${day}.${month}.${year}`
}

export function readCachedDate(key) {
  const saved = localStorage.getItem(key) || ''
  return DATE_PATTERN.test(saved) ? saved : ''
}

export function writeCachedDate(key, date) {
  if (date) localStorage.setItem(key, date)
  else localStorage.removeItem(key)
}
