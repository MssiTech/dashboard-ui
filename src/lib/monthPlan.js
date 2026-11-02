export function monthPlans(value) {
  return Array.isArray(value) ? value : Array.isArray(value?.month_plans) ? value.month_plans : []
}

export function pickMonthPlan(value, iso) {
  const plans = monthPlans(value)
  if (!plans.length) return null
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const current = plans.find((plan) => Number(plan.year) === year && Number(plan.month) === month)
  if (current) return current
  return [...plans].sort(
    (a, b) => Number(b.year) * 12 + Number(b.month) - (Number(a.year) * 12 + Number(a.month)),
  )[0]
}

export function planField(row, name) {
  const direct = row?.[name]
  if (direct != null && String(direct).trim()) return String(direct).trim()
  const plan = pickMonthPlan(row)
  const nested = plan?.[name]
  if (nested != null && String(nested).trim()) return String(nested).trim()
  return ''
}
