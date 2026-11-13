import { useState } from 'react'
import api from '../api/client'
import { errorMessage, toLocalInput } from '../utils/format'
import Modal from './Modal'
import { useToast } from './Toast'

const MODES = [['ONLINE', 'Online (video call)'], ['IN_PERSON', 'In person'], ['PHONE', 'Phone']]

/**
 * Schedule a new interview (pass `application`) or edit an existing one (pass `interview`).
 */
export default function InterviewForm({ application, interview, onClose, onSaved }) {
  const toast = useToast()
  const editing = Boolean(interview)
  const [form, setForm] = useState({
    scheduledAt: toLocalInput(interview?.scheduledAt),
    durationMinutes: interview?.durationMinutes ?? 60,
    mode: interview?.mode ?? 'ONLINE',
    locationOrLink: interview?.locationOrLink ?? '',
    interviewer: interview?.interviewer ?? '',
    notes: interview?.notes ?? '',
    status: interview?.status ?? 'SCHEDULED',
    feedback: interview?.feedback ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const body = { ...form, durationMinutes: Number(form.durationMinutes), scheduledAt: form.scheduledAt + ':00' }
    try {
      const res = editing
        ? await api.put(`/interviews/${interview.id}`, body)
        : await api.post('/interviews', { ...body, applicationId: application.id })
      toast(editing ? 'Interview updated' : 'Interview scheduled — the candidate has been notified')
      onSaved?.(res.data)
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const who = application ? `${application.candidateName} · ${application.jobTitle}` : `${interview.candidateName} · ${interview.jobTitle}`
  const placeholder = { ONLINE: 'Meeting link', IN_PERSON: 'Office address', PHONE: 'Phone number' }[form.mode]

  return (
    <Modal title={editing ? 'Edit interview' : 'Schedule interview'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{who}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Date &amp; time</span>
            <input type="datetime-local" className="input" required value={form.scheduledAt} onChange={set('scheduledAt')} />
          </label>
          <label className="block">
            <span className="label">Duration (minutes)</span>
            <input type="number" min="10" max="480" step="5" className="input" required value={form.durationMinutes} onChange={set('durationMinutes')} />
          </label>
          <label className="block">
            <span className="label">Mode</span>
            <select className="input" value={form.mode} onChange={set('mode')}>
              {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Interviewer</span>
            <input className="input" value={form.interviewer} onChange={set('interviewer')} />
          </label>
        </div>
        <label className="block">
          <span className="label">{placeholder}</span>
          <input className="input" value={form.locationOrLink} onChange={set('locationOrLink')} />
        </label>
        <label className="block">
          <span className="label">Notes for the candidate</span>
          <textarea rows={2} className="input" value={form.notes} onChange={set('notes')} />
        </label>
        {editing && (
          <>
            <label className="block">
              <span className="label">Status</span>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Feedback <span className="font-normal text-slate-400">(internal)</span></span>
              <textarea rows={3} className="input" value={form.feedback} onChange={set('feedback')} />
            </label>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Schedule'}</button>
        </div>
      </form>
    </Modal>
  )
}
