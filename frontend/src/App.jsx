import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Dashboard from './pages/Dashboard'
import Interviews from './pages/Interviews'
import Profile from './pages/Profile'
import MyApplications from './pages/candidate/MyApplications'
import RecruiterJobs from './pages/recruiter/RecruiterJobs'
import Applicants from './pages/recruiter/Applicants'
import Users from './pages/admin/Users'
import AdminJobs from './pages/admin/AdminJobs'
import Activity from './pages/admin/Activity'

const any = ['ADMIN', 'RECRUITER', 'CANDIDATE']

export default function App() {
  const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/dashboard" element={guard(any, <Dashboard />)} />
        <Route path="/interviews" element={guard(any, <Interviews />)} />
        <Route path="/profile" element={guard(any, <Profile />)} />
        <Route path="/applications" element={guard(['CANDIDATE'], <MyApplications />)} />
        <Route path="/recruiter/jobs" element={guard(['RECRUITER'], <RecruiterJobs />)} />
        <Route path="/recruiter/applications" element={guard(['RECRUITER', 'ADMIN'], <Applicants />)} />
        <Route path="/admin/users" element={guard(['ADMIN'], <Users />)} />
        <Route path="/admin/jobs" element={guard(['ADMIN'], <AdminJobs />)} />
        <Route path="/admin/activity" element={guard(['ADMIN'], <Activity />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
