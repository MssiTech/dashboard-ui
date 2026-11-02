export function isMissing(status) {
  return String(status).replace(/['’ʻʼ]/g, '').toLowerCase() === 'yoq'
}

export function presenceLabel(status) {
  return isMissing(status) ? 'yo‘q' : 'bor'
}

export function itemLines(items) {
  if (!items) return []
  const list = Array.isArray(items) ? items : [items]
  return list
    .map((item) => {
      if (typeof item === 'string') return item
      const name = item?.name || item?.title || ''
      const status = item?.status || ''
      if (!name) return status ? presenceLabel(status) : ''
      if (!status) return name
      return `${name} — ${presenceLabel(status)}`
    })
    .filter(Boolean)
}
