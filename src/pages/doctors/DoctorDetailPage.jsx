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

function namedItems(items) {
  return itemLines(items).join('\n') || 'Mavjud emas'
}

export default function DoctorDetailPage() {
  const { doctorId } = useParams()
  const [searchParams] = useSearchParams()
  const date = searchParams.get('date') || ''
  const location = useLocation()
  const fullName = location.state?.fullName || ''
  usePageTitle(fullName || 'Shifokor')
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(1)
  const [openIndex, setOpenIndex] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    setPage(1)
    setOpenIndex(null)
  }, [doctorId, date])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    const query = params.toString()

    setStatus('loading')
    apiFetch(`${BASE_URL}/api/monitoring/doctors/${doctorId}/${query ? `?${query}` : ''}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setPatients(Array.isArray(data) ? data : [])
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPatients([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [doctorId, date])

  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)
  const visible = patients.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT)

  return (
    <main className="dashboard detail-page">
      <header className="detail-head">
        <BackButton />
        <p className="eyebrow">Shifokor</p>
        <h1>{fullName || 'Shifokor'}</h1>
        <div className="detail-toolbar">
          <p className="detail-meta">
            <span>{date ? formatDate(date) : 'Bugungi kun'}</span>
            {status === 'ready' ? <span>{patients.length} bemor</span> : null}
          </p>
          <DownloadButton
            disabled={status !== 'ready' || patients.length === 0}
            onClick={() => {
              const rows = patients.map((patient, index) => ({
                '№': index + 1,
                Bemor: patient.patient_name,
                Tashxis: textOrEmpty(patient.diagnosis),
                'Ko‘rik': textOrEmpty(patient.examination),
                Tahlil: namedItems(patient.laboratory),
                Diagnostika: namedItems(patient.diagnostics),
              }))
              const fileDate = date || 'bugun'
              downloadWorkbook(rows, `bemorlar-${fileDate}.xlsx`, 'Bemorlar')
            }}
          />
        </div>
      </header>

      <section className="panel">
        <PageStatus
          status={status}
          empty={patients.length === 0 ? 'Bu sana bo‘yicha bemor topilmadi.' : ''}
        />
        {status === 'ready' && patients.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-list" />
                <col className="col-list" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Bemor</th>
                  <th>Tashxis</th>
                  <th>Ko‘rik</th>
                  <th>Tahlil</th>
                  <th>Diagnostika</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((patient, index) => (
                  <tr
                    key={`${patient.patient_name}-${index}`}
                    className={openIndex === index ? 'patient-row open' : 'patient-row'}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <td>{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={patient.patient_name} />
                    </td>
                    <td>
                      <ClampText value={patient.diagnosis} />
                    </td>
                    <td>
                      <ClampText value={patient.examination} />
                    </td>
                    <td>
                      <CellLines items={patient.laboratory} />
                    </td>
                    <td>
                      <CellLines items={patient.diagnostics} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status === 'ready' && patients.length > PAGE_LIMIT ? (
          <Pager
            page={currentPage}
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
