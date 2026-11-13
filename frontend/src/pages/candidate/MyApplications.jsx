import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Loading, { EmptyState } from '../../components/Loading'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { errorMessage, formatDate } from '../../utils/format'

const STEPS = ['APPLIED', 'SHORTLISTED', 'SELECTED']

export default function MyApplications() {
  const toast = useToast()
  const [apps, setApps] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const load = () => api.get('/applications/mine').then((r) => setApps(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const withdraw = async (a) => {
    if (!window.confirm(`Withdraw your application for ${a.jobTitle}?`)) return
    try {
      await api.delete(`/applications/${a.id}`)
      toast('Application withdrawn')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!apps) return <Loading />
  const shown = filter === 'ALL' ? apps : apps.filter((a) => a.status === filter)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">My applications</h1>
          <p className="mt-1 text-sm text-slate-500">Track where each application stands.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {['ALL', 'APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${filter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {s === 'ALL' ? `All (${apps.length})` : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No applications here" message="Find a role that fits you and apply."
          action={<Link to="/" className="btn-primary">Browse jobs</Link>} />
      ) : (
        <div className="space-y-4">
          {shown.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/jobs/${a.jobId}`} className="font-semibold text-slate-900 hover:text-brand-700">{a.jobTitle}</Link>
                  <p className="text-sm text-slate-600">{a.company}{a.jobLocation && ` · ${a.jobLocation}`}</p>
                  <p className="mt-1 text-xs text-slate-400">Applied {formatDate(a.appliedAt)} · Updated {formatDate(a.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status !== 'SELECTED' && (
                    <button className="btn-secondary btn-sm" onClick={() => withdraw(a)}>Withdraw</button>
                  )}
                </div>
              </div>
              <Progress status={a.status} />
              {a.interviewCount > 0 && (
                <Link to="/interviews" className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline">
                  {a.interviewCount} interview{a.interviewCount > 1 && 's'} scheduled →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Progress({ status }) {
  const rejected = status === 'REJECTED'
  const reached = rejected ? 1 : STEPS.indexOf(status)
  return (
    <ol className="mt-4 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i <= reached
        const last = i === STEPS.length - 1
        const label = last && rejected ? 'Rejected' : step[0] + step.slice(1).toLowerCase()
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${last && rejected ? 'bg-red-500' : done ? 'bg-brand-600' : 'bg-slate-300'}`} />
            <span className={`text-xs ${done || (last && rejected) ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {!last && <span className={`h-0.5 flex-1 rounded ${i < reached ? 'bg-brand-600' : 'bg-slate-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}
