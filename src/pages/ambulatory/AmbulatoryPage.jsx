import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import ClampText from '../../components/ClampText'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { downloadWorkbook } from '../../excel'
import { formatDate, readCachedDate, todayIso, writeCachedDate } from '../../lib/date'
import { usePageTitle } from '../../lib/pageTitle'
import { PAGE_LIMIT } from '../../lib/pagination'

const API_URL = `${BASE_URL}/api/monitoring/`
const emptyFilters = { fio: '', date: '' }
const DATE_CACHE_KEY = 'monitor-dashboard-date'

function buildParams(page, filters) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_LIMIT),
  })
  const name = filters.fio.trim()
  if (name) params.set('full_name', name)
  if (filters.date) params.set('date', filters.date)
  return params
}

async function loadPage(page, filters, signal) {
  const response = await apiFetch(`${API_URL}?${buildParams(page, filters)}`, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('request failed')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

async function findLastPage(filters, signal) {
  const first = await loadPage(1, filters, signal)
  if (!first || first.length < PAGE_LIMIT) return 1

  let lower = 1
  let upper = 2
  while (upper <= 200) {
    const list = await loadPage(upper, filters, signal)
    if (!list || list.length === 0) break
    if (list.length < PAGE_LIMIT) return upper
    lower = upper
    upper *= 2
  }

  let left = lower
  let right = upper - 1
  while (left < right) {
    const mid = Math.ceil((left + right) / 2)
    const list = await loadPage(mid, filters, signal)
    if (!list || list.length === 0) {
      right = mid - 1
    } else if (list.length < PAGE_LIMIT) {
      return mid
    } else {
      left = mid
    }
  }
  return left
}

function toExcelRows(list) {
  return list.map((record, index) => ({
    '№': index + 1,
    Shifokor: record.doctor?.full_name ?? '',
    Sana: formatDate(record.date),
    Qabullar: record.appointment_count ?? 0,
    'Ko‘riklar': record.examination_count ?? 0,
    Tashxislar: record.diagnosis_count ?? 0,
    Tahlillar: record.analysis_count ?? 0,
    Diagnostika: record.diagnostika_count ?? 0,
  }))
}

async function loadAllPages(filters) {
  const rows = []
  let current = 1
  while (current <= 200) {
    const list = await loadPage(current, filters)
    if (!list?.length) break
    rows.push(...list)
    if (list.length < PAGE_LIMIT) break
    current += 1
  }
  return rows
}

export default function AmbulatoryPage() {
  usePageTitle('Ambulator kunlik monitoring')
  const [records, setRecords] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [pageCount, setPageCount] = useState(null)
  const [status, setStatus] = useState('loading')
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, date: readCachedDate(DATE_CACHE_KEY) }))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')

    loadPage(page, filters, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        const rows = list ?? []
        setRecords(rows)
        setHasNext(rows.length === PAGE_LIMIT)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setRecords([])
        setHasNext(false)
        setStatus('error')
      })

    return () => controller.abort()
  }, [page, filters])

  useEffect(() => {
    const controller = new AbortController()
    setPageCount(null)

    findLastPage(filters, controller.signal)
      .then((count) => {
        if (!controller.signal.aborted) setPageCount(count)
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPageCount(1)
      })

    return () => controller.abort()
  }, [filters])

  function updateFilter(field, value) {
    if (field === 'date') writeCachedDate(DATE_CACHE_KEY, value)
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  async function downloadExcel() {
    setExporting(true)
    setExportError('')
    try {
      const list = await loadAllPages(filters)
      const date = filters.date || todayIso()
      downloadWorkbook(toExcelRows(list), `monitoring-${date}.xlsx`)
    } catch {
      setExportError('Excel fayl yuklanmadi.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Ambulator kunlik monitoring</h1>
        </div>
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields">
          <label>
            Shifokor
            <input
              type="text"
              name="fio"
              value={filters.fio}
              placeholder="Familiya, ism, otasining ismi"
              onChange={(event) => updateFilter('fio', event.target.value)}
            />
          </label>
          <label>
            Sana
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={(event) => updateFilter('date', event.target.value)}
            />
          </label>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              writeCachedDate(DATE_CACHE_KEY, '')
              setFilters(emptyFilters)
              setPage(1)
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Natijalar</h2>
          <DownloadButton
            busy={exporting}
            disabled={status !== 'ready' || records.length === 0}
            onClick={downloadExcel}
          />
        </div>
        {exportError ? <p className="form-error">{exportError}</p> : null}
        <PageStatus
          status={status}
          empty={records.length === 0 ? 'Bu filtr bo‘yicha yozuv topilmadi.' : ''}
        />
        {status === 'ready' && records.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table count-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-date" />
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
                  <th>Sana</th>
                  <th>Qabullar</th>
                  <th>Ko‘riklar</th>
                  <th>Tashxislar</th>
                  <th>Tahlillar</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id}>
                    <td>{(page - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      {record.doctor?.id ? (
                        <Link
                          className="doctor-link"
                          to={`/ambulatory/doctors/${record.doctor.id}?date=${filters.date || record.date}`}
                          state={{ fullName: record.doctor.full_name }}
                        >
                          <ClampText value={record.doctor.full_name} />
                        </Link>
                      ) : (
                        <ClampText value={record.doctor?.full_name} />
                      )}
                    </td>
                    <td>
                      <ClampText value={formatDate(record.date, 'Mavjud emas')} />
                    </td>
                    <td className="num">{record.appointment_count ?? 0}</td>
                    <td className="num">{record.examination_count ?? 0}</td>
                    <td className="num">{record.diagnosis_count ?? 0}</td>
                    <td className="num">{record.analysis_count ?? 0}</td>
                    <td className="num">{record.diagnostika_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <Pager
          page={page}
          pageCount={pageCount}
          hasNext={hasNext}
          disabled={status === 'loading'}
          onPage={setPage}
        />
      </section>
    </main>
  )
}
