'use client'

import { useState } from 'react'
import { ChevronDown, Tag } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface MatchDayTagSelectorProps {
  value?: string
  onChange: (value: string) => void
  isAdmin: boolean
  className?: string
}

const MATCH_DAY_TAGS = [
  'Match Day',
  'Match Day +1',
  'Match Day +2', 
  'Match Day +3',
  'Match Day +4',
  'Match Day +5',
  'Match Day -5',
  'Match Day -4',
  'Match Day -3',
  'Match Day -2',
  'Match Day -1',
  'Match Day +1-1',
  'Match Day +2-1',
  'Match Day +3-1',
  'Individual Training',
  'Match Day Compensation',
  'Match Day +1 Compensation',
  'Match Day +2 Compensation',
  'Rehab',
  'Recovery',
  'Day Off'
]

export default function MatchDayTagSelector({ 
  value = '', 
  onChange, 
  isAdmin,
  className = '' 
}: MatchDayTagSelectorProps) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (tag: string) => {
    onChange(tag)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  // If not admin, just show the tag as text
  if (!isAdmin) {
    if (!value) return null
    
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Tag className="h-4 w-4 text-blue-500" />
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
        }`}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-blue-500" />
          <span className={value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
            {value || 'Select Match Day Tag'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-300'
        }`}>
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={handleClear}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              No Tag
            </button>
            {MATCH_DAY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSelect(tag)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  value === tag
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
