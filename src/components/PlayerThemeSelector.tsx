'use client'

import React, { useState } from 'react'
import { Palette, Sun, Moon, Droplets, Leaf, Sparkles, Check } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface PlayerThemeSelectorProps {
  onClose?: () => void
}

const themeOptions = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and bright',
    icon: Sun,
    preview: {
      primary: '#3B82F6',
      background: '#F9FAFB',
      surface: '#FFFFFF'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Easy on the eyes',
    icon: Moon,
    preview: {
      primary: '#1E3A8A',
      background: '#0F172A',
      surface: '#1E293B'
    }
  },
  {
    id: 'blue',
    name: 'Ocean',
    description: 'Cool and professional',
    icon: Droplets,
    preview: {
      primary: '#1E40AF',
      background: '#F8FAFC',
      surface: '#FFFFFF'
    }
  },
  {
    id: 'green',
    name: 'Nature',
    description: 'Fresh and energetic',
    icon: Leaf,
    preview: {
      primary: '#059669',
      background: '#F0FDF4',
      surface: '#FFFFFF'
    }
  },
  {
    id: 'purple',
    name: 'Royal',
    description: 'Elegant and modern',
    icon: Sparkles,
    preview: {
      primary: '#7C3AED',
      background: '#FAF5FF',
      surface: '#FFFFFF'
    }
  }
]

export default function PlayerThemeSelector({ onClose }: PlayerThemeSelectorProps) {
  const { theme, setTheme, colorScheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme)

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId as any)
    setTheme(themeId as any)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div 
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ backgroundColor: colorScheme.surface }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: colorScheme.primaryLight }}
            >
              <Palette className="h-6 w-6" style={{ color: colorScheme.primary }} />
            </div>
            <div>
              <h3 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Choose Your Theme
              </h3>
              <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                Customize your personal dashboard appearance
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ backgroundColor: colorScheme.error, color: 'white' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Theme Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {themeOptions.map((option) => {
            const IconComponent = option.icon
            const isSelected = selectedTheme === option.id
            
            return (
              <button
                key={option.id}
                onClick={() => handleThemeChange(option.id)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                  isSelected 
                    ? 'shadow-lg' 
                    : 'hover:border-gray-300'
                }`}
                style={{ 
                  backgroundColor: colorScheme.background,
                  borderColor: isSelected ? colorScheme.primary : colorScheme.border
                }}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div 
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colorScheme.primary }}
                  >
                    <Check 
                      className="h-4 w-4" 
                      style={{ color: colorScheme.primaryText || 'white' }}
                    />
                  </div>
                )}

                {/* Theme Preview */}
                <div className="mb-3">
                  <div 
                    className="w-full h-20 rounded-lg mb-2 relative overflow-hidden"
                    style={{ backgroundColor: option.preview.background }}
                  >
                    {/* Preview Elements */}
                    <div 
                      className="absolute top-2 left-2 w-8 h-8 rounded"
                      style={{ backgroundColor: option.preview.surface }}
                    ></div>
                    <div 
                      className="absolute top-2 right-2 w-12 h-4 rounded"
                      style={{ backgroundColor: option.preview.primary }}
                    ></div>
                    <div 
                      className="absolute bottom-2 left-2 w-16 h-3 rounded"
                      style={{ backgroundColor: option.preview.surface }}
                    ></div>
                    <div 
                      className="absolute bottom-2 right-2 w-10 h-3 rounded"
                      style={{ backgroundColor: option.preview.primary }}
                    ></div>
                  </div>
                </div>

                {/* Theme Info */}
                <div className="text-left">
                  <div className="flex items-center space-x-2 mb-1">
                    <IconComponent className="h-4 w-4" style={{ color: colorScheme.primary }} />
                    <h4 className="font-medium" style={{ color: colorScheme.text }}>
                      {option.name}
                    </h4>
                  </div>
                  <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Theme Info */}
        <div 
          className="rounded-lg p-4 mb-6"
          style={{ backgroundColor: colorScheme.primaryLight }}
        >
          <div className="flex items-center space-x-2 mb-2">
            <Check className="h-4 w-4" style={{ color: colorScheme.primary }} />
            <span className="text-sm font-medium" style={{ color: colorScheme.primary }}>
              Current Theme: {themeOptions.find(t => t.id === selectedTheme)?.name}
            </span>
          </div>
          <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
            Your theme preference is saved automatically and will be applied to your personal dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: colorScheme.border,
                color: colorScheme.text
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
