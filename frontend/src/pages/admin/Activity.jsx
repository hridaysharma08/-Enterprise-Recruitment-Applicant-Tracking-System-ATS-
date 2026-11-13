import { useEffect, useState } from 'react'
import api from '../../api/client'
import Loading, { EmptyState } from '../../components/Loading'
import { useToast } from '../../components/Toast'
import { errorMessage, formatDateTime } from '../../utils/format'

export default function Activity() {
  const toast = useToast()
  const [logs, setLogs] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/activity').then((r) => setLogs(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  }, [toast])

  if (!logs) return <Loading />
  const q = search.trim().toLowerCase()
  const shown = logs.filter((l) => !q || l.actorEmail.toLowerCase().includes(q) || l.action.toLowerCase().includes(q))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Activity log</h1>
          <p className="mt-1 text-sm text-slate-500">The 200 most recent actions across the system.</p>
        </div>
        <input className="input max-w-xs" placeholder="Filter by user or action…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {shown.length === 0 ? <EmptyState title="No activity" /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">When</th>
                <th className="table-th">User</th>
                <th className="table-th">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((l) => (
                <tr key={l.id}>
                  <td className="table-td whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td className="table-td whitespace-nowrap">{l.actorEmail}</td>
                  <td className="table-td">{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
