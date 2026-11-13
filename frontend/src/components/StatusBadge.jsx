const STYLES = {
  APPLIED: 'bg-blue-50 text-blue-700 ring-blue-200',
  SHORTLISTED: 'bg-amber-50 text-amber-700 ring-amber-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  SELECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ADMIN: 'bg-purple-50 text-purple-700 ring-purple-200',
  RECRUITER: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CANDIDATE: 'bg-teal-50 text-teal-700 ring-teal-200',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {status ? status[0] + status.slice(1).toLowerCase().replace('_', ' ') : ''}
    </span>
  )
}
