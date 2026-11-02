import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import BackButton from '../../components/BackButton'
import ClampText from '../../components/ClampText'
import ColumnChart from '../../components/ColumnChart'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import PatientModal from '../../components/PatientModal'
import { downloadWorkbook } from '../../excel'
import { formatDate, readCachedDate, writeCachedDate } from '../../lib/date'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/monitoring/districts/patients/`
const STATS_URL = `${BASE_URL}/api/monitoring/districts/stats/`
const DATE_FROM_KEY = 'monitor-dashboard-start'
const DATE_TO_KEY = 'monitor-dashboard-end'

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

function parsePatients(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.patients)) return data.patients
  if (data && typeof data === 'object' && data.full_name) return [data]
  return []
}

function queryParams({ district, start, end, page, limit }) {
  const params = new URLSearchParams({
    start_date: start,
    end_date: end,
    page: String(page),
    limit: String(limit),
  })
  if (district) params.set('district', district)
  return params
}

async function loadPage({ district, start, end, page, limit }, signal) {
  const response = await apiFetch(`${API_URL}?${queryParams({ district, start, end, page, limit })}`, {
    signal,
  })
  if (!response.ok) throw new Error('request failed')
  return response.json()
}

async function loadAllPatients(district, start, end) {
  const rows = []
  let page = 1

  while (page <= 500) {
    const data = await loadPage({ district, start, end, page, limit: 100 })
    const list = parsePatients(data)
    rows.push(...list)
    if (!data.next || list.length === 0) break
    page += 1
  }

  return rows
}

function cell(value) {
  const text = String(value || '').trim()
  return text || 'Mavjud emas'
}

function excelRows(list) {
  return list.map((patient, index) => ({
    '№': index + 1,
    Bemor: cell(patient.full_name),
    Mahalla: cell(patient.neighborhood),
    Poliklinika: cell(patient.polyclinic),
    'Bo‘lim': cell(patient.branch),
    Tashxis: cell(patient.mkb_10_name),
    'Qabul sanasi': formatDate(patient.reception_date) || 'Mavjud emas',
    Shifokor: cell(patient.doctor),
  }))
}

export default function DistrictPatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const district = searchParams.get('district') || ''
  const month = currentMonthRange()
  const startDate = searchParams.get('start_date') || readCachedDate(DATE_FROM_KEY) || month.start
  const endDate = searchParams.get('end_date') || readCachedDate(DATE_TO_KEY) || month.end
  const range = orderedRange(startDate, endDate)
  usePageTitle(district || 'Tuman bo‘yicha')
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [diseases, setDiseases] = useState([])
  const [branches, setBranches] = useState([])
  const [statsStatus, setStatsStatus] = useState('loading')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [district, range.start, range.end])

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    loadPage(
      { district, start: range.start, end: range.end, page, limit: PAGE_LIMIT },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return
        const list = parsePatients(data)
        setPatients(list)
        setTotal(typeof data.count === 'number' ? data.count : list.length)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPatients([])
        setTotal(0)
        setStatus('error')
      })

    return () => controller.abort()
  }, [district, range.start, range.end, page])

  useEffect(() => {
    if (!district) {
      setDiseases([])
      setBranches([])
      setStatsStatus('ready')
      return undefined
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      district,
      start_date: range.start,
      end_date: range.end,
    })
    setStatsStatus('loading')
    apiFetch(`${STATS_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setDiseases(Array.isArray(data.diseases) ? data.diseases : [])
        setBranches(Array.isArray(data.branches) ? data.branches : [])
        setStatsStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setDiseases([])
        setBranches([])
        setStatsStatus('error')
      })

    return () => controller.abort()
  }, [district, range.start, range.end])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)

  function updateRange(start, end) {
    const next = orderedRange(start, end)
    writeCachedDate(DATE_FROM_KEY, next.start)
    writeCachedDate(DATE_TO_KEY, next.end)
    const params = new URLSearchParams(searchParams)
    if (district) params.set('district', district)
    params.set('start_date', next.start)
    params.set('end_date', next.end)
    setSearchParams(params)
  }

  async function download() {
    setExporting(true)
    setExportError('')
    try {
      const list = await loadAllPatients(district, range.start, range.end)
      downloadWorkbook(excelRows(list), `bemorlar-${district || 'tuman'}.xlsx`, 'Bemorlar')
    } catch {
      setExportError('Fayl yuklanmadi.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="dashboard patients-page">
      <header className="detail-head patients-head">
        <BackButton />
        <div className="patients-head-row">
          <h1>{district || 'Tuman'}</h1>
          {status === 'ready' ? (
            <p className="detail-meta">
              <span>{total} bemor</span>
            </p>
          ) : null}
          <DownloadButton
            busy={exporting}
            disabled={status !== 'ready' || total === 0}
            onClick={download}
          />
        </div>
        {exportError ? <p className="form-error">{exportError}</p> : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields period">
          <label>
            Sanadan
            <input
              type="date"
              name="start"
              value={range.start}
              onChange={(event) => updateRange(event.target.value || month.start, range.end)}
            />
          </label>
          <label>
            Sanagacha
            <input
              type="date"
              name="end"
              value={range.end}
              onChange={(event) => updateRange(range.start, event.target.value || month.end)}
            />
          </label>
          <button
            type="button"
            className="clear-button"
            onClick={() => updateRange(month.start, month.end)}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="stats-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Eng ko‘p tashxis</h2>
          </div>
          <PageStatus
            status={statsStatus}
            empty={diseases.length === 0 ? 'Bu oraliqda tashxis topilmadi.' : ''}
          />
          {statsStatus === 'ready' && diseases.length > 0 ? (
            <ColumnChart
              key={`tashxis-${range.start}-${range.end}-${district}`}
              rows={diseases}
              eyebrow="Tanlangan tashxis"
              unit="ta"
              label="Eng ko‘p tashxis"
            />
          ) : null}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Eng ko‘p bo‘lim</h2>
          </div>
          <PageStatus
            status={statsStatus}
            empty={branches.length === 0 ? 'Bu oraliqda bo‘lim topilmadi.' : ''}
          />
          {statsStatus === 'ready' && branches.length > 0 ? (
            <ColumnChart
              key={`bolim-${range.start}-${range.end}-${district}`}
              rows={branches}
              eyebrow="Tanlangan bo‘lim"
              unit="ta"
              label="Eng ko‘p bo‘lim"
            />
          ) : null}
        </section>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Bemorlar</h2>
        </div>
        <PageStatus
          status={status}
          empty={patients.length === 0 ? 'Bu oraliqda bemor topilmadi.' : ''}
        />
        {status === 'ready' && patients.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table stay-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-date" />
                <col className="col-name" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Bemor</th>
                  <th>Mahalla</th>
                  <th>Poliklinika</th>
                  <th>Bo‘lim</th>
                  <th>Tashxis</th>
                  <th>Qabul sanasi</th>
                  <th>Shifokor</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr
                    key={patient.id || `${patient.full_name}-${index}`}
                    className={patient.id ? 'patient-row' : undefined}
                    onClick={() => {
                      if (patient.id) setSelectedId(patient.id)
                    }}
                  >
                    <td>{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={patient.full_name} />
                    </td>
                    <td>
                      <ClampText value={patient.neighborhood} />
                    </td>
                    <td>
                      <ClampText value={patient.polyclinic} />
                    </td>
                    <td>
                      <ClampText value={patient.branch} />
                    </td>
                    <td>
                      <ClampText value={patient.mkb_10_name} />
                    </td>
                    <td>
                      <ClampText value={formatDate(patient.reception_date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={patient.doctor} />
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
      {selectedId ? <PatientModal patientId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </main>
  )
}
