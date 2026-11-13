import { useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { EMPLOYMENT_TYPES, errorMessage, humanize } from '../../utils/format'

export default function JobFormModal({ job, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    title: job?.title ?? '', description: job?.description ?? '', location: job?.location ?? '',
    employmentType: job?.employmentType ?? 'FULL_TIME', salaryRange: job?.salaryRange ?? '', skills: job?.skills ?? '',
    minExperience: job?.minExperience ?? '', deadline: job?.deadline ?? '', status: job?.status ?? 'OPEN',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const body = {
      ...form,
      minExperience: form.minExperience === '' ? null : Number(form.minExperience),
      deadline: form.deadline || null,
    }
    try {
      const res = job ? await api.put(`/jobs/${job.id}`, body) : await api.post('/jobs', body)
      toast(job ? 'Job updated' : 'Job posted')
      onSaved(res.data)
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={job ? 'Edit job posting' : 'Post a new job'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Job title *</span>
          <input className="input" required maxLength={150} value={form.title} onChange={set('title')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Location</span>
            <input className="input" value={form.location} onChange={set('location')} />
          </label>
          <label className="block">
            <span className="label">Job type</span>
            <select className="input" value={form.employmentType} onChange={set('employmentType')}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Salary range</span>
            <input className="input" placeholder="e.g. 8 - 12 LPA" value={form.salaryRange} onChange={set('salaryRange')} />
          </label>
          <label className="block">
            <span className="label">Min. experience (years)</span>
            <input type="number" min="0" max="50" className="input" value={form.minExperience} onChange={set('minExperience')} />
          </label>
          <label className="block">
            <span className="label">Application deadline</span>
            <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
          </label>
          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="label">Required skills (comma separated)</span>
          <input className="input" placeholder="Java, Spring Boot, MySQL" value={form.skills} onChange={set('skills')} />
        </label>
        <label className="block">
          <span className="label">Description *</span>
          <textarea rows={8} className="input" required value={form.description} onChange={set('description')}
            placeholder="Responsibilities, requirements, benefits…" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : job ? 'Save changes' : 'Post job'}</button>
        </div>
      </form>
    </Modal>
  )
}
