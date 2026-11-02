import { useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { BASE_URL, apiFetch } from '../../api/index.js'
import BackButton from '../../components/BackButton'
import CellLines from '../../components/CellLines'
import ClampText from '../../components/ClampText'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { downloadWorkbook } from '../../excel'
import { formatDate } from '../../lib/date'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'
import { itemLines } from '../../lib/presence'

function textOrEmpty(value) {
  return value || 'Mavjud emas'
}

function korikEntries(value) {
  if (!value) return []
  if (typeof value === 'string') return value.trim() ? [{ tashxis: value }] : []
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && (typeof item === 'string' || item.doctor || item.date || item.tashxis))
}

function korikExcel(value) {
  return korikEntries(value)
    .map((item) => {
      if (typeof item === 'string') return item
      const head = [item.doctor, formatDate(item.date)].filter(Boolean).join(', ')
      return [head, (item.tashxis || '').trim()].filter(Boolean).join('\n')
    })
    .join('\n')
}

function KorikCell({ items }) {
  const list = korikEntries(items)
  if (!list.length) return <span className="muted-cell">Mavjud emas</span>
  return (
    <ul className="cell-list">
      {list.map((item, index) => {
        if (typeof item === 'string') return <li key={index}>{item}</li>
        const head = [item.doctor, formatDate(item.date)].filter(Boolean).join(', ')
        const diagnosis = (item.tashxis || '').trim()
        return (
          <li key={index}>
            {head}
            {head && diagnosis ? <br /> : null}
            {diagnosis}
          </li>
        )
      })}
    </ul>
  )
}

function typeLabel(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'oddiy') return 'Oddiy'
  if (key === 'rezident') return 'Rezident'
  if (key === 'non_rezident' || key === 'norezident') return 'Norezident'
  return value || 'Mavjud emas'
}

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

export default function BranchDoctorDetailPage() {
  const { doctorId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const patient = searchParams.get('patient') || ''
  const monthRange = currentMonthRange()
  const startDate = searchParams.get('start_date') || monthRange.start
  const endDate = searchParams.get('end_date') || monthRange.end
  const location = useLocation()
  const [doctorName, setDoctorName] = useState(location.state?.fullName || '')
  const [branch, setBranch] = useState(location.state?.branch || '')
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [openIndex, setOpenIndex] = useState(null)
  const fullName = doctorName || 'Shifokor'
  usePageTitle(fullName)

  useEffect(() => {
    setPage(1)
    setOpenIndex(null)
  }, [doctorId, startDate, endDate, patient])

  useEffect(() => {
    const controller = new AbortController()
    const range = orderedRange(startDate, endDate)
    const params = new URLSearchParams({
      start_date: range.start,
      end_date: range.end,
    })
    const name = patient.trim()
    if (name) params.set('patient', name)

    setStatus('loading')
    apiFetch(`${BASE_URL}/api/monitoring/month/doctors/${doctorId}/?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setPatients(Array.isArray(data.patients) ? data.patients : [])
        setDoctorName(data.doctor?.full_name || location.state?.fullName || '')
        setBranch(data.branch || location.state?.branch || '')
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPatients([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [doctorId, startDate, endDate, patient, location.state?.fullName, location.state?.branch])

  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_LIMIT))
  const visible = patients.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT)

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true, state: location.state })
  }

  function clearFilters() {
    const range = currentMonthRange()
    const next = new URLSearchParams()
    next.set('start_date', range.start)
    next.set('end_date', range.end)
    setSearchParams(next, { replace: true, state: location.state })
  }

  function download() {
    setExporting(true)
    setExportError('')
    try {
      const range = orderedRange(startDate, endDate)
      const safeName = fullName.replace(/[\\/:*?"<>|]/g, '').trim()
      downloadWorkbook(
        patients.map((item, index) => ({
          '№': index + 1,
          Shifokor: fullName,
          Bemor: item.full_name,
          Boshlanish: formatDate(item.start_date, 'Mavjud emas'),
          Tugash: formatDate(item.end_date, 'Mavjud emas'),
          Tur: typeLabel(item.tur),
          'Ko‘rik': korikExcel(item.korik) || 'Mavjud emas',
          Tashxis: textOrEmpty(item.tashxis),
          Tahlil: itemLines(item.tahlil).join('\n') || 'Mavjud emas',
          Diagnostika: itemLines(item.diagnostika).join('\n') || 'Mavjud emas',
        })),
        safeName
          ? `Bolim shifokori-${safeName}-${range.start}-${range.end}.xlsx`
          : `Bolim shifokori-${doctorId}-${range.start}-${range.end}.xlsx`,
        'Bemorlar',
      )
    } catch {
      setExportError('Fayl yuklanmadi.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="dashboard detail-page">
      <header className="detail-head">
        <BackButton />
        <p className="eyebrow">{branch || 'Bo‘lim shifokori'}</p>
        <h1>{fullName}</h1>
        {status === 'ready' ? (
          <div className="detail-toolbar">
            <p className="detail-meta">
              <span>{patients.length} bemor</span>
            </p>
            <DownloadButton busy={exporting} disabled={patients.length === 0} onClick={download} />
          </div>
        ) : null}
        {exportError ? <p className="form-error">{exportError}</p> : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields range">
          <label>
            Bemor
            <input
              type="text"
              name="patient"
              value={patient}
              placeholder="Familiya, ism, otasining ismi"
              onChange={(event) => setFilter('patient', event.target.value)}
            />
          </label>
          <label>
            Sanadan
            <input
              type="date"
              name="start_date"
              value={startDate}
              onChange={(event) => setFilter('start_date', event.target.value || currentMonthRange().start)}
            />
          </label>
          <label>
            Sanagacha
            <input
              type="date"
              name="end_date"
              value={endDate}
              onChange={(event) => setFilter('end_date', event.target.value || currentMonthRange().end)}
            />
          </label>
          <button type="button" className="clear-button" onClick={clearFilters}>
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <PageStatus status={status} empty={patients.length === 0 ? 'Bemor topilmadi.' : ''} />
        {status === 'ready' && patients.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table stay-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-date" />
                <col className="col-date" />
                <col className="col-type" />
                <col className="col-list" />
                <col className="col-text" />
                <col className="col-list" />
                <col className="col-list" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Bemor</th>
                  <th>Boshlanish</th>
                  <th>Tugash</th>
                  <th>Tur</th>
                  <th>Ko‘rik</th>
                  <th>Tashxis</th>
                  <th>Tahlil</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item, index) => (
                  <tr
                    key={item.id ?? index}
                    className={openIndex === index ? 'patient-row open' : 'patient-row'}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <td>{(page - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={item.full_name} />
                    </td>
                    <td>
                      <ClampText value={formatDate(item.start_date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={formatDate(item.end_date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={typeLabel(item.tur)} />
                    </td>
                    <td>
                      <KorikCell items={item.korik} />
                    </td>
                    <td>
                      <ClampText value={item.tashxis} />
                    </td>
                    <td>
                      <CellLines items={item.tahlil} />
                    </td>
                    <td>
                      <CellLines items={item.diagnostika} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status === 'ready' && patients.length > PAGE_LIMIT ? (
          <Pager
            page={page}
            pageCount={pageCount}
            onPage={(next) => {
              setOpenIndex(null)
              setPage(next)
            }}
          />
        ) : null}
      </section>
    </main>
  )
}
