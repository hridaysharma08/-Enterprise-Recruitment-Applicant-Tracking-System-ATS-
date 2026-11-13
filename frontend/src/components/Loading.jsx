export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
}

export default function Loading() {
  return <div className="flex justify-center py-16"><Spinner /></div>
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">📭</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
