import { useEffect, useRef, useState } from 'react'
import { BASE_URL, apiFetch } from '../../api/index.js'
import CellLines from '../../components/CellLines'
import ClampText from '../../components/ClampText'
import DownloadButton from '../../components/DownloadButton'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { downloadWorkbook } from '../../excel'
import { formatDate, readCachedDate, todayIso, writeCachedDate } from '../../lib/date'
import { pickMonthPlan } from '../../lib/monthPlan'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'
import { itemLines } from '../../lib/presence'

const DOCTORS_URL = `${BASE_URL}/api/monitoring/employees/`
const PATIENTS_URL = `${BASE_URL}/api/monitoring/patient-doctors/`
const DATE_FROM_KEY = 'monitor-doctors-date-from'
const DATE_TO_KEY = 'monitor-doctors-date-to'

function prescriptionLines(patient) {
  const value = patient.prescriptions ?? patient.prescription ?? patient.recipes ?? patient.recipe ?? patient.retsept
  return itemLines(value)
}

function dateRange(from, to) {
  const today = todayIso()
  let start = from || to || today
  let end = to || from || today
  if (start > end) [start, end] = [end, start]
  return { start, end }
}

function branchName(branch) {
  if (branch && typeof branch === 'object') return String(branch.name || '').trim()
  return String(branch || '').trim()
}

function clinicType(value) {
  if (value == null) return ''
  return value ? 'Poliklinika' : 'Stasionar'
}

function planValue(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

function doctorMeta(doctor, iso) {
  const plan = pickMonthPlan(doctor, iso)
  return [
    doctor.specialization,
    clinicType(doctor.polyclinic),
    branchName(doctor.branch),
    plan ? `Stavka ${planValue(plan.bid)}` : '',
  ].filter(Boolean).join(' · ')
}

async function loadDoctors(query, signal) {
  const params = new URLSearchParams({
    page: '1',
    limit: String(PAGE_LIMIT),
  })
  const name = query.trim()
  if (name) params.set('full_name', name)
  const response = await apiFetch(`${DOCTORS_URL}?${params}`, { signal })
  if (!response.ok) throw new Error('request failed')
  const data = await response.json()
  const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
  return [...list].sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'uz'))
}

async function loadPatients(doctorId, start, end, signal) {
  const params = new URLSearchParams({
    start_date: start,
    end_date: end,
  })
  if (doctorId) params.set('doctor_id', doctorId)
  const response = await apiFetch(`${PATIENTS_URL}?${params}`, { signal })
  if (!response.ok) throw new Error('request failed')
  const data = await response.json()
  return Array.isArray(data?.patients) ? data.patients : []
}

