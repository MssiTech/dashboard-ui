import { useEffect, useState } from 'react'
import { BASE_URL, apiFetch } from '../../api/index.js'
import EmployeeModal from '../../components/EmployeeModal'
import PageStatus from '../../components/PageStatus'
import Pager from '../../components/Pager'
import { planField } from '../../lib/monthPlan'
import { PAGE_LIMIT } from '../../lib/pagination'
import { usePageTitle } from '../../lib/pageTitle'

const API_URL = `${BASE_URL}/api/monitoring/employees/`

function cell(value) {
  const text = String(value ?? '').trim()
  return text || 'Mavjud emas'
}

function bidNumber(value) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n.toFixed(2) : '—'
}

function clinicType(value) {
  if (value == null) return 'Mavjud emas'
  return value ? 'Poliklinika' : 'Stasionar'
}

function branchName(branch) {
  if (branch && typeof branch === 'object') return cell(branch.name)
  return cell(branch)
}

export default function EmployeesPage() {
  usePageTitle('Shifokorlar')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [polyclinic, setPolyclinic] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [query, polyclinic])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
    })
    if (query) params.set('full_name', query)
    if (polyclinic) params.set('polyclinic', polyclinic)
    setStatus('loading')
    apiFetch(`${API_URL}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('request failed')
        const data = await response.json()
        if (controller.signal.aborted) return
        if (Array.isArray(data)) {
          const start = (page - 1) * PAGE_LIMIT
          setRows(data.slice(start, start + PAGE_LIMIT))
          setTotal(data.length)
        } else {
          setRows(Array.isArray(data.results) ? data.results : [])
          setTotal(typeof data.count === 'number' ? data.count : 0)
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
  }, [page, query, polyclinic])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  const currentPage = Math.min(page, pageCount)

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Shifokorlar</h1>
        </div>
        {status === 'ready' ? (
          <p className="detail-meta">
            <span>{total} shifokor</span>
          </p>
        ) : null}
      </header>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <div className="filters-fields period">
          <label>
            Shifokor
            <input
              type="search"
              name="full_name"
              value={search}
              placeholder="Familiya, ism, otasining ismi"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Turi
            <select
              name="polyclinic"
              value={polyclinic}
              onChange={(event) => setPolyclinic(event.target.value)}
            >
              <option value="">Barchasi</option>
              <option value="true">Poliklinika</option>
              <option value="false">Stasionar</option>
            </select>
          </label>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setSearch('')
              setQuery('')
              setPolyclinic('')
              setPage(1)
            }}
          >
            Tozalash
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Ro‘yxat</h2>
        </div>
        <PageStatus
          status={status}
          empty={rows.length === 0 ? 'Shifokor topilmadi.' : ''}
        />
        {status === 'ready' && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="patient-table plan-table staff-table">
              <colgroup>
                <col className="col-idx" />
                <col className="col-name" />
                <col className="col-branch" />
                <col className="col-type" />
                <col className="col-bid" />
              </colgroup>
              <thead>
                <tr>
                  <th className="idx-head">№</th>
                  <th className="name-head">Shifokor</th>
                  <th className="name-head">Bo‘lim</th>
                  <th className="name-head">Turi</th>
                  <th className="num-head">Stavka</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id || `${row.full_name}-${index}`}
                    className={row.id ? 'patient-row' : undefined}
                    onClick={() => {
                      if (row.id) setSelectedId(row.id)
                    }}
                  >
                    <td className="num">{(currentPage - 1) * PAGE_LIMIT + index + 1}</td>
                    <td className="name-cell">
                      <strong>{cell(row.full_name)}</strong>
                    </td>
                    <td className="name-cell">{branchName(row.branch)}</td>
                    <td>
                      {row.polyclinic == null ? (
                        clinicType(row.polyclinic)
                      ) : (
                        <span className={row.polyclinic ? 'type-pill type-poly' : 'type-pill type-stat'}>
                          {clinicType(row.polyclinic)}
                        </span>
                      )}
                    </td>
                    <td className="num bid-cell">{bidNumber(planField(row, 'bid'))}</td>
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
      {selectedId ? (
        <EmployeeModal
          employeeId={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={(updated) => {
            setRows((current) =>
              current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
            )
          }}
        />
      ) : null}
    </main>
  )
}
