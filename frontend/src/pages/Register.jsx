import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/format'
import AuthShell from './AuthShell'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CANDIDATE', company: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const u = await register(form)
      navigate(u.role === 'CANDIDATE' ? '/profile?welcome=1' : '/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join as a job seeker or as a recruiter">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {[['CANDIDATE', 'I want a job'], ['RECRUITER', 'I want to hire']].map(([role, label]) => (
            <button type="button" key={role} onClick={() => setForm({ ...form, role })}
              className={`rounded-md py-2 text-sm font-medium transition ${form.role === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" required value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
        {form.role === 'RECRUITER' && (
          <div>
            <label className="label" htmlFor="company">Company</label>
            <input id="company" className="input" required value={form.company} onChange={set('company')} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="phone">Phone <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="phone" className="input" value={form.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" required minLength={6} autoComplete="new-password"
            value={form.password} onChange={set('password')} />
          <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
