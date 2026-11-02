import PageStatus from '../../components/PageStatus'
import { usePageTitle } from '../../lib/pageTitle'

export default function AppealsPage() {
  usePageTitle('Murojatlar')

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Murojatlar</h1>
        </div>
      </header>
      <section className="panel">
        <div className="panel-head">
          <h2>Ro‘yxat</h2>
        </div>
        <PageStatus status="ready" empty="Murojat topilmadi." />
      </section>
    </main>
  )
}
