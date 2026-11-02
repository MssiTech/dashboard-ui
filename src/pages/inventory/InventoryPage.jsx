import PageStatus from '../../components/PageStatus'
import { usePageTitle } from '../../lib/pageTitle'

export default function InventoryPage() {
  usePageTitle('Inventarizatsiya')

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Inventarizatsiya</h1>
        </div>
      </header>
      <section className="panel">
        <div className="panel-head">
          <h2>Ro‘yxat</h2>
        </div>
        <PageStatus status="ready" empty="Inventar topilmadi." />
      </section>
    </main>
  )
}
