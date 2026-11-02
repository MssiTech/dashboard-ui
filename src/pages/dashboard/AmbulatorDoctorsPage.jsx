import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../../api/index.js'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { readCachedDate, todayIso, writeCachedDate } from '../../lib/date'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/monitoring/ambulator-doctors/`
const MONTH_KEY = 'monitor-ambulator-month'
const DATE_KEY = 'monitor-ambulator-date'

function monthKeyFromDate(iso) {
  return String(iso || '').slice(0, 7)
}

function lastDay(year, month) {
  return new Date(year, month, 0).getDate()
}

function clampDate(iso, monthKey) {
  const [yearText, monthText] = String(monthKey).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!year || !month) return iso
  const day = Math.min(Number(String(iso).slice(8, 10)) || 1, lastDay(year, month))
  return `${yearText}-${monthText}-${String(day).padStart(2, '0')}`
}

function cell(value) {
  const text = String(value ?? '').trim()
  return text || 'Mavjud emas'
}

function branchName(branch) {
  if (branch && typeof branch === 'object') return cell(branch.name)
  return cell(branch)
}

function metricNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  const n = Number(text.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? String(n) : '—'
}

function bidNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n.toFixed(2) : '—'
}

function formatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`
}

export default function AmbulatorDoctorsPage() {
  usePageTitle('Ambulator shifokor kesimida')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [monthKey, setMonthKey] = useState(() => {
    const saved = localStorage.getItem(MONTH_KEY) || ''
    if (/^\d{4}-\d{2}$/.test(saved)) return saved
    return monthKeyFromDate(readCachedDate(DATE_KEY) || todayIso())
  })
  const [date, setDate] = useState(() => {
    const savedMonth = localStorage.getItem(MONTH_KEY) || ''
    const savedDate = readCachedDate(DATE_KEY) || todayIso()
    if (/^\d{4}-\d{2}$/.test(savedMonth)) return clampDate(savedDate, savedMonth)
    return savedDate
  })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [query, monthKey, date])

  useEffect(() => {
    const controller = new AbortController()
    const [year, month] = monthKey.split('-')
    const params = new URLSearchParams({
      year,
      month: String(Number(month)),
      date,
      page: String(page),
      limit: String(PAGE_LIMIT),
    })
    if (query) params.set('full_name', query)
    setStatus('loading')
    apiFetch(`${API_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setRows(Array.isArray(data.results) ? data.results : [])
        setTotal(typeof data.count === 'number' ? data.count : 0)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setRows([])
        setTotal(0)
        setStatus('error')
      })
    return () => controller.abort()
  }, [page, query, monthKey, date])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)

  function changeMonth(value) {
    const nextMonth = value || monthKeyFromDate(todayIso())
    const nextDate = clampDate(date, nextMonth)
    setMonthKey(nextMonth)
    setDate(nextDate)
    localStorage.setItem(MONTH_KEY, nextMonth)
    writeCachedDate(DATE_KEY, nextDate)
  }

  function changeDate(value) {
    const nextDate = value || todayIso()
    const nextMonth = monthKeyFromDate(nextDate)
    setDate(nextDate)
    setMonthKey(nextMonth)
    writeCachedDate(DATE_KEY, nextDate)
    localStorage.setItem(MONTH_KEY, nextMonth)
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Ambulator shifokor kesimida</h1>
        </div>
        {status === 'ready' ? (
          <p className="detail-meta">
            <span>{total} shifokor</span>
          </p>
        ) : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields range">
          <label>
            Shifokor
            <input
              type="search"
              name="full_name"
              value={search}
              placeholder="Familiya, ism, otasining ismi"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Oy
            <input
              type="month"
              name="month"
              value={monthKey}
              onChange={(event) => changeMonth(event.target.value)}
            />
          </label>
          <label>
            Kun
            <input
              type="date"
              name="date"
              value={date}
              onChange={(event) => changeDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              const today = todayIso()
              setSearch('')
              setQuery('')
              changeDate(today)
              setPage(1)
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Ro‘yxat</h2>
        </div>
        <PageStatus
          status={status}
          empty={rows.length === 0 ? 'Shifokor topilmadi.' : ''}
        />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table plan-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-branch" />
                <col className="col-bid" />
                <col span={3} className="col-kun" />
                <col span={3} className="col-oy" />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="idx-head">
                    №
                  </th>
                  <th rowSpan={2} className="name-head">
                    F.I.Sh.
                  </th>
                  <th rowSpan={2} className="name-head">
                    Bo‘lim
                  </th>
                  <th rowSpan={2} className="num-head">
                    Stavka
                  </th>
                  <th colSpan={3} className="group-head kun">
                    Kun
                  </th>
                  <th colSpan={3} className="group-head oy">
                    Oy
                  </th>
                </tr>
                <tr>
                  <th className="sub-head kun">Reja</th>
                  <th className="sub-head kun">Qabul</th>
                  <th className="sub-head kun">%</th>
                  <th className="sub-head oy oy-start">Reja</th>
                  <th className="sub-head oy">Qabul</th>
                  <th className="sub-head oy">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id || `${row.full_name}-${index}`}>
                    <td>{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <strong>{cell(row.full_name)}</strong>
                    </td>
                    <td className="name-cell">{branchName(row.branch)}</td>
                    <td className="num bid-cell">{bidNumber(row.bid)}</td>
                    <td className="num kun">{metricNumber(row.daily_limit)}</td>
                    <td className="num kun">{metricNumber(row.daily_count)}</td>
                    <td className="num pct kun">
                      <span className="plan-pct">{formatPercent(row.daily_percent)}</span>
                    </td>
                    <td className="num oy oy-start">{metricNumber(row.monthly_limit)}</td>
                    <td className="num oy">{metricNumber(row.monthly_count)}</td>
                    <td className="num pct oy">
                      <span className="plan-pct">{formatPercent(row.monthly_percent)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status === 'ready' && total > PAGE_LIMIT ? (
          <Pager page={currentPage} pageCount={pageCount} onPage={setPage} />
        ) : null}
      </section>
    </main>
  )
}
