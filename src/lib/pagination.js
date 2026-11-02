export const PAGE_LIMIT = 20

export function paginationItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set([1, 2, 3, total - 1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((item) => item >= 1 && item <= total).sort((a, b) => a - b)
  const items = []
  sorted.forEach((item, index) => {
    if (index > 0 && item - sorted[index - 1] > 1) items.push('…')
    items.push(item)
  })
  return items
}
