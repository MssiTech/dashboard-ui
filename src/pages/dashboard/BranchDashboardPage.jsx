import { useEffect, useMemo, useState } from 'react'
import { BASE_URL, apiFetch } from '../../api/index.js'
import ColumnChart from '../../components/ColumnChart'
import PageStatus from '../../components/PageStatus'
import { readCachedDate, writeCachedDate } from '../../lib/date'
import { usePageTitle } from '../../lib/pageTitle'

const DATE_FROM_KEY = 'monitor-dashboard-start'
const DATE_TO_KEY = 'monitor-dashboard-end'
const API_URL = `${BASE_URL}/api/monitoring/branches/`

const BRANCH_COLORS = [
  '#0b4a3c',
  '#1a4a63',
  '#c06a2e',
  '#2f5d52',
  '#5c6f48',
  '#163a54',
  '#b08a3d',
  '#3d7d70',
  '#6e5562',
  '#1f6b58',
  '#5a7d92',
  '#8f7a48',
]

function currentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const last = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${last}` }
}

function orderedRange(start, end) {
  if (start && end && start > end) return { start: end, end: start }
  return { start, end }
}

function formatCount(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value) || 0)
}

function useCountProgress(token, duration = 2600) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!token) {
      setProgress(0)
      return undefined
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return undefined
    }
    let frame = 0
    let start = 0
    setProgress(0)
    const tick = (now) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / duration)
      setProgress(t * t * (3 - 2 * t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [token, duration])

  return progress
}

function liveCount(value, progress) {
  return formatCount(Math.round((Number(value) || 0) * progress))
}

function parseRows(data) {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => ({
      id: row.id,
      name: row.branch || 'Noma’lum',
      count: Number(row.count) || 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export default function BranchDashboardPage() {
  usePageTitle('Bo‘limlar kesimida')
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [filters, setFilters] = useState(() => {
    const month = currentMonthRange()
    return orderedRange(
      readCachedDate(DATE_FROM_KEY) || month.start,
      readCachedDate(DATE_TO_KEY) || month.end,
    )
  })
  const ranked = useMemo(() => parseRows(rows), [rows])
  const countToken = status === 'ready' && ranked.length > 0
    ? ranked.map((row) => `${row.id}:${row.count}`).join('|')
    : null
  const progress = useCountProgress(countToken)
  const stats = useMemo(() => {
    const total = ranked.reduce((sum, row) => sum + row.count, 0)
    return {
      total,
      units: ranked.length,
      leader: ranked[0] || null,
    }
  }, [ranked])
  const chartRows = ranked.slice(0, 5)

  useEffect(() => {
    const controller = new AbortController()
    const range = orderedRange(filters.start, filters.end)
    const params = new URLSearchParams({
      start_date: range.start,
      end_date: range.end,
    })
    setStatus('loading')
    apiFetch(`${API_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setRows(Array.isArray(data) ? data : [])
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setRows([])
        setStatus('error')
      })
    return () => controller.abort()
  }, [filters])

  useEffect(() => {
    writeCachedDate(DATE_FROM_KEY, filters.start)
    writeCachedDate(DATE_TO_KEY, filters.end)
  }, [filters])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="dashboard">
      <header className="sitcen-bar">
        <div className="sitcen-title">
          <h1>Bo‘limlar kesimida</h1>
        </div>
        <form className="filters sitcen-filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            Sanadan
            <input
              type="date"
              name="start"
              value={filters.start}
              onChange={(event) => updateFilter('start', event.target.value || currentMonthRange().start)}
            />
          </label>
          <label>
            Sanagacha
            <input
              type="date"
              name="end"
              value={filters.end}
              onChange={(event) => updateFilter('end', event.target.value || currentMonthRange().end)}
            />
          </label>
          <button type="button" className="clear-button" onClick={() => setFilters(currentMonthRange())}>
            Tozalash
          </button>
        </form>
        {status === 'ready' && ranked.length > 0 ? (
          <div className="sitcen-kpis">
            <article>
              <small>Jami qabullar</small>
              <b>{liveCount(stats.total, progress)}</b>
            </article>
            <article>
              <small>Bo‘limlar</small>
              <b>{liveCount(stats.units, progress)}</b>
            </article>
            <article className="leader">
              <small>Yetakchi bo‘lim</small>
              <b>{stats.leader ? liveCount(stats.leader.count, progress) : '—'}</b>
              <span>{stats.leader?.name || ''}</span>
            </article>
          </div>
        ) : null}
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Bo‘limlar</h2>
        </div>
        <PageStatus status={status} empty={ranked.length === 0 ? 'Ma’lumot topilmadi.' : ''} />
        {status === 'ready' && ranked.length > 0 ? (
          <div className="branch-board">
            <ColumnChart
              key={countToken}
              rows={chartRows}
              eyebrow="Tanlangan bo‘lim"
              unit="ta"
              label="Eng ko‘p bo‘limlar"
            />
            <ol className="map-legend">
              {ranked.map((item, index) => (
                <li key={item.id || `${item.name}-${index}`}>
                  <div className="map-legend-item">
                    <span className="map-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span
                      className="map-swatch"
                      style={{ background: BRANCH_COLORS[index % BRANCH_COLORS.length] }}
                    />
                    <strong>{item.name}</strong>
                    <b>{liveCount(item.count, progress)}</b>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
    </main>
  )
}
