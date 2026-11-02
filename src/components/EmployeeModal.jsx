import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../api/index.js'
import { pickMonthPlan } from '../lib/monthPlan'
import PageStatus from './PageStatus'

const API_URL = `${BASE_URL}/api/monitoring/employees`
const BRANCHES_URL = `${BASE_URL}/api/monitoring/employees/branches/`

function text(value) {
  if (value == null) return ''
  return String(value)
}

function parseBranches(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
  return list
    .filter((item) => item && item.id != null)
    .map((item) => ({ id: item.id, name: text(item.name) }))
}

function formFromDetail(detail) {
  const branchId = detail.branch?.id ?? (typeof detail.branch === 'number' ? detail.branch : null)
  const plan = pickMonthPlan(detail)
  return {
    full_name: text(detail.full_name),
    specialization: text(detail.specialization),
    polyclinic: detail.polyclinic ? 'true' : 'false',
    bid: text(detail.bid || plan?.bid),
    daily_limit: text(detail.daily_limit || plan?.daily_limit),
    monthly_limit: text(detail.monthly_limit || plan?.monthly_limit),
    time_count_patient: text(detail.time_count_patient),
    work_normal: text(detail.work_normal),
    branchId: branchId == null ? '' : String(branchId),
    branchName: text(detail.branch?.name),
  }
}

function payloadFromForm(form) {
  return {
    full_name: form.full_name.trim(),
    branch: form.branchId ? Number(form.branchId) : null,
    specialization: form.specialization.trim(),
    polyclinic: form.polyclinic === 'true',
    bid: form.bid.trim(),
    daily_limit: form.daily_limit.trim(),
    monthly_limit: form.monthly_limit.trim(),
    time_count_patient: form.time_count_patient.trim(),
    work_normal: form.work_normal.trim(),
  }
}

export default function EmployeeModal({ employeeId, onClose, onSaved }) {
  const [status, setStatus] = useState('loading')
  const [form, setForm] = useState(null)
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 30)
    return () => window.clearTimeout(timer)
  }, [])

  function requestClose() {
    if (closing || saving) return
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    setOpen(false)
    window.setTimeout(onClose, 400)
  }

  useEffect(() => {
    if (!employeeId) return undefined
    const controller = new AbortController()
    setStatus('loading')
    setForm(null)
    setBranches([])
    setSaveError('')
    setSaved(false)
    Promise.all([
      apiFetch(`${API_URL}/${employeeId}/`, { signal: controller.signal }),
      apiFetch(BRANCHES_URL, { signal: controller.signal }),
    ])
      .then(async ([employeeResponse, branchResponse]) => {
        if (!employeeResponse.ok) throw new Error('request failed')
        const data = await employeeResponse.json()
        const branchData = branchResponse.ok ? await branchResponse.json() : []
        if (controller.signal.aborted) return
        setForm(data && typeof data === 'object' ? formFromDetail(data) : null)
        setBranches(parseBranches(branchData))
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setForm(null)
        setBranches([])
        setStatus('error')
      })
    return () => controller.abort()
  }, [employeeId])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function updateField(name, value) {
    setSaved(false)
    setSaveError('')
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    if (!form || saving) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const response = await apiFetch(`${API_URL}/${employeeId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(form)),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error('request failed')
      const branchId = data?.branch?.id ?? data?.branch ?? (form.branchId ? Number(form.branchId) : null)
      const branchName =
        data?.branch?.name ||
        branches.find((item) => String(item.id) === String(branchId))?.name ||
        form.branchName
      const next = formFromDetail({
        ...form,
        ...(data && typeof data === 'object' ? data : {}),
        branch: { id: branchId, name: branchName },
      })
      setForm(next)
      setSaved(true)
      onSaved?.({
        id: employeeId,
        full_name: next.full_name,
        branch: next.branchId ? { id: Number(next.branchId), name: next.branchName } : null,
        polyclinic: next.polyclinic === 'true',
        bid: next.bid,
      })
    } catch {
      setSaveError('Saqlanmadi. Qayta urinib ko‘ring.')
    } finally {
      setSaving(false)
    }
  }

  const title = form?.full_name?.trim() || 'Shifokor'
  const branchOptions = form?.branchId && !branches.some((item) => String(item.id) === form.branchId)
    ? [{ id: form.branchId, name: form.branchName || 'Bo‘lim' }, ...branches]
    : branches

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
        aria-labelledby="employee-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Shifokor</p>
            <h2 id="employee-modal-title">{status === 'ready' ? title : 'Shifokor'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={requestClose} disabled={saving}>
            Yopish
          </button>
        </div>
        <PageStatus status={status} empty={status === 'ready' && !form ? 'Ma’lumot topilmadi.' : ''} />
        {status === 'ready' && form ? (
          <form className="modal-form" onSubmit={save}>
            <label className="wide">
              F.I.Sh.
              <input
                name="full_name"
                value={form.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
              />
            </label>
            <label>
              Bo‘lim
              <select
                name="branch"
                value={form.branchId}
                onChange={(event) => {
                  const id = event.target.value
                  const name = branchOptions.find((item) => String(item.id) === id)?.name || ''
                  setSaved(false)
                  setSaveError('')
                  setForm((current) => ({ ...current, branchId: id, branchName: name }))
                }}
              >
                <option value="">Tanlanmagan</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={String(branch.id)}>
                    {branch.name || 'Bo‘lim'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mutaxassisligi
              <input
                name="specialization"
                value={form.specialization}
                onChange={(event) => updateField('specialization', event.target.value)}
              />
            </label>
            <label>
              Turi
              <select
                name="polyclinic"
                value={form.polyclinic}
                onChange={(event) => updateField('polyclinic', event.target.value)}
              >
                <option value="true">Poliklinika</option>
                <option value="false">Stasionar</option>
              </select>
            </label>
            <div className="modal-form-actions">
              {saveError ? <p className="modal-form-note error">{saveError}</p> : null}
              {saved ? <p className="modal-form-note">Saqlandi.</p> : null}
              <button type="submit" className="modal-save" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
