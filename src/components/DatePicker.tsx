'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  required?: boolean
  name?: string
  id?: string
}

export default function DatePicker({ 
  value, 
  onChange, 
  className = '', 
  style,
  placeholder = 'Select date',
  required = false,
  name,
  id
}: DatePickerProps) {
  const { colorScheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value)
      return new Date(date.getFullYear(), date.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedDate = value ? new Date(value) : null

  // Get days in month with Monday-first week
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Convert to Monday-first week (0 = Sunday becomes 6, 1 = Monday becomes 0, etc.)
    const mondayFirstDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

    const days = []
    
    // Add empty cells for days before the first day of the month (Monday-first)
    for (let i = 0; i < mondayFirstDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentMonth(newDate)
  }

  const handleDateSelect = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    onChange(dateString)
    setIsOpen(false)
  }

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // Monday first
  const monthDays = getDaysInMonth(currentMonth)

  const formatDisplayValue = () => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
  }

  return (
    <div className="relative" ref={pickerRef}>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: colorScheme.textSecondary }} />
        <input
          type="text"
          readOnly
          value={formatDisplayValue()}
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          required={required}
          name={name}
          id={id}
          className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 cursor-pointer ${className}`}
          style={{
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.border,
            color: colorScheme.text,
            ...style
          }}
        />
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
            style={{ color: colorScheme.textSecondary }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 mt-2 rounded-2xl shadow-2xl border overflow-hidden"
          style={{ 
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.border,
            minWidth: '280px'
          }}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colorScheme.border }}>
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: colorScheme.text }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: colorScheme.text }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers - Monday first */}
          <div 
            className="grid grid-cols-7 text-center text-xs font-semibold py-2 px-2"
            style={{ color: colorScheme.textSecondary, borderBottom: `1px solid ${colorScheme.border}` }}
          >
            {days.map((day, index) => (
              <div key={index} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-10"></div>
              }

              const dayIsToday = isToday(day)
              const dayIsSelected = isSelected(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                    dayIsSelected 
                      ? 'text-white shadow-lg' 
                      : dayIsToday
                        ? 'font-bold'
                        : 'hover:bg-opacity-20'
                  }`}
                  style={{
                    backgroundColor: dayIsSelected 
                      ? colorScheme.primary 
                      : dayIsToday
                        ? `${colorScheme.primary}30`
                        : 'transparent',
                    color: dayIsSelected 
                      ? 'white' 
                      : dayIsToday
                        ? colorScheme.primary
                        : colorScheme.text,
                    border: dayIsToday && !dayIsSelected ? `2px solid ${colorScheme.primary}` : 'none'
                  }}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

