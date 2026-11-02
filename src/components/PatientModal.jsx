import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../api/index.js'
import { formatDate } from '../lib/date'
import PageStatus from './PageStatus'

const DETAIL_URL = `${BASE_URL}/api/monitoring/districts/patients`

function cell(value) {
  const text = String(value || '').trim()
  return text || 'Mavjud emas'
}

function Fact({ label, value, wide = false }) {
  return (
    <p className={wide ? 'modal-fact wide' : 'modal-fact'}>
      <span>{label}</span>
      {value}
    </p>
  )
}

export default function PatientModal({ patientId, onClose }) {
  const [status, setStatus] = useState('loading')
  const [detail, setDetail] = useState(null)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 30)
    return () => window.clearTimeout(timer)
  }, [])

  function requestClose() {
    if (closing) return
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    setOpen(false)
    window.setTimeout(onClose, 400)
  }

  useEffect(() => {
    if (!patientId) return undefined
    const controller = new AbortController()
    setStatus('loading')
    setDetail(null)
    apiFetch(`${DETAIL_URL}/${patientId}/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        setDetail(data && typeof data === 'object' ? data : null)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setDetail(null)
        setStatus('error')
      })
    return () => controller.abort()
  }, [patientId])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = cell(detail?.patient)

  return (
    <div
      className={open ? 'modal-backdrop open' : 'modal-backdrop'}
      onClick={requestClose}
      onTransitionEnd={(event) => {
        if (closing && event.target === event.currentTarget && event.propertyName === 'opacity') onClose()
      }}
      role="presentation"
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Bemor</p>
            <h2 id="patient-modal-title">{status === 'ready' ? title : 'Bemor'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={requestClose}>
            Yopish
          </button>
        </div>
        <PageStatus status={status} empty={status === 'ready' && !detail ? 'Ma’lumot topilmadi.' : ''} />
        {status === 'ready' && detail ? (
          <>
            <div className="passport-block">
              <div className="passport-photo" aria-hidden="true">
                <small>Rasm yo‘q</small>
              </div>
              <div className="passport-fields">
                <Fact label="F.I.Sh." value={title} />
                <Fact label="Passport" value={cell(detail.passport_series)} />
                <Fact label="Tug‘ilgan sana" value={formatDate(detail.birth_date) || 'Mavjud emas'} />
                <Fact label="INN" value={cell(detail.inn)} />
                <Fact label="Telefon" value={cell(detail.phone)} />
              </div>
            </div>
            <div className="fact-grid">
              <Fact label="Viloyat" value={cell(detail.region)} />
              <Fact label="Tuman" value={cell(detail.city)} />
              <Fact label="Mahalla" value={cell(detail.neighborhood)} />
              <Fact label="Poliklinika" value={cell(detail.polyclinic)} />
              <Fact label="Bo‘lim" value={cell(detail.branch)} />
              <Fact label="Qabul sanasi" value={formatDate(detail.reception_date) || 'Mavjud emas'} />
              <Fact label="Shifokor" value={cell(detail.doctor)} />
              <Fact label="Tashxis" value={cell(detail.mkb_10_name)} wide />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
