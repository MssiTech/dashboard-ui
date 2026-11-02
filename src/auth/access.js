export const SECTION = {
  dashboard: 'dashboard',
  daily: 'daily',
  monthly: 'monthly',
  employees: 'employees',
  inventory: 'inventory',
  appeals: 'appeals',
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[`'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function userGroups(user) {
  const raw = user?.groups ?? user?.group ?? []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
}

function groupFlags(user) {
  const names = userGroups(user).map(normalize)
  const superAdmin = names.some(
    (name) =>
      (name.includes('супер') && name.includes('админ')) ||
      name.includes('super admin') ||
      name.includes('superadmin'),
  )
  const director = names.some((name) => name === 'директор' || name.includes('директор'))
  const accountant = names.some(
    (name) => name.includes('бухгалтер') || name.includes('buxgalter') || name.includes('buhgalter'),
  )
  return { superAdmin, director, accountant, empty: names.length === 0 }
}

export function canAccess(user, section) {
  const { superAdmin, director, accountant, empty } = groupFlags(user)
  if (superAdmin || empty) return true
  if (accountant && !director) return section === SECTION.inventory
  if (director) {
    return (
      section === SECTION.dashboard ||
      section === SECTION.daily ||
      section === SECTION.monthly
    )
  }
  return true
}

export function homePath(user) {
  const { superAdmin, director, accountant, empty } = groupFlags(user)
  if (!superAdmin && !empty && accountant && !director) return '/inventarizatsiya'
  return '/dashboard'
}

export function sectionForPath(pathname) {
  if (pathname.startsWith('/inventarizatsiya')) return SECTION.inventory
  if (pathname.startsWith('/murojatlar')) return SECTION.appeals
  if (pathname.startsWith('/employees')) return SECTION.employees
  if (
    pathname.startsWith('/monthly') ||
    pathname.startsWith('/branches') ||
    pathname.startsWith('/branch-doctors') ||
    pathname.startsWith('/9-oylik') ||
    pathname.startsWith('/bolimlar')
  ) {
    return SECTION.monthly
  }
  if (
    pathname.startsWith('/ambulatory') ||
    pathname.startsWith('/doctors') ||
    pathname.startsWith('/shifokorlar')
  ) {
    return SECTION.daily
  }
  return SECTION.dashboard
}
