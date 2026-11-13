import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { openResume } from '../api/client'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/format'

export default function Profile() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    name: user.name || '', phone: user.phone || '', company: user.company || '', headline: user.headline || '',
    skills: user.skills || '', experienceYears: user.experienceYears ?? '', location: user.location || '',
  })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [busy, setBusy] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const isCandidate = user.role === 'CANDIDATE'

  const save = async (e) => {
    e.preventDefault()
    setBusy('profile')
    try {
      const payload = { ...form, experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears) }
      setUser((await api.put('/profile', payload)).data)
      toast('Profile saved')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy('')
    }
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('File is too large (max 5 MB)', 'error'); return }
    const data = new FormData()
    data.append('file', file)
    setBusy('resume')
    try {
      setUser((await api.post('/profile/resume', data)).data)
      toast('Resume uploaded')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy('')
      e.target.value = ''
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setBusy('password')
    try {
      await api.put('/profile/password', pw)
      setPw({ currentPassword: '', newPassword: '' })
      toast('Password updated')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy('')
    }
  }

  const viewResume = () => openResume(user.id).catch((e) => toast(errorMessage(e, 'Could not open resume'), 'error'))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">{isCandidate ? 'Profile & Resume' : 'Profile'}</h1>
        {params.get('welcome') && (
          <p className="mt-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Welcome to HireTrack! Complete your profile and upload your resume so you can start applying.
          </p>
        )}
      </div>

      {isCandidate && (
        <section className="card p-6">
          <h2 className="font-semibold text-slate-900">Resume</h2>
          <p className="mt-1 text-sm text-slate-500">PDF, DOC or DOCX, up to 5 MB. Recruiters see it when you apply.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
            <span className="text-2xl">📄</span>
            <div className="min-w-0 flex-1">
              {user.hasResume
                ? <p className="truncate text-sm font-medium text-slate-900">{user.resumeOriginalName}</p>
                : <p className="text-sm text-slate-500">No resume uploaded yet</p>}
            </div>
            {user.hasResume && <button className="btn-secondary btn-sm" onClick={viewResume}>View</button>}
            <button className="btn-primary btn-sm" disabled={busy === 'resume'} onClick={() => fileRef.current?.click()}>
              {busy === 'resume' ? 'Uploading…' : user.hasResume ? 'Replace' : 'Upload resume'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={upload} />
          </div>
        </section>
      )}

      <form onSubmit={save} className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
          <Field label="Email"><input className="input bg-slate-50" value={user.email} disabled /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={set('location')} /></Field>
          {user.role === 'RECRUITER' && (
            <Field label="Company"><input className="input" required value={form.company} onChange={set('company')} /></Field>
          )}
          {isCandidate && (
            <>
              <Field label="Headline"><input className="input" placeholder="e.g. Java Developer" value={form.headline} onChange={set('headline')} /></Field>
              <Field label="Years of experience">
                <input type="number" min="0" max="60" className="input" value={form.experienceYears} onChange={set('experienceYears')} />
              </Field>
            </>
          )}
        </div>
        {isCandidate && (
          <Field label="Skills (comma separated)">
            <textarea rows={2} className="input" placeholder="Java, Spring Boot, React, SQL" value={form.skills} onChange={set('skills')} />
          </Field>
        )}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <input type="password" className="input" required autoComplete="current-password" value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password">
            <input type="password" className="input" required minLength={6} autoComplete="new-password" value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button className="btn-secondary" disabled={busy === 'password'}>Update password</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}
