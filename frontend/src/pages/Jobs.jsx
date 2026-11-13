import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Loading, { EmptyState } from '../components/Loading'
import { EMPLOYMENT_TYPES, errorMessage, humanize, timeAgo } from '../utils/format'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [filters, setFilters] = useState({ q: '', location: '', type: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = (f = filters) => {
    setLoading(true)
    api.get('/jobs', { params: f })
      .then((r) => { setJobs(r.data); setError('') })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => { e.preventDefault(); load() }
  const reset = () => { const f = { q: '', location: '', type: '' }; setFilters(f); load(f) }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Find your next role</h1>
        <p className="mt-1 text-sm text-slate-500">Browse open positions and apply in a couple of clicks.</p>
      </div>

      <form onSubmit={submit} className="card mb-6 grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input className="input" placeholder="Job title, skill or company" value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input className="input" placeholder="Location" value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
        <select className="input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All job types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Search</button>
          <button type="button" className="btn-secondary" onClick={reset}>Reset</button>
        </div>
      </form>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <Loading /> : jobs.length === 0 ? (
        <EmptyState title="No jobs found" message="Try a different keyword or clear the filters." />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{jobs.length} open position{jobs.length !== 1 && 's'}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </>
      )}
    </div>
  )
}

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card group block p-5 transition hover:border-brand-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{job.title}</h3>
          <p className="text-sm text-slate-600">{job.company}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{timeAgo(job.createdAt)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {job.location && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">📍 {job.location}</span>}
        {job.employmentType && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{humanize(job.employmentType)}</span>}
        {job.salaryRange && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">💰 {job.salaryRange}</span>}
        {job.minExperience != null && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{job.minExperience}+ yrs</span>}
      </div>
      {job.skills && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.split(',').slice(0, 5).map((s) => (
            <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{s.trim()}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
