import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Loading, { EmptyState } from '../../components/Loading'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { errorMessage, formatDate, humanize } from '../../utils/format'

export default function AdminJobs() {
  const toast = useToast()
  const [jobs, setJobs] = useState(null)
  const [search, setSearch] = useState('')

  const load = () => api.get('/admin/jobs').then((r) => setJobs(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (job) => {
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN' })
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const remove = async (job) => {
    if (!window.confirm(`Delete "${job.title}" and all of its applications?`)) return
    try {
      await api.delete(`/jobs/${job.id}`)
      toast('Job deleted')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!jobs) return <Loading />
  const q = search.trim().toLowerCase()
  const shown = jobs.filter((j) => !q || [j.title, j.company, j.recruiterName, j.location].some((v) => v?.toLowerCase().includes(q)))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">All job postings</h1>
          <p className="mt-1 text-sm text-slate-500">{jobs.length} postings across all recruiters.</p>
        </div>
        <input className="input max-w-xs" placeholder="Search jobs, companies…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {shown.length === 0 ? <EmptyState title="No jobs found" /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Job</th>
                <th className="table-th">Company</th>
                <th className="table-th">Type</th>
                <th className="table-th">Applicants</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/60">
                  <td className="table-td">
                    <Link to={`/jobs/${j.id}`} className="font-medium text-slate-900 hover:text-brand-700">{j.title}</Link>
                    <p className="text-xs text-slate-500">{j.location || '—'} · {formatDate(j.createdAt)}</p>
                  </td>
                  <td className="table-td">{j.company}<p className="text-xs text-slate-500">{j.recruiterName}</p></td>
                  <td className="table-td">{humanize(j.employmentType) || '—'}</td>
                  <td className="table-td">
                    <Link to={`/recruiter/applications?job=${j.id}`} className="text-brand-600 hover:underline">{j.applicationCount}</Link>
                  </td>
                  <td className="table-td"><StatusBadge status={j.status} /></td>
                  <td className="table-td">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <button className="btn-secondary btn-sm" onClick={() => toggle(j)}>{j.status === 'OPEN' ? 'Close' : 'Reopen'}</button>
                      <button className="btn-sm btn text-red-600 hover:bg-red-50" onClick={() => remove(j)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
