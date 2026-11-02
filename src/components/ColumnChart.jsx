import { useEffect, useId, useState } from 'react'

function niceMax(value) {
  if (value <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(value))
  const n = value / exp
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * exp
}

function clip(text, max) {
  const value = String(text || '').trim()
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function axisLabel(name) {
  const text = String(name || 'Noma’lum').trim()
  const code = text.match(/^([A-Z]\d[\d.]*)\s+(.+)$/i)
  if (code) return clip(code[1], 10)
  return clip(text.replace(/\s+bo['’]?limi$/i, '').trim(), 18)
}

function columnPath(x, y, width, height, radius) {
  if (height <= 0) return ''
  const r = Math.min(radius, width / 2, height)
  return `M${x} ${y + height} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + width - r} ${y} Q${x + width} ${y} ${x + width} ${y + r} L${x + width} ${y + height} Z`
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
      setProgress(t)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [token, duration])

  return progress
}

function liveCount(value, progress) {
  return Math.round((Number(value) || 0) * progress)
}

function barEase(progress, index) {
  const start = index * 0.1
  const span = 0.6
  const local = Math.min(1, Math.max(0, (progress - start) / span))
  return local * local * (3 - 2 * local)
}

export default function ColumnChart({
  rows,
  eyebrow,
  unit = 'ta',
  label,
  sortBy,
  sortDir = 'desc',
  scale,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mapped = rows.slice(0, 5).map((row) => {
    const value = Number(row.count) || 0
    const rawLimit = row.limit
    const limit = rawLimit == null || rawLimit === '' ? 0 : Number(rawLimit) || 0
    return {
      label: row.name || 'Noma’lum',
      value,
      limit,
    }
  })
  const showPlan = mapped.some((point) => point.limit > 0)
  const ranked = Boolean(sortBy)
  const dir = sortDir === 'asc' ? 1 : -1
  const points = [...mapped]
    .sort((a, b) => {
      if (sortBy === 'percent') {
        const pa = a.limit > 0 ? a.value / a.limit : -1
        const pb = b.limit > 0 ? b.value / b.limit : -1
        return dir * (pa - pb) || dir * (a.value - b.value)
      }
      if (sortBy === 'count') {
        return dir * (a.value - b.value) || String(a.label).localeCompare(String(b.label), 'uz')
      }
      return 0
    })
    .map((point, index) => ({ ...point, rank: index + 1 }))
  const token = points.map((point) => `${point.rank}:${point.label}:${point.value}:${point.limit}`).join('|')
  const progress = useCountProgress(token)
  const [activeRank, setActiveRank] = useState(points[0]?.rank || 1)

  useEffect(() => {
    setActiveRank(points[0]?.rank || 1)
  }, [token])
  const active = points.find((point) => point.rank === activeRank) || points[0]
  const width = 800
  const height = 340
  const pad = { top: 44, right: 28, bottom: 92, left: 44 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const percents = points.map((point) => (point.limit > 0 ? (point.value / point.limit) * 100 : 0))
  const usePercentScale = scale === 'percent'
  const max = usePercentScale
    ? niceMax(Math.max(...percents, 100))
    : niceMax(Math.max(...points.flatMap((point) => [point.value, showPlan ? point.limit : 0]), 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(max * part))
  const gap = 56
  const barW = points.length ? Math.min(48, (innerW - gap * (points.length - 1)) / points.length) : 48
  const groupW = barW + gap
  const startX = pad.left + (innerW - (points.length * barW + gap * Math.max(points.length - 1, 0))) / 2
  const yAt = (value) => pad.top + innerH - (value / max) * innerH
  const cols = points.map((point, index) => {
    const grown = barEase(progress, index)
    const factAxis = usePercentScale && point.limit > 0 ? (point.value / point.limit) * 100 : point.value
    const planAxis = usePercentScale && point.limit > 0 ? 100 : showPlan ? point.limit : 0
    const shown = factAxis * grown
    const shownLimit = planAxis * grown
    const h = shown > 0 ? Math.max((shown / max) * innerH, 4) : 0
    const limitH = shownLimit > 0 ? Math.max((shownLimit / max) * innerH, 4) : 0
    const x = startX + index * groupW
    const live = liveCount(point.value, grown)
    const pct = point.limit > 0 ? Math.round((point.value / point.limit) * 100) : null
    return {
      ...point,
      x,
      y: yAt(shown),
      limitY: yAt(shownLimit),
      h,
      limitH,
      mid: x + barW / 2,
      shown: live,
      pct,
    }
  })

  if (!points.length) return null

  const activeGrown = barEase(progress, Math.max(0, (active?.rank || 1) - 1))
  const activeFact = active ? liveCount(active.value, activeGrown) : 0
  const activePct = active?.limit > 0 ? Math.round((active.value / active.limit) * 100) : null

  return (
    <div className="column-board" data-progress={progress.toFixed(2)}>
      {active ? (
        <div className="column-caption">
          <div>
            <p className="eyebrow">{ranked ? `${active.rank}-o‘rin` : eyebrow}</p>
            <h3>{active.label}</h3>
          </div>
          <p className="column-caption-stat">
            {active.limit > 0 ? (
              <>
                <b>{active.limit}</b>
                <span>tadan {activeFact} {unit}</span>
              </>
            ) : (
              <>
                <b>{activeFact}</b>
                <span>{unit}</span>
              </>
            )}
            {activePct != null ? <span className="column-caption-pct">{activePct}%</span> : null}
          </p>
        </div>
      ) : null}
      {showPlan ? (
        <p className="column-legend">
          <span>
            <i className="column-swatch plan" />
            Reja
          </span>
          <span>
            <i className="column-swatch fact" />
            Bajarildi
          </span>
        </p>
      ) : null}
      <div className="column-chart" role="img" aria-label={label}>
        <svg viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => setActiveRank(points[0]?.rank || 1)}>
          <defs>
            <linearGradient id={`column-active-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a8a6c" />
              <stop offset="100%" stopColor="#0f6e56" />
            </linearGradient>
            <linearGradient id={`column-idle-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8eee6" />
              <stop offset="100%" stopColor="#c5dfd6" />
            </linearGradient>
            <linearGradient id={`column-plan-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#efe6d8" />
              <stop offset="100%" stopColor="#e4ddd2" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={yAt(tick)} y2={yAt(tick)} />
              <text className="chart-axis" x={pad.left - 10} y={yAt(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          <line className="chart-base" x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} />
          {cols.map((col) => {
            const selected = col.rank === activeRank
            return (
              <g
                key={`${col.label}-${col.rank}`}
                onMouseEnter={() => setActiveRank(col.rank)}
                style={{ cursor: 'pointer' }}
              >
                <rect className="column-track" x={col.x} y={pad.top} width={barW} height={innerH} rx="12" />
                {col.limitH > 0 ? (
                  <path
                    className="column-bar plan"
                    d={columnPath(col.x, col.limitY, barW, col.limitH, 12)}
                    fill={`url(#column-plan-${uid})`}
                  />
                ) : null}
                {col.h > 0 ? (
                  <path
                    className={selected ? 'column-bar active' : 'column-bar'}
                    d={columnPath(col.x, col.y, barW, col.h, 12)}
                    fill={selected ? `url(#column-active-${uid})` : `url(#column-idle-${uid})`}
                  />
                ) : null}
                {col.shown > 0 || col.pct != null ? (
                  <text
                    className={selected ? 'column-value active' : 'column-value'}
                    x={col.mid}
                    y={Math.min(col.y || pad.top + innerH, col.limitY || pad.top + innerH) - (col.pct != null ? 22 : 10)}
                    textAnchor="middle"
                  >
                    {col.shown}
                    {col.pct != null ? (
                      <tspan x={col.mid} dy="14">
                        {col.pct}%
                      </tspan>
                    ) : null}
                  </text>
                ) : null}
                <text
                  className="column-label"
                  x={col.mid}
                  y={pad.top + innerH + 18}
                  textAnchor="end"
                  transform={`rotate(-36 ${col.mid} ${pad.top + innerH + 18})`}
                >
                  {ranked ? `${col.rank}. ${axisLabel(col.label)}` : axisLabel(col.label)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
