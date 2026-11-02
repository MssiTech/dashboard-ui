import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import ClampText from '../../components/ClampText'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import { downloadWorkbook } from '../../excel'
import { formatDate } from '../../lib/date'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/monitoring/month/`
const FETCH_LIMIT = 100

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

function detailQuery(start, end) {
  const range = orderedRange(start, end)
  return `?${new URLSearchParams({ start_date: range.start, end_date: range.end })}`
}

function buildParams(page, filters) {
  const range = orderedRange(filters.start, filters.end)
  const params = new URLSearchParams({
    page: String(page),
    limit: String(FETCH_LIMIT),
    start_date: range.start,
    end_date: range.end,
  })
  const name = filters.fio.trim()
  if (name) params.set('full_name', name)
  return params
}

async function loadPage(page, filters, signal) {
  const response = await apiFetch(`${API_URL}?${buildParams(page, filters)}`, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('request failed')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

async function loadAll(filters, signal) {
  const rows = []
  let page = 1
  while (page <= 50) {
    const list = await loadPage(page, filters, signal)
    if (!list?.length) break
    rows.push(...list)
    if (list.length < FETCH_LIMIT) break
    page += 1
  }
  return rows
}

function excelRows(list) {
  return list.map((row, index) => ({
    '№': index + 1,
    Mutaxassis: row.doctor?.full_name ?? '',
    Sanadan: formatDate(row.start_date),
    Sanagacha: formatDate(row.end_date),
    Qabullar: row.appointment_count ?? 0,
    'Ko‘riklar': row.examination_count ?? 0,
    Tashxislar: row.diagnosis_count ?? 0,
    Tahlillar: row.analysis_count ?? 0,
    Diagnostika: row.diagnostika_count ?? 0,
  }))
}

export default function MonthlyPage() {
  usePageTitle('Ambulator oylik monitoring')
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState(() => {
    const range = currentMonthRange()
    return { fio: '', start: range.start, end: range.end }
  })

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')

    loadAll(filters, controller.signal)
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

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function download() {
    setExporting(true)
    const range = orderedRange(filters.start, filters.end)
    downloadWorkbook(
      excelRows(rows),
      `Ambulator oylik monitoring-${range.start}-${range.end}.xlsx`,
      'Ambulator oylik monitoring',
    )
    setExporting(false)
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Ambulator oylik monitoring</h1>
        </div>
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields range">
          <label>
            Mutaxassis
            <input
              type="text"
              name="fio"
              value={filters.fio}
              placeholder="Familiya, ism, otasining ismi"
              onChange={(event) => updateFilter('fio', event.target.value)}
            />
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
              setFilters({ fio: '', start: range.start, end: range.end })
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Mutaxassislar</h2>
          <DownloadButton busy={exporting} disabled={status !== 'ready' || rows.length === 0} onClick={download} />
        </div>
        <PageStatus status={status} empty={rows.length === 0 ? 'Yozuv topilmadi.' : ''} />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table count-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-num" />
                <col className="col-num" />
                <col className="col-num" />
                <col className="col-num" />
                <col className="col-num" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Shifokor</th>
                  <th>Qabullar</th>
                  <th>Ko‘riklar</th>
                  <th>Tashxislar</th>
                  <th>Tahlillar</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const doctorId = row.doctor?.id ?? row.id
                  const fullName = row.doctor?.full_name || ''
                  return (
                    <tr key={doctorId}>
                      <td>{index + 1}</td>
                      <td className="name-cell">
                        <Link
                          className="doctor-link"
                          to={`/monthly/${doctorId}${detailQuery(filters.start, filters.end)}`}
                          state={{ fullName }}
                        >
                          <ClampText value={fullName} />
                        </Link>
                      </td>
                      <td className="num">{row.appointment_count ?? 0}</td>
                      <td className="num">{row.examination_count ?? 0}</td>
                      <td className="num">{row.diagnosis_count ?? 0}</td>
                      <td className="num">{row.analysis_count ?? 0}</td>
                      <td className="num">{row.diagnostika_count ?? 0}</td>
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
