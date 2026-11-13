import { Link } from 'react-router-dom'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700">H</span> HireTrack
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Hire faster.<br />Track every candidate.</h1>
          <p className="mt-4 max-w-md text-brand-100">
            Post jobs, screen applicants, schedule interviews and follow every hiring decision from a single dashboard.
          </p>
        </div>
        <p className="text-sm text-brand-200">Enterprise Recruitment &amp; Applicant Tracking System</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
