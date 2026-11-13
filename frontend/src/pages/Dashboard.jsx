import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api/client'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { errorMessage, formatDate, humanize } from '../utils/format'

const STATUS_COLORS = { APPLIED: '#3b82f6', SHORTLISTED: '#f59e0b', REJECTED: '#ef4444', SELECTED: '#10b981' }

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)))
  }, [])

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  if (!stats) return <Loading />

  const statusData = Object.entries(stats.byStatus || {}).map(([status, count]) => ({ status, name: humanize(status), count }))
  const tiles = {
    ADMIN: [
      ['Total users', stats.totalUsers, `${stats.recruiters} recruiters · ${stats.candidates} candidates`],
      ['Job postings', stats.totalJobs, `${stats.openJobs} open`],
      ['Applications', stats.totalApplications, `${stats.byStatus?.SELECTED ?? 0} selected`],
      ['Upcoming interviews', stats.upcomingInterviews, 'scheduled'],
    ],
    RECRUITER: [
      ['My job postings', stats.totalJobs, `${stats.openJobs} open`],
      ['Applications received', stats.totalApplications, `${stats.byStatus?.APPLIED ?? 0} awaiting review`],
      ['Shortlisted', stats.byStatus?.SHORTLISTED ?? 0, 'candidates'],
      ['Upcoming interviews', stats.upcomingInterviews, 'scheduled'],
    ],
    CANDIDATE: [
      ['Applications', stats.totalApplications, 'submitted'],
      ['Shortlisted', stats.byStatus?.SHORTLISTED ?? 0, 'in progress'],
      ['Upcoming interviews', stats.upcomingInterviews, 'scheduled'],
      ['Open jobs', stats.openJobs, 'available to apply'],
    ],
  }[user.role]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Hello, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening with {user.role === 'CANDIDATE' ? 'your job search' : 'recruitment'}.</p>
        </div>
        {user.role === 'RECRUITER' && <Link to="/recruiter/jobs?new=1" className="btn-primary">+ Post a job</Link>}
        {user.role === 'CANDIDATE' && <Link to="/" className="btn-primary">Browse jobs</Link>}
      </div>

      {user.role === 'CANDIDATE' && !user.hasResume && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <span>Upload your resume to start applying for jobs.</span>
          <Link to="/profile" className="btn-sm btn bg-amber-600 text-white hover:bg-amber-700">Upload resume</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{value ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Application pipeline">
          {statusData.every((d) => d.count === 0) ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData.filter((d) => d.count > 0)} dataKey="count" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {statusData.filter((d) => d.count > 0).map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {statusData.map((d) => (
              <span key={d.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.status] }} />
                {d.name} <span className="font-semibold text-slate-900">{d.count}</span>
              </span>
            ))}
          </div>
        </ChartCard>

        {stats.monthly ? (
          <ChartCard title="Applications over the last 6 months">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={stats.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="applications" name="Applications" fill="#2550eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <RecentList items={stats.recent} candidate />
        )}
      </div>

      {stats.perJob && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Applications per job">
            {stats.perJob.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height={Math.max(180, stats.perJob.length * 40)}>
                <BarChart data={stats.perJob} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="job" width={170} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="applications" name="Applications" fill="#2550eb" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          {stats.recent ? <RecentList items={stats.recent} /> : <AdminShortcuts />}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  )
}

function NoData() {
  return <p className="py-16 text-center text-sm text-slate-400">No applications yet</p>
}

function RecentList({ items = [], candidate = false }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Recent applications</h2>
        <Link to={candidate ? '/applications' : '/recruiter/applications'} className="text-xs font-medium text-brand-600 hover:underline">View all</Link>
      </div>
      {items.length === 0 ? <NoData /> : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{candidate ? a.jobTitle : a.candidateName}</p>
                <p className="truncate text-xs text-slate-500">{candidate ? a.company : a.jobTitle} · {formatDate(a.appliedAt)}</p>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdminShortcuts() {
  const links = [
    ['/admin/users', 'Manage users', 'Add recruiters, activate or deactivate accounts'],
    ['/admin/jobs', 'Review job postings', 'See and moderate every job on the platform'],
    ['/recruiter/applications', 'All applications', 'Track every candidate across companies'],
    ['/admin/activity', 'Activity log', 'Audit trail of system actions'],
  ]
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(([to, title, sub]) => (
          <Link key={to} to={to} className="rounded-lg border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
