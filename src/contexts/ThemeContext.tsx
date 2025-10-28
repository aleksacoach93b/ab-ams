'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange'
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
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryLight: '#DBEAFE',
    secondary: '#6B7280',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
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
    primary: '#1E40AF',
    primaryHover: '#1E3A8A',
    primaryLight: '#DBEAFE',
    secondary: '#64748B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    border: '#E2E8F0',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
  },
  green: {
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#DCFCE7',
    secondary: '#6B7280',
    background: '#F0FDF4',
    surface: '#FFFFFF',
    text: '#064E3B',
    textSecondary: '#374151',
    border: '#D1FAE5',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0891B2',
  },
  purple: {
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryLight: '#EDE9FE',
    secondary: '#8B5CF6',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    text: '#581C87',
    textSecondary: '#6B7280',
    border: '#E9D5FF',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#7C3AED',
  },
  orange: {
    primary: '#C2410C',
    primaryHover: '#9A3412',
    primaryLight: '#FED7AA',
    secondary: '#EA580C',
    background: '#FFF7ED',
    surface: '#FFFFFF',
    text: '#9A3412',
    textSecondary: '#6B7280',
    border: '#FED7AA',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#C2410C',
  },
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorScheme: ColorScheme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && colorSchemes[savedTheme]) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Save theme to localStorage
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
