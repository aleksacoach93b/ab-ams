'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Calendar, Heart, Activity, Users, Target, Trophy, Zap } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { colorScheme, theme } = useTheme()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    console.log('Attempting login with:', { email: formData.email, password: '***' })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('Login response status:', response.status)

      const data = await response.json()
      console.log('Login response data:', data)

      if (response.ok) {
        console.log('Login successful, storing user data and redirecting...')
        
        // Use AuthContext to store user data and token
        await login(data.user, data.token)
        
        // Also set token in cookie for middleware
        document.cookie = `token=${data.token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`
        
        // Also store token in localStorage for API calls
        localStorage.setItem('token', data.token)
        
        // Redirect based on role
        console.log('User role:', data.user.role)
        
        // Use window.location for more reliable redirect
        setTimeout(() => {
          if (data.user.role === 'ADMIN') {
            console.log('Redirecting to dashboard...')
            window.location.href = '/dashboard'
          } else if (data.user.role === 'COACH') {
            console.log('Redirecting to dashboard...')
            window.location.href = '/dashboard'
          } else if (data.user.role === 'PLAYER') {
            console.log('Redirecting to player dashboard...')
            window.location.href = '/player-dashboard'
          } else if (data.user.role === 'STAFF') {
            console.log('Redirecting to dashboard...')
            window.location.href = '/dashboard'
          }
        }, 100)
      } else {
        console.log('Login failed:', data.message)
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950">
        {/* Floating Elements */}
        <div className="absolute inset-0">
          {/* Calendar Icons */}
          <div className="absolute top-20 left-10 animate-float">
            <Calendar className="h-16 w-16 text-white/20" />
          </div>
          <div className="absolute top-40 right-20 animate-float-delayed">
            <Calendar className="h-12 w-12 text-white/15" />
          </div>
          <div className="absolute bottom-40 left-20 animate-float">
            <Calendar className="h-20 w-20 text-white/10" />
          </div>
          
          {/* Heart Rate Icons */}
          <div className="absolute top-32 right-40 animate-pulse">
            <Heart className="h-14 w-14 text-red-400/30" />
          </div>
          <div className="absolute bottom-60 right-10 animate-pulse-delayed">
            <Activity className="h-18 w-18 text-green-400/25" />
          </div>
          
          {/* Soccer/Sports Icons */}
          <div className="absolute top-60 left-40 animate-bounce">
            <Target className="h-16 w-16 text-yellow-400/20" />
          </div>
          <div className="absolute bottom-20 right-40 animate-bounce-delayed">
            <Trophy className="h-14 w-14 text-orange-400/25" />
          </div>
          <div className="absolute top-80 right-60 animate-float">
            <Zap className="h-12 w-12 text-blue-400/20" />
          </div>
          
          {/* Team Icons */}
          <div className="absolute bottom-80 left-60 animate-float-delayed">
            <Users className="h-16 w-16 text-purple-400/20" />
          </div>
          <div className="absolute top-40 left-60 animate-float">
            <Users className="h-10 w-10 text-pink-400/25" />
          </div>
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-full mb-4 animate-pulse">
              <span className="text-3xl font-bold text-white">AB</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">
              Athlete Management System
            </h1>
            <p className="text-xl text-white/80 drop-shadow-md">
              Sign in to your account
            </p>
          </div>

          {/* Login Form */}
          <div className="backdrop-blur-md bg-white/10 rounded-2xl shadow-2xl p-8 border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg text-sm bg-red-500/20 text-red-200 border border-red-500/30 backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/90">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 absolute left-3 top-3 text-white/60" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all duration-300"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-white/90">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 absolute left-3 top-3 text-white/60" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all duration-300"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 p-1 rounded text-white/60 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium transition-all duration-300 disabled:opacity-50 hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Setup Link */}
            <div className="mt-6 text-center">
              <a 
                href="/setup"
                className="text-sm text-white/80 hover:text-white transition-colors duration-300 underline decoration-white/40 hover:decoration-white/80"
              >
                First time? Setup authentication system
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-white/60 drop-shadow-md">
              Professional Athlete Management Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