export default function DoctorsPage() {
  usePageTitle('Shifokorlar kunlik monitoring')
  const [doctors, setDoctors] = useState([])
  const [doctorsReady, setDoctorsReady] = useState(false)
  const doctorInputRef = useRef(null)
  const [doctorQuery, setDoctorQuery] = useState('')
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [dateFrom, setDateFrom] = useState(() => readCachedDate(DATE_FROM_KEY) || todayIso())
  const [dateTo, setDateTo] = useState(() => readCachedDate(DATE_TO_KEY) || todayIso())
  const [patients, setPatients] = useState([])
  const [page, setPage] = useState(1)
  const [openIndex, setOpenIndex] = useState(null)
  const [status, setStatus] = useState('loading')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!doctorOpen) return undefined

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setDoctorsReady(false)
      loadDoctors(doctorQuery, controller.signal)
        .then((list) => {
          if (controller.signal.aborted) return
          setDoctors(list)
          setDoctorsReady(true)
        })
        .catch((error) => {
          if (error.name === 'AbortError') return
          setDoctors([])
          setDoctorsReady(true)
        })
    }, doctorQuery.trim() ? 250 : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [doctorQuery, doctorOpen])

  useEffect(() => {
    const range = dateRange(dateFrom, dateTo)
    const controller = new AbortController()
    setStatus('loading')
    setOpenIndex(null)
    loadPatients(doctorId, range.start, range.end, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setPatients(list)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPatients([])
        setStatus('error')
      })

    return () => controller.abort()
  }, [doctorId, dateFrom, dateTo])

  const range = dateRange(dateFrom, dateTo)
  const selectedBid = planValue(pickMonthPlan(selectedDoctor, range.start)?.bid)
  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)
  const visible = patients.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT)

  function download() {
    setExporting(true)
    const rows = patients.map((patient, index) => ({
      '№': index + 1,
      Bemor: patient.full_name,
      Sana: formatDate(patient.date),
      Tashxis: patient.tashxis || 'Mavjud emas',
      Tahlil: itemLines(patient.tahlil).join('\n') || 'Mavjud emas',
      Diagnostika: itemLines(patient.diagnostika).join('\n') || 'Mavjud emas',
      Retsept: prescriptionLines(patient).join('\n') || 'Mavjud emas',
    }))
    downloadWorkbook(rows, `bemorlar-${range.start}-${range.end}.xlsx`, 'Bemorlar')
    setExporting(false)
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Shifokorlar kunlik monitoring</h1>
        </div>
        {selectedDoctor ? (
          <p className="detail-meta">
            <span>Stavka {selectedBid}</span>
          </p>
        ) : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields range">
          <label>
            Shifokor
            <span className="doctor-combo">
              <input
                ref={doctorInputRef}
                name="doctor"
                role="combobox"
                aria-expanded={doctorOpen}
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Shifokorni tanlang"
                value={doctorOpen ? doctorQuery : (selectedDoctor?.full_name || '')}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.currentTarget.focus({ preventScroll: true })
                }}
                onFocus={() => {
                  setDoctorQuery('')
                  setDoctorOpen(true)
                }}
                onChange={(event) => {
                  setDoctorQuery(event.target.value)
                  setDoctorOpen(true)
                }}
                onBlur={() => {
                  setDoctorOpen(false)
                  setDoctorQuery('')
                }}
              />
              {doctorOpen ? (
                <ul className="doctor-menu" role="listbox">
                  {doctorsReady && doctors.length === 0 ? <li className="doctor-empty">Topilmadi</li> : null}
                  {doctors.map((doctor) => (
                    <li key={doctor.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={String(doctor.id) === String(doctorId)}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          setDoctorId(String(doctor.id))
                          setSelectedDoctor(doctor)
                          setDoctorQuery('')
                          setDoctorOpen(false)
                          setPage(1)
                          doctorInputRef.current?.blur()
                        }}
                      >
                        <strong>{doctor.full_name}</strong>
                        {doctorMeta(doctor, dateFrom) ? <span>{doctorMeta(doctor, dateFrom)}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </span>
          </label>
          <label>
            Sanadan
            <input
              type="date"
              name="dateFrom"
              value={dateFrom}
              onChange={(event) => {
                writeCachedDate(DATE_FROM_KEY, event.target.value)
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            Sanagacha
            <input
              type="date"
              name="dateTo"
              value={dateTo}
              onChange={(event) => {
                writeCachedDate(DATE_TO_KEY, event.target.value)
                setDateTo(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              const today = todayIso()
              writeCachedDate(DATE_FROM_KEY, today)
              writeCachedDate(DATE_TO_KEY, today)
              setDoctorQuery('')
              setDoctorOpen(false)
              setDoctorId('')
              setSelectedDoctor(null)
              setDateFrom(today)
              setDateTo(today)
              setPage(1)
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Bemorlar</h2>
          <DownloadButton
            busy={exporting}
            disabled={status !== 'ready' || patients.length === 0}
            onClick={download}
          />
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
                  <th>Sana</th>
                  <th>Tashxis</th>
                  <th>Tahlil</th>
                  <th>Diagnostika</th>
                  <th>Retsept</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((patient, index) => (
                  <tr
                    key={`${patient.id}-${index}`}
                    className={openIndex === index ? 'patient-row open' : 'patient-row'}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <td>{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={patient.full_name} />
                    </td>
                    <td>
                      <ClampText value={formatDate(patient.date, 'Mavjud emas')} />
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
                    <td>
                      <CellLines lines={prescriptionLines(patient)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status === 'ready' && patients.length > 0 ? (
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
