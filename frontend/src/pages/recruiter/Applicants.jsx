import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { openResume } from '../../api/client'
import InterviewForm from '../../components/InterviewForm'
import Loading, { EmptyState } from '../../components/Loading'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatDate } from '../../utils/format'

const STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED']

export default function Applicants() {
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const jobFilter = params.get('job') || ''
  const [apps, setApps] = useState(null)
  const [jobs, setJobs] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [scheduling, setScheduling] = useState(null)

  const load = () =>
    api.get('/applications', { params: jobFilter ? { jobId: jobFilter } : {} })
      .then((r) => setApps(r.data))
      .catch((e) => toast(errorMessage(e), 'error'))

  useEffect(() => { load() }, [jobFilter]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.get(user.role === 'ADMIN' ? '/admin/jobs' : '/recruiter/jobs').then((r) => setJobs(r.data)).catch(() => {})
  }, [user.role])

  const shown = useMemo(() => {
    if (!apps) return []
    const q = search.trim().toLowerCase()
    return apps.filter((a) =>
      (statusFilter === 'ALL' || a.status === statusFilter) &&
      (!q || [a.candidateName, a.candidateEmail, a.candidateSkills, a.jobTitle].some((v) => v?.toLowerCase().includes(q))))
  }, [apps, statusFilter, search])

  const counts = useMemo(() => {
    const c = { ALL: apps?.length ?? 0 }
    STATUSES.forEach((s) => { c[s] = apps?.filter((a) => a.status === s).length ?? 0 })
    return c
  }, [apps])

  const updateStatus = async (app, status, recruiterNotes) => {
    try {
      const r = await api.patch(`/applications/${app.id}/status`, { status, recruiterNotes })
      setApps((list) => list.map((a) => (a.id === app.id ? r.data : a)))
      if (selected?.id === app.id) setSelected(r.data)
      toast(app.status === status ? 'Notes saved' : `Moved to ${status.toLowerCase()} — candidate notified`)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const viewResume = (a) => openResume(a.candidateId).catch((e) => toast(errorMessage(e, 'Could not open resume'), 'error'))

  if (!apps) return <Loading />

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">{user.role === 'ADMIN' ? 'All applications' : 'Applicants'}</h1>
        <p className="mt-1 text-sm text-slate-500">Review candidates, move them through the pipeline and schedule interviews.</p>
      </div>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-[1fr_1fr]">
        <select className="input" value={jobFilter} onChange={(e) => setParams(e.target.value ? { job: e.target.value } : {})}>
          <option value="">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{user.role === 'ADMIN' && j.company ? ` — ${j.company}` : ''}</option>)}
        </select>
        <input className="input" placeholder="Search name, email, skills…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 sm:inline-flex">
        {['ALL', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()} ({counts[s]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No applicants match" message="Try a different job or status filter." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Candidate</th>
                <th className="table-th">Job</th>
                <th className="table-th">Applied</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="table-td">
                    <button onClick={() => setSelected(a)} className="text-left font-medium text-slate-900 hover:text-brand-700">{a.candidateName}</button>
                    <p className="text-xs text-slate-500">{a.candidateHeadline || a.candidateEmail}</p>
                  </td>
                  <td className="table-td">
                    {a.jobTitle}
                    {user.role === 'ADMIN' && <p className="text-xs text-slate-500">{a.company}</p>}
                  </td>
                  <td className="table-td whitespace-nowrap">{formatDate(a.appliedAt)}</td>
                  <td className="table-td">
                    <select value={a.status} onChange={(e) => updateStatus(a, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none">
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <button className="btn-secondary btn-sm" onClick={() => setSelected(a)}>View</button>
                      <button className="btn-secondary btn-sm" disabled={!a.hasResume} onClick={() => viewResume(a)}>Resume</button>
                      <button className="btn-primary btn-sm" disabled={a.status === 'REJECTED'} onClick={() => setScheduling(a)}>Interview</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ApplicantDetail app={selected} onClose={() => setSelected(null)} onStatus={updateStatus}
          onResume={() => viewResume(selected)} onSchedule={() => { setScheduling(selected); setSelected(null) }} />
      )}
      {scheduling && <InterviewForm application={scheduling} onClose={() => setScheduling(null)} onSaved={load} />}
    </div>
  )
}

function ApplicantDetail({ app, onClose, onStatus, onResume, onSchedule }) {
  const [notes, setNotes] = useState(app.recruiterNotes || '')
  return (
    <Modal title={app.candidateName} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={app.status} />
          <span className="text-sm text-slate-500">applied for <b className="text-slate-700">{app.jobTitle}</b> on {formatDate(app.appliedAt)}</span>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label="Email" value={<a className="text-brand-600 hover:underline" href={`mailto:${app.candidateEmail}`}>{app.candidateEmail}</a>} />
          <Row label="Phone" value={app.candidatePhone} />
          <Row label="Headline" value={app.candidateHeadline} />
          <Row label="Experience" value={app.candidateExperience != null ? `${app.candidateExperience} years` : null} />
          <div className="sm:col-span-2"><Row label="Skills" value={app.candidateSkills} /></div>
        </dl>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Cover letter</h3>
          <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{app.coverLetter || 'No cover letter provided.'}</p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Internal notes</h3>
          <textarea rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to recruiters" />
          <button className="btn-secondary btn-sm mt-2" onClick={() => onStatus(app, app.status, notes)}>Save notes</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary btn-sm" disabled={!app.hasResume} onClick={onResume}>View resume</button>
            <button className="btn-secondary btn-sm" disabled={app.status === 'REJECTED'} onClick={onSchedule}>Schedule interview</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {app.status !== 'SHORTLISTED' && <button className="btn-sm btn bg-amber-500 text-white hover:bg-amber-600" onClick={() => onStatus(app, 'SHORTLISTED', notes)}>Shortlist</button>}
            {app.status !== 'SELECTED' && <button className="btn-sm btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onStatus(app, 'SELECTED', notes)}>Select</button>}
            {app.status !== 'REJECTED' && <button className="btn-danger btn-sm" onClick={() => onStatus(app, 'REJECTED', notes)}>Reject</button>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || '—'}</dd>
    </div>
  )
}
