import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { errorMessage, formatDate, humanize } from '../utils/format'

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [myApplication, setMyApplication] = useState(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/jobs/${id}`).then((r) => setJob(r.data)).catch((e) => setError(errorMessage(e)))
    if (user?.role === 'CANDIDATE') {
      api.get('/applications/mine')
        .then((r) => setMyApplication(r.data.find((a) => a.jobId === Number(id)) || null))
        .catch(() => {})
    }
  }, [id, user])

  const apply = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.post('/applications', { jobId: Number(id), coverLetter })
      setMyApplication(r.data)
      setApplyOpen(false)
      toast('Application submitted!')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  if (!job) return <Loading />

  const deadlinePassed = job.deadline && new Date(job.deadline + 'T23:59:59') < new Date()
  const canApply = job.status === 'OPEN' && !deadlinePassed

  const applyButton = () => {
    if (!user) return <button className="btn-primary" onClick={() => navigate('/login', { state: { from: `/jobs/${id}` } })}>Log in to apply</button>
    if (user.role !== 'CANDIDATE') return null
    if (myApplication) return <div className="flex items-center gap-2 text-sm text-slate-600">Applied · <StatusBadge status={myApplication.status} /></div>
    if (!canApply) return <span className="text-sm text-slate-500">Applications closed</span>
    if (!user.hasResume) return <Link to="/profile" className="btn-primary">Upload resume to apply</Link>
    return <button className="btn-primary" onClick={() => setApplyOpen(true)}>Apply now</button>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-slate-500 hover:text-slate-800">← Back</button>
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
              {job.status === 'CLOSED' && <StatusBadge status="CLOSED" />}
            </div>
            <p className="mt-1 text-slate-600">{job.company} · posted by {job.recruiterName}</p>
          </div>
          {applyButton()}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-5 text-sm sm:grid-cols-4">
          <Info label="Location" value={job.location} />
          <Info label="Job type" value={humanize(job.employmentType)} />
          <Info label="Salary" value={job.salaryRange} />
          <Info label="Experience" value={job.minExperience != null ? `${job.minExperience}+ years` : null} />
          <Info label="Apply by" value={job.deadline ? formatDate(job.deadline) : 'Open'} />
          <Info label="Posted" value={formatDate(job.createdAt)} />
        </dl>
        {job.skills && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.split(',').map((s) => (
                <span key={s} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{s.trim()}</span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">About the role</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
        </div>
      </div>

      {applyOpen && (
        <Modal title={`Apply for ${job.title}`} onClose={() => setApplyOpen(false)}>
          <form onSubmit={apply} className="space-y-4">
            <p className="text-sm text-slate-600">
              Your profile and resume (<span className="font-medium">{user.resumeOriginalName}</span>) will be shared with {job.company}.
            </p>
            <div>
              <label className="label" htmlFor="cover">Cover letter <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea id="cover" rows={6} className="input" maxLength={5000} value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you a great fit for this role?" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setApplyOpen(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value || '—'}</dd>
    </div>
  )
}
