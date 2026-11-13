import { useEffect, useState } from 'react'
import api from '../api/client'
import InterviewForm from '../components/InterviewForm'
import Loading, { EmptyState } from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { errorMessage, formatDateTime, humanize } from '../utils/format'

export default function Interviews() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const canManage = user.role !== 'CANDIDATE'

  const load = () => api.get('/interviews').then((r) => setItems(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (i) => {
    if (!window.confirm('Delete this interview?')) return
    try {
      await api.delete(`/interviews/${i.id}`)
      toast('Interview deleted')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  if (!items) return <Loading />
  const now = new Date()
  const upcoming = items.filter((i) => i.status === 'SCHEDULED' && new Date(i.scheduledAt) >= now)
  const past = items.filter((i) => !upcoming.includes(i)).reverse()
  const shown = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? 'Schedule interviews from the Applicants page; manage them here.' : 'Your scheduled interviews and their details.'}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[['upcoming', `Upcoming (${upcoming.length})`], ['past', `Past & other (${past.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={tab === 'upcoming' ? 'No upcoming interviews' : 'Nothing here yet'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((i) => {
            const d = new Date(i.scheduledAt)
            return (
              <div key={i.id} className="card flex gap-4 p-5">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <span className="text-xs font-semibold uppercase">{d.toLocaleString(undefined, { month: 'short' })}</span>
                  <span className="text-2xl font-bold leading-none">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{canManage ? i.candidateName : i.jobTitle}</p>
                      <p className="truncate text-sm text-slate-600">{canManage ? i.jobTitle : i.company}</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>🕒 {formatDateTime(i.scheduledAt)} · {i.durationMinutes} min</p>
                    <p>📍 {humanize(i.mode)}{i.locationOrLink && ': '}
                      {i.locationOrLink && (/^https?:\/\//.test(i.locationOrLink)
                        ? <a href={i.locationOrLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{i.locationOrLink}</a>
                        : i.locationOrLink)}
                    </p>
                    {i.interviewer && <p>👤 {i.interviewer}</p>}
                    {i.notes && <p className="text-slate-500">📝 {i.notes}</p>}
                    {canManage && i.feedback && <p className="rounded bg-slate-50 px-2 py-1 text-slate-700">Feedback: {i.feedback}</p>}
                  </dl>
                  {canManage && (
                    <div className="mt-4 flex gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => setEditing(i)}>Edit / feedback</button>
                      <button className="btn-sm btn text-red-600 hover:bg-red-50" onClick={() => remove(i)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <InterviewForm interview={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}
