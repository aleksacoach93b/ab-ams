'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Palette, Check } from 'lucide-react'

const themes = [
  { name: 'Light', value: 'light', color: '#F8FAFC' },
  { name: 'Dark', value: 'dark', color: '#0F172A' },
  { name: 'Blue', value: 'blue', color: '#1E3A8A' },
  { name: 'Green', value: 'green', color: '#047857' },
  { name: 'Purple', value: 'purple', color: '#6B21A8' },
  { name: 'Orange', value: 'orange', color: '#C2410C' },
]

export default function ThemeSelector() {
  const { theme, setTheme, colorScheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md transition-colors hover:scale-105"
        style={{ 
          backgroundColor: 'transparent',
          color: colorScheme.text,
        }}
        title="Change theme"
      >
        <Palette className="h-5 w-5" style={{ color: colorScheme.text }} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme selector - Fixed positioning on mobile to prevent overflow */}
          <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-auto sm:mt-2 w-56 sm:w-48 rounded-lg shadow-lg border z-20"
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border,
                 maxWidth: 'calc(100vw - 2rem)' // Prevent overflow on mobile
               }}>
            <div className="p-2">
              <div className="px-3 py-2 text-sm font-medium border-b"
                   style={{ 
                     color: colorScheme.textSecondary,
                     borderColor: colorScheme.border 
                   }}>
                Choose Theme
              </div>
              
              <div className="py-1">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => {
                      setTheme(themeOption.value as any)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors hover:bg-opacity-20"
                    style={{ 
                      color: colorScheme.text,
                      backgroundColor: theme === themeOption.value ? colorScheme.primary : 'transparent'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2"
                        style={{ 
                          backgroundColor: themeOption.color,
                          borderColor: colorScheme.border
                        }}
                      />
                      <span>{themeOption.name}</span>
                    </div>
                    
                    {theme === themeOption.value && (
                      <Check className="h-4 w-4" style={{ color: colorScheme.primaryText || 'white' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
