import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../../api/index.js'
import ClampText from '../../components/ClampText'
import InventoryModal from '../../components/InventoryModal'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/inventory/`

function cell(value) {
  if (value && typeof value === 'object') return String(value.name || value.full_name || '').trim() || 'Mavjud emas'
  const text = String(value ?? '').trim()
  return text || 'Mavjud emas'
}

function mapRow(row) {
  return {
    id: row.id,
    device: row.device || row.qurilma || row.name || '',
    model: row.model || '',
    branch: row.branch,
    responsible: row.responsible_person || row.responsible || row.masul || '',
    description: row.description || row.tavsif || '',
  }
}

export default function InventoryPage() {
  usePageTitle('Inventarizatsiya')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
    })
    setStatus('loading')
    apiFetch(`${API_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          if (controller.signal.aborted) return
          setRows([])
          setTotal(0)
          setStatus('ready')
          return
        }
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        if (Array.isArray(data)) {
          const start = (page - 1) * PAGE_LIMIT
          setRows(data.slice(start, start + PAGE_LIMIT).map(mapRow))
          setTotal(data.length)
        } else {
          const list = Array.isArray(data.results) ? data.results : []
          setRows(list.map(mapRow))
          setTotal(typeof data.count === 'number' ? data.count : list.length)
        }
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setRows([])
        setTotal(0)
        setStatus('error')
      })
    return () => controller.abort()
  }, [page])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)

  function upsertRow(item) {
    const next = mapRow(item)
    setRows((current) => {
      const exists = current.some((row) => row.id && next.id && row.id === next.id)
      if (exists) return current.map((row) => (row.id === next.id ? { ...row, ...next } : row))
      return [next, ...current]
    })
    if (modal === 'new') setTotal((count) => count + 1)
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Inventarizatsiya</h1>
        </div>
        {status === 'ready' ? (
          <p className="detail-meta">
            <span>{total} inventar</span>
          </p>
        ) : null}
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Ro‘yxat</h2>
          <button type="button" className="excel-button add-button" onClick={() => setModal('new')}>
            Inventar qo‘shish
          </button>
        </div>
        <PageStatus
          status={status}
          empty={rows.length === 0 ? 'Inventar topilmadi.' : ''}
        />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table report-table stay-table inventory-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-text" />
                <col className="col-text" />
                <col className="col-name" />
                <col className="col-list" />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Qurilma</th>
                  <th>Model</th>
                  <th>Bo‘lim</th>
                  <th>Mas’ul shaxs</th>
                  <th>Tavsif</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id || `${row.device}-${index}`}
                    className={row.id ? 'patient-row' : undefined}
                    onClick={() => {
                      if (row.id) setModal(row.id)
                    }}
                  >
                    <td>{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <ClampText value={row.device} />
                    </td>
                    <td>
                      <ClampText value={row.model} />
                    </td>
                    <td>
                      <ClampText value={cell(row.branch)} />
                    </td>
                    <td className="name-cell">
                      <ClampText value={row.responsible} />
                    </td>
                    <td>
                      <ClampText value={row.description} />
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
      {modal ? (
        <InventoryModal
          itemId={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={upsertRow}
        />
      ) : null}
    </main>
  )
}
