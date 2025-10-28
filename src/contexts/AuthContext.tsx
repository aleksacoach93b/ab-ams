'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  role: 'ADMIN' | 'COACH' | 'PLAYER' | 'STAFF'
  firstName: string
  lastName: string
  avatar?: string
  isActive: boolean
  player?: any
  coach?: any
  staff?: any
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth data on mount
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (userData: User, authToken: string) => {
    console.log('AuthContext login called with:', { userData, authToken })
    
    // If user is staff, fetch their permissions
    if (userData.role === 'STAFF') {
      try {
        const response = await fetch('/api/staff')
        if (response.ok) {
          const staffData = await response.json()
          const currentStaff = staffData.find((staff: any) => staff.user?.id === userData.id)
          if (currentStaff) {
            // Add staff permissions to user data
            userData.staff = currentStaff
          }
        }
      } catch (error) {
        console.error('Error fetching staff permissions:', error)
      }
    }
    
    console.log('Setting user and token in AuthContext:', { userData, authToken })
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    console.log('AuthContext login completed')
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    // Remove cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  }

  const isAuthenticated = !!user && !!token

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
