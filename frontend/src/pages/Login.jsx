import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/format'
import AuthShell from './AuthShell'

const DEMO = [
  ['Admin', 'admin@ats.com', 'admin123'],
  ['Recruiter', 'recruiter@ats.com', 'recruiter123'],
  ['Candidate', 'candidate@ats.com', 'candidate123'],
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please log in again.' : '')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your HireTrack account">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
        <div className="flex flex-wrap gap-2">
          {DEMO.map(([label, email, password]) => (
            <button key={email} type="button" className="btn-secondary btn-sm" onClick={() => setForm({ email, password })}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
