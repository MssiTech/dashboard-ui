import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import PageStatus from '../../components/PageStatus'
import { BUKHARA_MAP } from '../../data/bukharaMap.js'
import { readCachedDate, writeCachedDate } from '../../lib/date'
import { usePageTitle } from '../../lib/pageTitle'

const DATE_FROM_KEY = 'monitor-dashboard-start'
const DATE_TO_KEY = 'monitor-dashboard-end'

const API_URL = `${BASE_URL}/api/monitoring/districts/`

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

const MAP_LABELS = {
  'buxoro-shahri': 'Buxoro shahri',
  'buxoro-tumani': 'Buxoro tumani',
  'kogon-shahri': 'Kogon shahri',
  'kogon-tumani': 'Kogon tumani',
  olot: 'Olot tumani',
  qorakol: 'Qorako‘l tumani',
  qorovulbozor: 'Qorovulbozor tumani',
  shofirkon: 'Shofirkon tumani',
  romitan: 'Romitan tumani',
  peshku: 'Peshko‘ tumani',
  gijduvon: 'G‘ijduvon tumani',
  vobkent: 'Vobkent tumani',
  jondor: 'Jondor tumani',
}

const MAP_DRAW_ORDER = [
  'peshku',
  'romitan',
  'qorakol',
  'jondor',
  'olot',
  'shofirkon',
  'gijduvon',
  'vobkent',
  'qorovulbozor',
  'buxoro-tumani',
  'kogon-tumani',
  'kogon-shahri',
  'buxoro-shahri',
]

const MAP_VIEW = { x: -278, y: -241, w: 1016, h: 785 }

