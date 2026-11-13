import { useEffect, useState } from 'react'
import api from '../../api/client'
import Loading, { EmptyState } from '../../components/Loading'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatDate } from '../../utils/format'

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => api.get('/admin/users', { params: role ? { role } : {} })
    .then((r) => setUsers(r.data)).catch((e) => toast(errorMessage(e), 'error'))
  useEffect(() => { load() }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/active`, { active: !u.active })
      toast(u.active ? `${u.name} deactivated` : `${u.name} activated`)
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const remove = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name}? Their jobs/applications will also be removed.`)) return
    try {
      await api.delete(`/admin/users/${u.id}`)
      toast('User deleted')
      load()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const q = search.trim().toLowerCase()
  const shown = (users || []).filter((u) => !q || [u.name, u.email, u.company].some((v) => v?.toLowerCase().includes(q)))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage recruiters, candidates and administrators.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ Add user</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[['', 'All'], ['RECRUITER', 'Recruiters'], ['CANDIDATE', 'Candidates'], ['ADMIN', 'Admins']].map(([v, l]) => (
            <button key={v} onClick={() => setRole(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${role === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <input className="input max-w-xs" placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!users ? <Loading /> : shown.length === 0 ? <EmptyState title="No users found" /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Role</th>
                <th className="table-th">Company / Headline</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="table-td">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="table-td"><StatusBadge status={u.role} /></td>
                  <td className="table-td">{u.company || u.headline || '—'}</td>
                  <td className="table-td whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="table-td">
                    <span className={`text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-slate-400'}`}>{u.active ? '● Active' : '○ Inactive'}</span>
                  </td>
                  <td className="table-td">
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">
                        <button className="btn-secondary btn-sm" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn-sm btn text-red-600 hover:bg-red-50" onClick={() => remove(u)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateUser onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  )
}

function CreateUser({ onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RECRUITER', company: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/admin/users', form)
      toast('User created')
      onSaved()
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label">Role</span>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="RECRUITER">Recruiter</option>
            <option value="CANDIDATE">Candidate</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="block"><span className="label">Full name</span><input className="input" required value={form.name} onChange={set('name')} /></label>
        <label className="block"><span className="label">Email</span><input type="email" className="input" required value={form.email} onChange={set('email')} /></label>
        {form.role === 'RECRUITER' && (
          <label className="block"><span className="label">Company</span><input className="input" required value={form.company} onChange={set('company')} /></label>
        )}
        <label className="block"><span className="label">Temporary password</span>
          <input type="text" className="input" required minLength={6} value={form.password} onChange={set('password')} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  )
}
