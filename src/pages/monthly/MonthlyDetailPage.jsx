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

export default function MonthlyDetailPage() {
  const { doctorId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const patient = searchParams.get('patient') || ''
  const monthRange = currentMonthRange()
  const startDate = searchParams.get('start_date') || monthRange.start
  const endDate = searchParams.get('end_date') || monthRange.end
  const location = useLocation()
  const [doctorName, setDoctorName] = useState(location.state?.fullName || '')
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [openIndex, setOpenIndex] = useState(null)
  const fullName = doctorName || 'Mutaxassis'
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
    const query = params.toString()

    setStatus('loading')
    apiFetch(`${BASE_URL}/api/monitoring/month/${doctorId}/${query ? `?${query}` : ''}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setPatients(Array.isArray(data.patients) ? data.patients : [])
        setDoctorName(data.doctor?.full_name || location.state?.fullName || '')
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPatients([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [doctorId, startDate, endDate, patient, location.state?.fullName])

  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_LIMIT))
  const visible = patients.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT)

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    next.delete('month')
    next.delete('date')
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
      const safeName = fullName.replace(/[\\/:*?"<>|]/g, '').trim()
      const range = orderedRange(startDate, endDate)
      const filePeriod = `${range.start}-${range.end}`
      downloadWorkbook(
        patients.map((patient, index) => ({
          '№': index + 1,
          Shifokor: fullName,
          Bemor: patient.full_name,
          Sana: formatDate(patient.date, 'Mavjud emas'),
          'Ko‘rik': textOrEmpty(patient.korik),
          Tashxis: textOrEmpty(patient.tashxis),
          Tahlil: itemLines(patient.tahlil).join('\n') || 'Mavjud emas',
          Diagnostika: itemLines(patient.diagnostika).join('\n') || 'Mavjud emas',
        })),
        safeName ? `Oylik-${safeName}-${filePeriod}.xlsx` : `Oylik-${doctorId}-${filePeriod}.xlsx`,
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
        <p className="eyebrow">Mutaxassis</p>
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
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-list" />
                <col className="col-list" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Bemor</th>
                  <th>Sana</th>
                  <th>Ko‘rik</th>
                  <th>Tashxis</th>
                  <th>Tahlil</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((patient, index) => (
                  <tr
                    key={patient.id ?? `${patient.full_name}-${index}`}
                    className={openIndex === index ? 'patient-row open' : 'patient-row'}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <td>{(page - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={patient.full_name} />
                    </td>
                    <td>
                      <ClampText value={formatDate(patient.date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={patient.korik} />
                    </td>
                    <td>
                      <ClampText value={patient.tashxis} />
                    </td>
                    <td>
                      <CellLines items={patient.tahlil} />
                    </td>
                    <td>
                      <CellLines items={patient.diagnostika} />
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
