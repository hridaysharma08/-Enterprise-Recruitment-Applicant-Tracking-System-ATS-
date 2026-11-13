import axios from 'axios'

// Dev: separate Vite server talks to Spring Boot on :8080. Production: React is served by Spring Boot, same origin.
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')
const TOKEN_KEY = 'ats_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Expired / invalid session: drop the token and send the user to login.
    if (err.response?.status === 401 && tokenStore.get() && !err.config.url.includes('/auth/login')) {
      tokenStore.clear()
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  },
)

/** Fetches a candidate's resume with auth and opens it in a new tab. */
export async function openResume(candidateId) {
  const win = window.open('', '_blank')
  try {
    const res = await api.get(`/profile/resume/${candidateId}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    if (win) win.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    win?.close()
    throw e
  }
}

export default api
