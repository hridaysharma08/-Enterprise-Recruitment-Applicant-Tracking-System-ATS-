import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import Loading, { EmptyState } from '../../components/Loading'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { errorMessage, formatDate, humanize } from '../../utils/format'
import JobFormModal from './JobFormModal'

export default function RecruiterJobs() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [jobs, setJobs] = useState(null)
  const [editing, setEditing] = useState(params.get('new') ? 'new' : null)

  const load = () => api.get('/recruiter/jobs').then((r) => setJobs(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const closeForm = () => {
    setEditing(null)
    if (params.get('new')) setParams({}, { replace: true })
  }

  const toggle = async (job) => {
    const status = job.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    try {
      await api.patch(`/jobs/${job.id}/status`, { status })
      toast(status === 'OPEN' ? 'Job reopened' : 'Job closed')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const remove = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This also removes its ${job.applicationCount} application(s) and interviews.`)) return
    try {
      await api.delete(`/jobs/${job.id}`)
      toast('Job deleted')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!jobs) return <Loading />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">My job postings</h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit and close your openings.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>+ Post a job</button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No job postings yet" message="Post your first opening to start receiving applications."
          action={<button className="btn-primary" onClick={() => setEditing('new')}>Post a job</button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Job</th>
                <th className="table-th">Type</th>
                <th className="table-th">Applicants</th>
                <th className="table-th">Deadline</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/60">
                  <td className="table-td">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-brand-700">{job.title}</Link>
                    <p className="text-xs text-slate-500">{job.location || '—'} · posted {formatDate(job.createdAt)}</p>
                  </td>
                  <td className="table-td">{humanize(job.employmentType) || '—'}</td>
                  <td className="table-td">
                    <Link to={`/recruiter/applications?job=${job.id}`} className="font-medium text-brand-600 hover:underline">
                      {job.applicationCount} applicant{job.applicationCount !== 1 && 's'}
                    </Link>
                  </td>
                  <td className="table-td">{formatDate(job.deadline)}</td>
                  <td className="table-td"><StatusBadge status={job.status} /></td>
                  <td className="table-td">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <button className="btn-secondary btn-sm" onClick={() => setEditing(job)}>Edit</button>
                      <button className="btn-secondary btn-sm" onClick={() => toggle(job)}>{job.status === 'OPEN' ? 'Close' : 'Reopen'}</button>
                      <button className="btn-sm btn text-red-600 hover:bg-red-50" onClick={() => remove(job)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <JobFormModal job={editing === 'new' ? null : editing} onClose={closeForm} onSaved={load} />}
    </div>
  )
}
