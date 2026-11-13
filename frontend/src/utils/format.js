export function errorMessage(err, fallback = 'Something went wrong') {
  if (err?.response?.data instanceof Blob) return fallback
  return err?.response?.data?.message || (err?.request && !err?.response ? 'Cannot reach the server. Is the backend running?' : null) || err?.message || fallback
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function timeAgo(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(value)
}

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']

export function humanize(value) {
  if (!value) return ''
  return value.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

/** Value for <input type="datetime-local"> from a LocalDateTime string. */
export function toLocalInput(value) {
  if (!value) return ''
  return value.slice(0, 16)
}
