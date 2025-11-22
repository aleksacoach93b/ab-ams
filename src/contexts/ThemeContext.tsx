'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'red'
export type ColorScheme = {
  primary: string
  primaryHover: string
  primaryLight: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

const colorSchemes: Record<Theme, ColorScheme> = {
  light: {
    primary: '#2563EB', // Jača, življa plava
    primaryHover: '#1D4ED8', // Tamnija za hover
    primaryLight: '#DBEAFE',
    secondary: '#475569',
    background: '#F5F5F5', // Svetlo siva (skoro bela) pozadina
    surface: '#FFFFFF', // Bela za kartice
    text: '#0F172A', // Tamniji tekst za bolji kontrast
    textSecondary: '#475569',
    border: '#E5E7EB', // Svetlija granica
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
  },
  dark: {
    primary: '#1E3A8A',
    primaryHover: '#1E40AF',
    primaryLight: '#1E40AF',
    secondary: '#9CA3AF',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    border: '#334155',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  blue: {
    primary: '#05E6E2', // Cijan/nebo plava
    primaryHover: '#06B6D4', // Tamnija za hover
    primaryLight: '#E0F2FE', // Svetlija plava za akcente
    secondary: '#475569',
    background: '#EFF6FF', // Suptilna plava pozadina
    surface: '#FFFFFF',
    text: '#0C1226', // Tamniji tekst za bolji kontrast
    textSecondary: '#475569',
    border: '#BFDBFE', // Plava granica koja se uklapa
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#05E6E2',
  },
  green: {
    primary: '#10B981', // Svetlija, lepša zelena
    primaryHover: '#059669', // Tamnija za hover
    primaryLight: '#D1FAE5', // Svjetlija zelena za akcente
    secondary: '#475569',
    background: '#ECFDF5', // Svetla zelena pozadina (suptilna)
    surface: '#FFFFFF',
    text: '#022C22', // Tamniji tekst za bolji kontrast
    textSecondary: '#374151',
    border: '#A7F3D0', // Zelena granica koja se uklapa
    success: '#10B981',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0891B2',
  },
  purple: {
    primary: '#8B5CF6', // Življa, modernija ljubičasta
    primaryHover: '#7C3AED', // Tamnija za hover
    primaryLight: '#F3E8FF', // Svjetlija ljubičasta za akcente
    secondary: '#A78BFA',
    background: '#FAF5FF', // Suptilna ljubičasta pozadina
    surface: '#FFFFFF',
    text: '#4C1D95', // Tamniji tekst za bolji kontrast
    textSecondary: '#6B7280',
    border: '#DDD6FE', // Ljubičasta granica koja se uklapa
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#8B5CF6',
  },
  red: {
    primary: '#DC2626', // Full jaka crvena boja
    primaryHover: '#B91C1C', // Vrlo malo tamnija za hover (minimalan gradijent)
    primaryLight: '#FEE2E2', // Svjetlija crvena za akcente
    secondary: '#EF4444',
    background: '#FEF2F2', // Suptilna crvena pozadina
    surface: '#FFFFFF',
    text: '#7F1D1D', // Tamniji tekst za bolji kontrast
    textSecondary: '#6B7280',
    border: '#FECACA', // Crvena granica koja se uklapa
    success: '#059669',
    warning: '#F59E0B',
    error: '#DC2626', // Full jaka crvena
    info: '#DC2626', // Full jaka crvena
  },
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorScheme: ColorScheme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme state - check localStorage only on client side to avoid hydration mismatch
  const [theme, setTheme] = useState<Theme>(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      let savedTheme = localStorage.getItem('theme') as Theme
      // Migrate 'orange' to 'red' for all users
      if (savedTheme === 'orange') {
        savedTheme = 'red'
        localStorage.setItem('theme', 'red')
      }
      if (savedTheme && colorSchemes[savedTheme]) {
        return savedTheme
      }
    }
    return 'light'
  })

  useEffect(() => {
    // Load theme from localStorage on mount (fallback check)
    let savedTheme = localStorage.getItem('theme') as Theme
    // Migrate 'orange' to 'red' for all users
    if (savedTheme === 'orange') {
      savedTheme = 'red'
      localStorage.setItem('theme', 'red')
    }
    if (savedTheme && colorSchemes[savedTheme] && savedTheme !== theme) {
      setTheme(savedTheme)
    }
    
    // Apply initial background immediately to prevent white flash
    const root = document.documentElement
    const initialTheme = savedTheme || 'light'
    const scheme = colorSchemes[initialTheme as Theme]
    root.style.backgroundColor = scheme.background
    root.style.background = scheme.background
    document.body.style.backgroundColor = scheme.background
    document.body.style.background = scheme.background
  }, [])

  useEffect(() => {
    // Save theme to localStorage - ensure 'orange' is never saved
    if (theme === 'orange' || theme === 'Orange') {
      localStorage.setItem('theme', 'red')
      setTheme('red')
      return
    }
    localStorage.setItem('theme', theme)
    
    // Apply theme to document root
    const root = document.documentElement
    const scheme = colorSchemes[theme]
    
    root.style.setProperty('--color-primary', scheme.primary)
    root.style.setProperty('--color-primary-hover', scheme.primaryHover)
    root.style.setProperty('--color-primary-light', scheme.primaryLight)
    root.style.setProperty('--color-secondary', scheme.secondary)
    root.style.setProperty('--color-background', scheme.background)
    root.style.setProperty('--color-surface', scheme.surface)
    root.style.setProperty('--color-text', scheme.text)
    root.style.setProperty('--color-text-secondary', scheme.textSecondary)
    root.style.setProperty('--color-border', scheme.border)
    root.style.setProperty('--color-success', scheme.success)
    root.style.setProperty('--color-warning', scheme.warning)
    root.style.setProperty('--color-error', scheme.error)
    root.style.setProperty('--color-info', scheme.info)
    
    // Apply background directly to html and body to prevent white edges
    root.style.backgroundColor = scheme.background
    root.style.background = scheme.background
    root.style.color = scheme.text
    document.body.style.backgroundColor = scheme.background
    document.body.style.background = scheme.background
    document.body.style.color = scheme.text
    
    // Also set on any Next.js wrapper elements
    const nextWrapper = document.getElementById('__next')
    if (nextWrapper) {
      nextWrapper.style.backgroundColor = scheme.background
      nextWrapper.style.background = scheme.background
    }
    
    // Update body classes for theme
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
    document.body.classList.add(`theme-${theme}`)
  }, [theme])

  const value = {
    theme,
    setTheme,
    colorScheme: colorSchemes[theme],
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
