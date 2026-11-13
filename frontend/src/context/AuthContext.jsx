import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  useEffect(() => {
    if (!tokenStore.get()) return
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const handleAuth = (data) => {
    tokenStore.set(data.token)
    setUser(data.user)
    return data.user
  }

  const login = async (email, password) => handleAuth((await api.post('/auth/login', { email, password })).data)
  const register = async (payload) => handleAuth((await api.post('/auth/register', payload)).data)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
