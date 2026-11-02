import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
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

function visitLines(visits) {
  if (!Array.isArray(visits)) return []
  return visits.map((visit) => {
    const date = visit?.date ? formatDate(visit.date) : ''
    const doctor = visit?.doctor_full_name || ''
    const diagnosis = visit?.mkb_10_name || ''
    return [date, doctor, diagnosis].filter(Boolean).join(' — ')
  }).filter(Boolean)
}

async function resolveDoctorName(doctorId, knownName) {
  if (knownName) return knownName
  const response = await apiFetch(`${BASE_URL}/api/month-monitor/branches/`)
  if (!response.ok) return ''
  const data = await response.json()
  const match = Array.isArray(data)
    ? data.find((row) => String(row.id) === String(doctorId))
    : null
  return match?.doctor || ''
}

async function loadAllPatients(doctorId) {
  const rows = []
  let page = 1

  while (page <= 500) {
    const params = new URLSearchParams({ page: String(page), limit: '100' })
    const response = await apiFetch(
      `${BASE_URL}/api/month-monitor/branches/${doctorId}/?${params}`,
    )
    if (!response.ok) throw new Error('request failed')
    const data = await response.json()
    const list = Array.isArray(data.results) ? data.results : []
    rows.push(...list)
    if (!data.next || list.length === 0) break
    page += 1
  }

  return rows
}

export default function BranchDetailPage() {
  const { doctorId } = useParams()
  const location = useLocation()
  const fullName = location.state?.fullName || 'Shifokor'
  usePageTitle(fullName)
  const branch = location.state?.branch || ''
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  useEffect(() => {
    setPage(1)
    setOpenIndex(null)
  }, [doctorId])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
    })

    setStatus('loading')
    apiFetch(`${BASE_URL}/api/month-monitor/branches/${doctorId}/?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setRows(Array.isArray(data.results) ? data.results : [])
        setTotal(data.count ?? 0)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setRows([])
        setTotal(0)
        setStatus('error')
      })

    return () => controller.abort()
  }, [doctorId, page])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  async function download() {
    setExporting(true)
    setExportError('')
    try {
      const [list, doctorName] = await Promise.all([
        loadAllPatients(doctorId),
        resolveDoctorName(doctorId, location.state?.fullName),
      ])
      const safeName = doctorName.replace(/[\\/:*?"<>|]/g, '').trim()
      downloadWorkbook(
        list.map((row) => ({
          '№': row.number,
          Shifokor: doctorName,
          Bemor: row.patient,
          Boshlanish: formatDate(row.start_date, 'Mavjud emas'),
          Tugash: formatDate(row.end_date, 'Mavjud emas'),
          Tashxis: row.diagnosis || 'Mavjud emas',
          Tashriflar: visitLines(row.visits).join('\n') || 'Mavjud emas',
          Tahlil: itemLines(row.analysis).join('\n') || 'Mavjud emas',
          Diagnostika: itemLines(row.diagnostics).join('\n') || 'Mavjud emas',
        })),
        safeName ? `bolimlar-${safeName}.xlsx` : `bolimlar-${doctorId}.xlsx`,
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
        <p className="eyebrow">{branch || 'Bo‘lim'}</p>
        <h1>{fullName}</h1>
        {status === 'ready' ? (
          <div className="detail-toolbar">
            <p className="detail-meta">
              <span>{total} bemor</span>
            </p>
            <DownloadButton busy={exporting} disabled={rows.length === 0} onClick={download} />
          </div>
        ) : null}
        {exportError ? <p className="form-error">{exportError}</p> : null}
      </header>

      <section className="panel">
        <PageStatus status={status} empty={rows.length === 0 ? 'Bemor topilmadi.' : ''} />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table stay-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-date" />
                <col className="col-date" />
                <col className="col-text" />
                <col className="col-list" />
                <col className="col-list" />
                <col className="col-list" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Bemor</th>
                  <th>Boshlanish</th>
                  <th>Tugash</th>
                  <th>Tashxis</th>
                  <th>Ko‘riklar</th>
                  <th>Tahlil</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.number ?? index}
                    className={openIndex === index ? 'patient-row open' : 'patient-row'}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <td>{row.number}</td>
                    <td className="name-cell">
                      <ClampText value={row.patient} />
                    </td>
                    <td>
                      <ClampText value={formatDate(row.start_date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={formatDate(row.end_date, 'Mavjud emas')} />
                    </td>
                    <td>
                      <ClampText value={row.diagnosis} />
                    </td>
                    <td>
                      <CellLines lines={visitLines(row.visits)} />
                    </td>
                    <td>
                      <CellLines items={row.analysis} />
                    </td>
                    <td>
                      <CellLines items={row.diagnostics} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status === 'ready' && total > PAGE_LIMIT ? (
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
