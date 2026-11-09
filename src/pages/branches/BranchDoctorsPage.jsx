import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import { downloadWorkbook } from '../../excel'
import { readCachedDate, writeCachedDate } from '../../lib/date'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/monitoring/month/doctors/`
const BRANCHES_URL = `${BASE_URL}/api/monitoring/month/branches/`
const START_KEY = 'monitor-branch-doctors-start'
const END_KEY = 'monitor-branch-doctors-end'
const BRANCH_KEY = 'monitor-branch-doctors-branch'

function currentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const last = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${last}` }
}

function readFilters() {
  const range = currentMonthRange()
  return {
    branch: localStorage.getItem(BRANCH_KEY) || '',
    start: readCachedDate(START_KEY) || range.start,
    end: readCachedDate(END_KEY) || range.end,
  }
}

function writeFilters(next) {
  const branch = String(next.branch || '').trim()
  if (branch) localStorage.setItem(BRANCH_KEY, branch)
  else localStorage.removeItem(BRANCH_KEY)
  writeCachedDate(START_KEY, next.start)
  writeCachedDate(END_KEY, next.end)
}

function orderedRange(start, end) {
  if (start && end && start > end) return { start: end, end: start }
  return { start, end }
}

function excelRows(list) {
  return list.map((row, index) => ({
    '№': index + 1,
    Mutaxassis: row.doctor ?? '',
    'Bo‘lim': row.branch ?? '',
    'Umumiy qabullar': row.appointment_count ?? 0,
    Rezident: row.rezident_count ?? 0,
    Norezident: row.non_rezident_count ?? 0,
    Oddiy: row.simple_count ?? 0,
    'Ko‘riklar': row.examination_count ?? 0,
    Tashxislar: row.diagnosis_count ?? 0,
    Tahlillar: row.analysis_count ?? 0,
    Diagnostika: row.diagnostika_count ?? 0,
  }))
}

async function loadDoctors(branch, start, end, signal) {
  const rows = []
  let page = 1
  while (page <= 50) {
    const params = new URLSearchParams({
      page: String(page),
      limit: '100',
      start_date: start,
      end_date: end,
    })
    if (branch) params.set('branch', branch)
    const response = await apiFetch(`${API_URL}?${params}`, { signal })
    if (response.status === 404) break
    if (!response.ok) throw new Error('request failed')
    const data = await response.json()
    const list = Array.isArray(data) ? data : []
    rows.push(...list)
    if (list.length < 100) break
    page += 1
  }
  return rows
}

export default function BranchDoctorsPage() {
  usePageTitle('Bo‘lim shifokorlari')
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState(readFilters)

  useEffect(() => {
    const controller = new AbortController()
    const range = orderedRange(filters.start, filters.end)
    const params = new URLSearchParams({
      start_date: range.start,
      end_date: range.end,
    })

    apiFetch(`${BRANCHES_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setBranches(Array.isArray(data) ? data.map((row) => row.branch).filter(Boolean) : [])
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setBranches([])
      })

    return () => controller.abort()
  }, [filters.start, filters.end])

  useEffect(() => {
    const controller = new AbortController()
    const range = orderedRange(filters.start, filters.end)

    setStatus('loading')
    loadDoctors(filters.branch, range.start, range.end, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setRows(list)
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
    writeFilters(filters)
  }, [filters])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function download() {
    setExporting(true)
    const range = orderedRange(filters.start, filters.end)
    downloadWorkbook(
      excelRows(rows),
      `Bolim shifokorlari-${range.start}-${range.end}.xlsx`,
      'Shifokorlar',
    )
    setExporting(false)
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Bo‘lim shifokorlari</h1>
        </div>
        {status === 'ready' ? (
          <p className="detail-meta">
            <span>{rows.length} shifokor</span>
          </p>
        ) : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields range">
          <label>
            Bo‘lim
            <select
              name="branch"
              value={filters.branch}
              onChange={(event) => updateFilter('branch', event.target.value)}
            >
              <option value="">Barchasi</option>
              {(filters.branch && !branches.includes(filters.branch)
                ? [filters.branch, ...branches]
                : branches
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
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
            onClick={() => {
              const range = currentMonthRange()
              setFilters({ branch: '', start: range.start, end: range.end })
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Shifokorlar</h2>
          <DownloadButton busy={exporting} disabled={status !== 'ready' || rows.length === 0} onClick={download} />
        </div>
        <PageStatus status={status} empty={rows.length === 0 ? 'Shifokor topilmadi.' : ''} />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table plan-table branch-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-branch" />
                <col span={4} className="col-qabul" />
                <col span={4} className="col-metric" />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="idx-head">
                    №
                  </th>
                  <th rowSpan={2} className="name-head">
                    Shifokor
                  </th>
                  <th rowSpan={2} className="name-head">
                    Bo‘lim
                  </th>
                  <th colSpan={4} className="group-head kun">
                    Qabullar
                  </th>
                  <th colSpan={4} className="group-head oy">
                    Ko‘rsatkichlar
                  </th>
                </tr>
                <tr>
                  <th className="sub-head kun">Umumiy</th>
                  <th className="sub-head kun">Rezident</th>
                  <th className="sub-head kun">Norezident</th>
                  <th className="sub-head kun">Oddiy</th>
                  <th className="sub-head oy oy-start">Ko‘rik</th>
                  <th className="sub-head oy">Tashxis</th>
                  <th className="sub-head oy">Tahlil</th>
                  <th className="sub-head oy">Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const range = orderedRange(filters.start, filters.end)
                  const query = new URLSearchParams({
                    start_date: range.start,
                    end_date: range.end,
                  })
                  return (
                    <tr key={row.id ?? index}>
                      <td>{index + 1}</td>
                      <td className="name-cell">
                        <Link
                          className="doctor-link"
                          to={`/branch-doctors/${row.id}?${query}`}
                          state={{ fullName: row.doctor, branch: row.branch }}
                        >
                          {row.doctor}
                        </Link>
                      </td>
                      <td className="name-cell">{row.branch}</td>
                      <td className="num kun">{row.appointment_count ?? 0}</td>
                      <td className="num kun">{row.rezident_count ?? 0}</td>
                      <td className="num kun">{row.non_rezident_count ?? 0}</td>
                      <td className="num kun">{row.simple_count ?? 0}</td>
                      <td className="num oy oy-start">{row.examination_count ?? 0}</td>
                      <td className="num oy">{row.diagnosis_count ?? 0}</td>
                      <td className="num oy">{row.analysis_count ?? 0}</td>
                      <td className="num oy">{row.diagnostika_count ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