const MAP_PINS = {
  gijduvon: { x: 612, y: 72, name: 'G‘ijduvon' },
  shofirkon: { x: 348, y: 28, name: 'Shofirkon' },
  peshku: { x: 80, y: -20, name: 'Peshko‘' },
  romitan: { x: 332, y: 214, name: 'Romitan' },
  vobkent: { x: 478, y: 214, name: 'Vobkent' },
  jondor: { x: 120, y: 248, name: 'Jondor' },
  qorakol: { x: 40, y: 340, name: 'Qorako‘l' },
  olot: { x: 318, y: 448, name: 'Olot' },
  qorovulbozor: { x: 588, y: 388, name: 'Qorovulbozor' },
  'buxoro-tumani': { x: 402, y: 392, name: 'Buxoro t.' },
  'buxoro-shahri': { x: 362, y: 286, name: 'Buxoro' },
  'kogon-shahri': { x: 492, y: 312, name: 'Kogon' },
  'kogon-tumani': { x: 558, y: 292, name: 'Kogon t.' },
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’ʻʼ`‘]/g, '')
    .replace(/g‘|g'/g, 'g')
    .replace(/o‘|o'/g, 'o')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapIdFromDistrict(name) {
  const raw = normalizeName(name)
  if (!raw || raw === 'nomalum') return ''
  if (raw.includes('buxoro') && raw.includes('shahri')) return 'buxoro-shahri'
  if (raw.includes('kogon') && raw.includes('shahri')) return 'kogon-shahri'
  const core = raw.replace(/\b(tumani|shahri)\b/g, '').trim()
  const aliases = {
    buxoro: 'buxoro-tumani',
    kogon: 'kogon-tumani',
    olot: 'olot',
    alat: 'olot',
    qorakol: 'qorakol',
    qorovulbozor: 'qorovulbozor',
    shofirkon: 'shofirkon',
    romitan: 'romitan',
    peshku: 'peshku',
    peshko: 'peshku',
    gijduvon: 'gijduvon',
    vobkent: 'vobkent',
    jondor: 'jondor',
  }
  return aliases[core] || ''
}

const DISTRICT_COLORS = {
  peshku: '#5c6f48',
  shofirkon: '#2f5d52',
  gijduvon: '#1a4a63',
  romitan: '#b08a3d',
  vobkent: '#3d7d70',
  jondor: '#c06a2e',
  qorakol: '#8f7a48',
  olot: '#5a7d92',
  qorovulbozor: '#6e5562',
  'buxoro-tumani': '#1f6b58',
  'buxoro-shahri': '#0b4a3c',
  'kogon-shahri': '#163a54',
  'kogon-tumani': '#3d6176',
}

function mapFill(id) {
  return DISTRICT_COLORS[id] || '#efe8dc'
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
      const eased = t * t * (3 - 2 * t)
      setProgress(eased)
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

function DistrictMap({ rows, progress, onOpenDistrict }) {
  const counts = useMemo(() => {
    const next = {}
    rows.forEach((row) => {
      const id = mapIdFromDistrict(row.district)
      if (!id) return
      next[id] = (next[id] || 0) + (Number(row.count) || 0)
    })
    return next
  }, [rows])
  const apiNames = useMemo(() => {
    const names = {}
    rows.forEach((row) => {
      const id = mapIdFromDistrict(row.district)
      if (id && !names[id]) names[id] = row.district
    })
    return names
  }, [rows])
  const ranked = MAP_DRAW_ORDER
    .map((id) => ({
      id,
      label: MAP_LABELS[id],
      value: counts[id] || 0,
    }))
    .sort((a, b) => b.value - a.value)
  const [activeId, setActiveId] = useState(ranked[0]?.id || 'buxoro-shahri')
  const [pops, setPops] = useState([])
  const lastBurst = useRef({ id: '', at: 0 })
  const shapes = [...BUKHARA_MAP.districts].sort(
    (a, b) => MAP_DRAW_ORDER.indexOf(a.id) - MAP_DRAW_ORDER.indexOf(b.id),
  )

  function burst(id) {
    const pin = MAP_PINS[id]
    if (!pin) return
    setActiveId(id)
    const now = Date.now()
    if (lastBurst.current.id === id && now - lastBurst.current.at < 800) return
    lastBurst.current = { id, at: now }
    setPops((list) => [
      ...list.slice(-3),
      {
        key: `${id}-${now}`,
        name: MAP_LABELS[id],
        value: counts[id] || 0,
        left: ((pin.x - MAP_VIEW.x) / MAP_VIEW.w) * 100,
        top: ((pin.y - MAP_VIEW.y) / MAP_VIEW.h) * 100,
      },
    ])
  }

  function openDistrict(id) {
    onOpenDistrict(apiNames[id] || MAP_LABELS[id])
  }

  return (
    <div className="map-board">
      <div className="map-stage">
        <div className="map-frame">
          <div
            className="map-fit"
            style={{
              width: `min(100cqw, calc(100cqh * ${MAP_VIEW.w} / ${MAP_VIEW.h}))`,
              height: `min(100cqh, calc(100cqw * ${MAP_VIEW.h} / ${MAP_VIEW.w}))`,
            }}
          >
            <svg
              className="viloyat-map"
              viewBox={`${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Buxoro viloyati xaritasi"
              onMouseLeave={() => setActiveId(ranked[0]?.id || 'buxoro-shahri')}
            >
              <defs>
                <filter id="map-soft" x="-4%" y="-4%" width="108%" height="108%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#1c1915" floodOpacity="0.08" />
                </filter>
              </defs>
              <g filter="url(#map-soft)">
                {shapes.map((shape) => {
                  const selected = shape.id === activeId
                  return (
                    <path
                      key={shape.id}
                      className={selected ? 'map-shape active' : 'map-shape'}
                      d={shape.d}
                      fill={mapFill(shape.id)}
                      onMouseOver={() => burst(shape.id)}
                      onFocus={() => burst(shape.id)}
                      onClick={() => openDistrict(shape.id)}
                    />
                  )
                })}
              </g>
            </svg>
            {pops.map((pop) => (
              <span
                key={pop.key}
                className="map-burst"
                style={{ left: `${pop.left}%`, top: `${pop.top}%` }}
                onAnimationEnd={() => {
                  setPops((list) => list.filter((item) => item.key !== pop.key))
                }}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 14V3M8 3 3.5 7.5M8 3l4.5 4.5" />
                </svg>
                <strong>{pop.name}</strong>
                <b>{formatCount(pop.value)}</b>
              </span>
            ))}
            {shapes.map((shape, index) => {
              const pin = MAP_PINS[shape.id]
              if (!pin) return null
              const value = counts[shape.id] || 0
              const selected = shape.id === activeId
              return (
                <span
                  key={`${shape.id}-label`}
                  className="map-pin-wrap"
                  style={{
                    left: `${((pin.x - MAP_VIEW.x) / MAP_VIEW.w) * 100}%`,
                    top: `${((pin.y - MAP_VIEW.y) / MAP_VIEW.h) * 100}%`,
                    animationDelay: `${80 + index * 40}ms`,
                  }}
                >
                  <span className={selected ? 'map-pin active' : 'map-pin'}>
                    {pin.name}
                    <b>{liveCount(value, progress)}</b>
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <ol className="map-legend">
        {ranked.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={item.id === activeId ? 'map-legend-item active' : 'map-legend-item'}
              onMouseEnter={() => setActiveId(item.id)}
              onFocus={() => setActiveId(item.id)}
              onClick={() => openDistrict(item.id)}
            >
              <span className="map-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="map-swatch" style={{ background: mapFill(item.id) }} />
              <strong>{item.label}</strong>
              <b>{liveCount(item.value, progress)}</b>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  usePageTitle('Ma’lumotlar markazi')
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [filters, setFilters] = useState(() => {
    const month = currentMonthRange()
    return orderedRange(
      readCachedDate(DATE_FROM_KEY) || month.start,
      readCachedDate(DATE_TO_KEY) || month.end,
    )
  })
  const countToken = status === 'ready' && rows.length > 0
    ? rows.map((row) => `${row.district}:${row.count}`).join('|')
    : null
  const progress = useCountProgress(countToken)
  const stats = useMemo(() => {
    let total = 0
    let mapped = 0
    const byId = {}
    rows.forEach((row) => {
      const count = Number(row.count) || 0
      total += count
      const id = mapIdFromDistrict(row.district)
      if (!id) return
      mapped += count
      byId[id] = (byId[id] || 0) + count
    })
    const leaderId = Object.keys(byId).sort((a, b) => byId[b] - byId[a])[0]
    return {
      total,
      mapped,
      unknown: total - mapped,
      leader: leaderId
        ? { label: MAP_LABELS[leaderId], value: byId[leaderId] }
        : null,
    }
  }, [rows])

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
    <main className="dashboard map-page">
      <header className="sitcen-bar">
        <div className="sitcen-title">
          <h1>Ma’lumotlar markazi</h1>
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
          <button
            type="button"
            className="clear-button"
            onClick={() => setFilters(currentMonthRange())}
          >
            Tozalash
          </button>
        </form>
        {status === 'ready' && rows.length > 0 ? (
          <div className="sitcen-kpis">
            <article>
              <small>Jami qabullar</small>
              <b>{liveCount(stats.total, progress)}</b>
            </article>
            <article>
              <small>Xaritada</small>
              <b>{liveCount(stats.mapped, progress)}</b>
            </article>
            <article className="leader">
              <small>Yetakchi shahar/tuman</small>
              <b>{stats.leader ? liveCount(stats.leader.value, progress) : '—'}</b>
              <span>{stats.leader?.label || ''}</span>
            </article>
          </div>
        ) : null}
      </header>

      <section className="panel sitcen-panel">
        <div className="panel-head">
          <h2>Buxoro viloyati</h2>
          {stats.unknown > 0 ? (
            <p className="detail-meta">
              <span>Noma’lum {liveCount(stats.unknown, progress)}</span>
            </p>
          ) : null}
        </div>
        <PageStatus status={status} empty={rows.length === 0 ? 'Ma’lumot topilmadi.' : ''} />
        {status === 'ready' && rows.length > 0 ? (
          <DistrictMap
            rows={rows}
            progress={progress}
            onOpenDistrict={(district) => {
              const params = new URLSearchParams({
                district,
                start_date: filters.start,
                end_date: filters.end,
              })
              navigate(`/dashboard/patients?${params}`)
            }}
          />
        ) : null}
      </section>
    </main>
  )
}
