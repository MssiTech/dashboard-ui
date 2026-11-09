import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../api/index.js'
import PageStatus from './PageStatus'

const API_URL = `${BASE_URL}/api/inventory/`
const BRANCHES_URL = `${BASE_URL}/api/monitoring/employees/branches/`

function text(value) {
  if (value == null) return ''
  if (typeof value === 'object') return String(value.name || value.full_name || '')
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
  return {
    device: text(detail.device || detail.qurilma || detail.name),
    model: text(detail.model),
    branchId: branchId == null ? '' : String(branchId),
    branchName: text(detail.branch?.name || detail.branch || detail.department),
    responsible: text(detail.responsible_person || detail.responsible || detail.masul),
    description: text(detail.description || detail.tavsif),
  }
}

function emptyForm() {
  return {
    device: '',
    model: '',
    branchId: '',
    branchName: '',
    responsible: '',
    description: '',
  }
}

function payloadFromForm(form) {
  return {
    device: form.device.trim(),
    model: form.model.trim(),
    branch: form.branchId ? Number(form.branchId) : null,
    responsible_person: form.responsible.trim(),
    description: form.description.trim(),
  }
}

export default function InventoryModal({ itemId, onClose, onSaved }) {
  const [status, setStatus] = useState(itemId ? 'loading' : 'ready')
  const [form, setForm] = useState(itemId ? null : emptyForm)
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
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
    const controller = new AbortController()
    const requests = [apiFetch(BRANCHES_URL, { signal: controller.signal })]
    if (itemId) {
      setStatus('loading')
      requests.push(apiFetch(`${API_URL}${itemId}/`, { signal: controller.signal }))
    }
    Promise.all(requests)
      .then(async ([branchResponse, itemResponse]) => {
        const branchData = branchResponse.ok ? await branchResponse.json() : []
        if (controller.signal.aborted) return
        setBranches(parseBranches(branchData))
        if (!itemId) {
          setStatus('ready')
          return
        }
        if (!itemResponse.ok) throw new Error('request failed')
        const data = await itemResponse.json()
        if (controller.signal.aborted) return
        setForm(data && typeof data === 'object' ? formFromDetail(data) : emptyForm())
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        if (itemId) {
          setForm(null)
          setStatus('error')
        } else {
          setBranches([])
          setStatus('ready')
        }
      })
    return () => controller.abort()
  }, [itemId])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function updateField(name, value) {
    setSaveError('')
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    if (!form || saving) return
    if (!form.device.trim()) {
      setSaveError('Qurilma nomini kiriting.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const url = itemId ? `${API_URL}${itemId}/` : API_URL
      const response = await apiFetch(url, {
        method: itemId ? 'PUT' : 'POST',
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
      onSaved?.({
        id: data?.id ?? itemId,
        device: data?.device || form.device,
        model: data?.model || form.model,
        branch: branchId ? { id: Number(branchId), name: branchName } : branchName || null,
        responsible_person: data?.responsible_person || form.responsible,
        description: data?.description || form.description,
      })
      requestClose()
    } catch {
      setSaveError('Saqlanmadi. Qayta urinib ko‘ring.')
    } finally {
      setSaving(false)
    }
  }

  const title = itemId ? form?.device?.trim() || 'Inventar' : 'Yangi inventar'
  const branchOptions =
    form?.branchId && !branches.some((item) => String(item.id) === form.branchId)
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
        aria-labelledby="inventory-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Inventarizatsiya</p>
            <h2 id="inventory-modal-title">{status === 'ready' ? title : 'Inventar'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={requestClose} disabled={saving}>
            Yopish
          </button>
        </div>
        <PageStatus status={status} empty={status === 'ready' && !form ? 'Ma’lumot topilmadi.' : ''} />
        {status === 'ready' && form ? (
          <form className="modal-form" onSubmit={save}>
            <label>
              Qurilma
              <input
                name="device"
                value={form.device}
                onChange={(event) => updateField('device', event.target.value)}
              />
            </label>
            <label>
              Model
              <input
                name="model"
                value={form.model}
                onChange={(event) => updateField('model', event.target.value)}
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
              Mas’ul shaxs
              <input
                name="responsible"
                value={form.responsible}
                onChange={(event) => updateField('responsible', event.target.value)}
              />
            </label>
            <label className="wide">
              Tavsif
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>
            <div className="modal-form-actions">
              {saveError ? <p className="modal-form-note error">{saveError}</p> : null}
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
