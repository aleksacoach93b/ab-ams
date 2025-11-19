'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, ReferenceLine, Cell, LabelList } from 'recharts'

interface RPEData {
  playerName: string
  playerEmail: string
  submittedAt: string
  surveyTitle: string
  sessionHardness?: string // How hard was session today?
  sessionDuration?: string // How long did this session last (in minutes)?
  performanceRating?: string // How do you rate your performance in today's session?
}

export default function RPEAnalysis() {
  const { colorScheme, theme } = useTheme()
  const [rpeData, setRpeData] = useState<RPEData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sortColumn, setSortColumn] = useState<string | null>('playerName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null)
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState<boolean>(false)
  const [selectedCalculation, setSelectedCalculation] = useState<string>('none')
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRPEData()
  }, [])

  // Auto-set last 7 days if dates are not selected
  useEffect(() => {
    if (!dateRangeStart && !dateRangeEnd) {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // 7 days total (including today)
      sevenDaysAgo.setHours(0, 0, 0, 0) // Start of day
      
      setDateRangeEnd(today)
      setDateRangeStart(sevenDaysAgo)
    }
  }, [dateRangeStart, dateRangeEnd])

  const fetchRPEData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rpe/csv')
      
      if (!response.ok) {
        throw new Error('Failed to fetch RPE data')
      }

      const csvText = await response.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setRpeData([])
        return
      }

      // Parse CSV headers
      const headerValues = parseCSVLine(lines[0])
      const headers = headerValues.map(h => h.trim().replace(/^"|"$/g, ''))
      
      // Find column indices
      const nameIdx = headers.findIndex(h => h === 'playerName')
      const emailIdx = headers.findIndex(h => h === 'playerEmail')
      const submittedIdx = headers.findIndex(h => h === 'submittedAt')
      const titleIdx = headers.findIndex(h => h === 'surveyTitle')
      const sessionHardnessIdx = headers.findIndex(h => h === 'How hard was session today?')
      const sessionDurationIdx = headers.findIndex(h => h === 'How long did this session last (in minutes)?')
      // Handle encoding issues with apostrophe - check for both variants
      const performanceRatingIdx = headers.findIndex(h => 
        h.includes('How do you rate your performance in today') && 
        h.includes('session')
      )

      // Parse data rows
      const data: RPEData[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        
        if (values.length < 4) continue // Skip invalid rows

        data.push({
          playerName: values[nameIdx] || 'Unknown',
          playerEmail: values[emailIdx] || '',
          submittedAt: values[submittedIdx] || '',
          surveyTitle: values[titleIdx] || '',
          sessionHardness: values[sessionHardnessIdx] || '',
          sessionDuration: values[sessionDurationIdx] || '',
          performanceRating: values[performanceRatingIdx] || '',
        })
      }

      setRpeData(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching RPE data:', error)
      setRpeData([])
      setError(error instanceof Error ? error.message : 'Failed to load RPE data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to parse CSV line (handles quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = i < line.length - 1 ? line[i + 1] : ''
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  // Get unique dates from data
  const getDatesWithData = (): Set<string> => {
    const dates = new Set<string>()
    if (!rpeData || !Array.isArray(rpeData)) return dates
    
    rpeData.forEach(row => {
      if (row && row.submittedAt) {
        try {
          // Parse date from format like "11/12/2025, 6:02:52 PM"
          const dateStr = row.submittedAt.split(',')[0] // Get "11/12/2025"
          const [month, day, year] = dateStr.split('/')
          if (month && day && year) {
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            if (!isNaN(date.getTime())) {
              const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              dates.add(formattedDate)
            }
          }
        } catch (e) {
          // Skip invalid dates
          console.warn('Error parsing date:', e)
        }
      }
    })
    return dates
  }

  // Filter data by selected date

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get unique list of players
  const getUniquePlayers = (): string[] => {
    const players = new Set<string>()
    rpeData.forEach(item => {
      if (item.playerName) {
        players.add(item.playerName)
      }
    })
    return Array.from(players).sort()
  }

  // Get filtered data for charts (by selected player and date range)
  const getFilteredDataForCharts = (): RPEData[] => {
    let filtered = rpeData

    // Filter by selected player
    if (selectedPlayer) {
      filtered = filtered.filter(item => item.playerName === selectedPlayer)
    }

    // Filter by date range if set
    if (dateRangeStart && dateRangeEnd) {
      filtered = filtered.filter(item => {
        if (!item.submittedAt) return false
        try {
          const dateStr = item.submittedAt.split(',')[0]
          const [month, day, year] = dateStr.split('/')
          if (month && day && year) {
            const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            itemDate.setHours(0, 0, 0, 0)
            const start = new Date(dateRangeStart)
            start.setHours(0, 0, 0, 0)
            const end = new Date(dateRangeEnd)
            end.setHours(23, 59, 59, 999)
            return itemDate >= start && itemDate <= end
          }
        } catch (e) {
          return false
        }
        return false
      })
    }

    return filtered
  }

  // Get chart data for selected player and date range
  const getChartData = () => {
    const filtered = getFilteredDataForCharts()
    
    const chartData = filtered.map(item => {
      const hardness = item.sessionHardness ? parseInt(item.sessionHardness) : 0
      const duration = item.sessionDuration ? parseInt(item.sessionDuration) : 0
      const load = hardness > 0 && duration > 0 ? hardness * duration : 0
      const performanceRating = item.performanceRating ? parseInt(item.performanceRating) : null
      
      // Parse date from format like "11/12/2025, 6:02:52 PM"
      let date = new Date()
      try {
        const dateStr = item.submittedAt.split(',')[0]
        const [month, day, year] = dateStr.split('/')
        if (month && day && year) {
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
      } catch (e) {
        // Keep default date
      }
      
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      return {
        date: dateStr,
        dateValue: date.getTime(), // Store timestamp for sorting
        load: load > 0 ? load : null,
        performanceRating
      }
    })
    
    // Sort by date ascending (oldest first, left to right)
    return chartData.sort((a, b) => a.dateValue - b.dateValue)
  }

  // Calculate average for a metric
  const calculateAverage = (data: any[], metric: string): number => {
    const values = data
      .map(item => item[metric])
      .filter(val => val !== null && val !== undefined && !isNaN(val))
    
    if (values.length === 0) return 0
    const sum = values.reduce((acc, val) => acc + val, 0)
    return parseFloat((sum / values.length).toFixed(1))
  }

  // Advanced Analytics Functions
  
  // Calculate Z-Score: (value - mean) / standardDeviation
  const calculateZScore = (value: number | null, mean: number, stdDev: number): number | null => {
    if (value === null || value === undefined || isNaN(value) || stdDev === 0) return null
    return parseFloat(((value - mean) / stdDev).toFixed(2))
  }

  // Calculate standard deviation
  const calculateStandardDeviation = (values: number[]): number => {
    if (values.length === 0) return 0
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
    return Math.sqrt(avgSquaredDiff)
  }

  // Calculate percentile rank: percentage of values that are less than or equal to the given value
  const calculatePercentileRank = (value: number | null, allValues: number[]): number | null => {
    if (value === null || value === undefined || isNaN(value) || allValues.length === 0) return null
    const sortedValues = [...allValues].sort((a, b) => a - b)
    const countBelow = sortedValues.filter(v => v <= value).length
    return Math.round((countBelow / sortedValues.length) * 100)
  }

  // Calculate trend: compare current value with previous value
  const calculateTrend = (currentValue: number | null, previousValue: number | null): 'up' | 'down' | 'stable' | null => {
    if (currentValue === null || previousValue === null || isNaN(currentValue) || isNaN(previousValue)) return null
    const diff = currentValue - previousValue
    if (Math.abs(diff) < 0.1) return 'stable'
    return diff > 0 ? 'up' : 'down'
  }

  // Calculate moving average (simple moving average over n periods)
  const calculateMovingAverage = (data: any[], metric: string, period: number = 3): number[] => {
    const values = data.map(item => item[metric]).filter(val => val !== null && val !== undefined && !isNaN(val))
    const movingAverages: number[] = []
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        // Not enough data points yet, use average of available points
        const availableValues = values.slice(0, i + 1)
        const avg = availableValues.reduce((acc, val) => acc + val, 0) / availableValues.length
        movingAverages.push(parseFloat(avg.toFixed(1)))
      } else {
        // Calculate moving average over period
        const window = values.slice(i - period + 1, i + 1)
        const avg = window.reduce((acc, val) => acc + val, 0) / period
        movingAverages.push(parseFloat(avg.toFixed(1)))
      }
    }
    
    return movingAverages
  }

  // Get statistical summary for a metric
  const getStatisticalSummary = (data: any[], metric: string) => {
    const values = data
      .map(item => item[metric])
      .filter(val => val !== null && val !== undefined && !isNaN(val))
      .sort((a, b) => a - b)
    
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        range: 0,
        count: 0
      }
    }
    
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)]
    const stdDev = calculateStandardDeviation(values)
    const min = values[0]
    const max = values[values.length - 1]
    const range = max - min
    
    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      range: parseFloat(range.toFixed(2)),
      count: values.length
    }
  }

  // Calculate EWMA (Exponentially Weighted Moving Average)
  // α = 2 / (period + 1)
  // EWMA_t = α * X_t + (1 - α) * EWMA_{t-1}
  const calculateEWMA = (data: any[], metric: string, period: number): number[] => {
    const values = data.map(item => item[metric]).filter(val => val !== null && val !== undefined && !isNaN(val)) as number[]
    if (values.length === 0) return []
    
    const alpha = 2 / (period + 1)
    const ewma: number[] = []
    
    // Initialize first value
    if (values.length > 0) {
      ewma.push(values[0])
    }
    
    // Calculate EWMA for remaining values
    for (let i = 1; i < values.length; i++) {
      const currentEWMA = alpha * values[i] + (1 - alpha) * ewma[i - 1]
      ewma.push(parseFloat(currentEWMA.toFixed(2)))
    }
    
    return ewma
  }

  // Calculate ACWR (Acute:Chronic Workload Ratio)
  // ACWR = Acute EWMA / Chronic EWMA
  // Acute period: 3 or 7 days
  // Chronic period: 21 or 28 days
  const calculateACWR = (data: any[], metric: string, acutePeriod: number, chronicPeriod: number): number[] => {
    const acuteEWMA = calculateEWMA(data, metric, acutePeriod)
    const chronicEWMA = calculateEWMA(data, metric, chronicPeriod)
    
    if (acuteEWMA.length === 0 || chronicEWMA.length === 0) return []
    
    const acwr: number[] = []
    const minLength = Math.min(acuteEWMA.length, chronicEWMA.length)
    
    for (let i = 0; i < minLength; i++) {
      if (chronicEWMA[i] === 0 || isNaN(chronicEWMA[i])) {
        acwr.push(0)
      } else {
        const ratio = acuteEWMA[i] / chronicEWMA[i]
        acwr.push(parseFloat(ratio.toFixed(2)))
      }
    }
    
    return acwr
  }

  // Get filtered data - Memoized for performance
  const getFilteredData = useMemo(() => {
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return rpeData
    }
    
    try {
      const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
      
      return rpeData.filter(row => {
        if (!row.submittedAt) return false
        try {
          const dateStr = row.submittedAt.split(',')[0]
          const [month, day, year] = dateStr.split('/')
          if (month && day && year) {
            const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            if (isNaN(itemDate.getTime())) return false
            const itemDateStr = itemDate.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })
            return itemDateStr === selectedDateStr
          }
        } catch (e) {
          return false
        }
        return false
      })
    } catch (e) {
      console.error('Error filtering RPE data:', e)
      return rpeData
    }
  }, [rpeData, selectedDate])

  // Sort data - Memoized for performance
  const getSortedData = useMemo((): RPEData[] => {
    const filtered = getFilteredData
    if (!sortColumn) return filtered

    return [...filtered].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortColumn) {
        case 'playerName':
          aValue = a.playerName || ''
          bValue = b.playerName || ''
          break
        case 'submittedAt':
          aValue = a.submittedAt || ''
          bValue = b.submittedAt || ''
          break
        case 'sessionHardness':
          aValue = parseInt(a.sessionHardness || '0') || 0
          bValue = parseInt(b.sessionHardness || '0') || 0
          break
        case 'sessionDuration':
          aValue = parseInt(a.sessionDuration || '0') || 0
          bValue = parseInt(b.sessionDuration || '0') || 0
          break
        case 'performanceRating':
          aValue = parseInt(a.performanceRating || '0') || 0
          bValue = parseInt(b.performanceRating || '0') || 0
          break
        case 'load':
          const aLoad = (parseInt(a.sessionHardness || '0') || 0) * (parseInt(a.sessionDuration || '0') || 0)
          const bLoad = (parseInt(b.sessionHardness || '0') || 0) * (parseInt(b.sessionDuration || '0') || 0)
          aValue = aLoad
          bValue = bLoad
          break
        default:
          return 0
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      } else {
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        if (sortDirection === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
        }
      }
    })
  }, [getFilteredData, sortColumn, sortDirection])

  // Render mini calendar
  const renderMiniCalendar = () => {
    const datesWithData = getDatesWithData()
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-7 h-7 md:w-8 md:h-8"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasData = datesWithData.has(dateStr)
      const isSelected = selectedDate && 
        selectedDate instanceof Date &&
        !isNaN(selectedDate.getTime()) &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear()

      days.push(
        <button
          key={day}
          onClick={() => {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            setSelectedDate(newDate)
          }}
          className={`w-7 h-7 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 md:hover:scale-110 touch-manipulation ${
            isSelected 
              ? 'shadow-lg' 
              : hasData 
                ? 'md:hover:shadow-md' 
                : ''
          }`}
          style={{
            backgroundColor: isSelected 
              ? colorScheme.primary 
              : hasData 
                ? `${colorScheme.primary}20` 
                : 'transparent',
            color: isSelected 
              ? 'white' 
              : hasData 
                ? colorScheme.primary 
                : colorScheme.textSecondary,
            border: isSelected 
              ? `2px solid ${colorScheme.primary}` 
              : hasData 
                ? `2px solid ${colorScheme.primary}40` 
                : `1px solid ${colorScheme.border}40`,
            boxShadow: isSelected 
              ? `0 4px 12px ${colorScheme.primary}40` 
              : hasData 
                ? `0 2px 4px ${colorScheme.primary}20` 
                : 'none'
          }}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Get color for RPE value - same logic as Daily Wellness but reversed scale
  // RPE 1 = green (easy), RPE 10 = red (max)
  // Same as Daily Wellness: 10 = green, 1 = red, but reversed for RPE
  const getRPEColor = (rpeValue: string | undefined): string => {
    if (!rpeValue || rpeValue === '-') return colorScheme.textSecondary
    
    const num = parseInt(rpeValue)
    if (isNaN(num)) return colorScheme.textSecondary
    
    // RPE scale is reversed: 1 = green (easy), 10 = red (max)
    // So we reverse the logic from Daily Wellness
    if (num <= 3) return '#10B981' // Green for low RPE (1-3) - easy
    if (num <= 6) return '#F59E0B' // Yellow for medium RPE (4-6)
    return '#EF4444' // Red for high RPE (7-10) - max
  }

  const sortedData = getSortedData

  if (loading) {
    return (
      <div className="p-6 rounded-lg border-2" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>Loading RPE data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg border-2" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <p className="mb-4" style={{ color: colorScheme.text }}>{error}</p>
          <button
            onClick={fetchRPEData}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: colorScheme.primary,
              color: 'white'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="p-3 md:p-6 rounded-xl md:rounded-2xl border md:border-2 shadow-sm md:shadow-lg transition-all duration-300"
      style={{ 
        backgroundColor: colorScheme.surface, 
        borderColor: `${colorScheme.border}E6`,
        boxShadow: `0 2px 8px ${colorScheme.primary}06`
      }}
    >
      <div className="mb-4 md:mb-6 text-center md:text-left">
        <h2 className="text-lg md:text-2xl font-bold mb-0.5 md:mb-1" style={{ color: colorScheme.text }}>
          RPE Analysis
        </h2>
        <p className="text-xs md:text-sm" style={{ color: colorScheme.textSecondary }}>
          Track session RPE (Rate of Perceived Exertion) data from players
        </p>
      </div>

      {/* Mini Horizontal Calendar - Modern Design */}
      <div className="mb-6 md:mb-8 p-3 md:p-4 rounded-xl border" style={{ backgroundColor: colorScheme.background, borderColor: colorScheme.border }}>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 md:p-2.5 rounded-lg active:scale-95 md:hover:scale-110 transition-all duration-200 touch-manipulation"
            style={{ 
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
              border: `1px solid ${colorScheme.border}`
            }}
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <h3 className="text-sm md:text-base font-bold text-center px-2" style={{ color: colorScheme.text }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 md:p-2.5 rounded-lg active:scale-95 md:hover:scale-110 transition-all duration-200 touch-manipulation"
            style={{ 
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
              border: `1px solid ${colorScheme.border}`
            }}
          >
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
        
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] md:text-xs text-center font-bold uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {renderMiniCalendar()}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div 
          ref={tableRef}
          className="overflow-x-auto rounded-2xl border-2 shadow-2xl" 
          style={{ 
            borderColor: `${colorScheme.primary}30`,
            backgroundColor: colorScheme.surface,
            boxShadow: `0 8px 32px ${colorScheme.primary}10, 0 2px 8px ${colorScheme.primary}05`
          }}
        >
          <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr 
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.primary}20, ${colorScheme.primary}12)`,
                  borderBottom: `3px solid ${colorScheme.primary}50`,
                  boxShadow: `0 2px 8px ${colorScheme.primary}10`
                }}
              >
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide sticky left-0 z-10 cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text,
                    backgroundColor: `${colorScheme.primary}08`,
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    width: '120px',
                    minWidth: '120px',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${colorScheme.border}40`,
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('playerName')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Athlete Name
                    {sortColumn === 'playerName' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text, 
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    width: '70px',
                    minWidth: '70px',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${colorScheme.border}40`,
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('submittedAt')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Submitted
                    {sortColumn === 'submittedAt' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text, 
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${colorScheme.border}40`,
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('sessionHardness')}
                >
                  <div className="flex items-center justify-center gap-1">
                    RPE
                    {sortColumn === 'sessionHardness' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text, 
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${colorScheme.border}40`,
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('sessionDuration')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Duration (min)
                    {sortColumn === 'sessionDuration' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text, 
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${colorScheme.border}40`,
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('load')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Load (AU)
                    {sortColumn === 'load' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-3 text-base font-medium tracking-wide cursor-pointer transition-all" 
                  style={{ 
                    color: colorScheme.text, 
                    fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                    whiteSpace: 'nowrap',
                    fontSize: '16px'
                  }}
                  onClick={() => handleSort('performanceRating')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Performance Rating
                    {sortColumn === 'performanceRating' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={6}
                    className="text-center p-8"
                    style={{ color: colorScheme.textSecondary }}
                  >
                    {selectedDate ? `No RPE data for ${selectedDate.toLocaleDateString()}` : 'No RPE data available'}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, index) => {
                  // Parse submitted time
                  let submittedTime = '-'
                  if (row.submittedAt) {
                    try {
                      const timePart = row.submittedAt.split(',')[1]?.trim()
                      if (timePart) {
                        submittedTime = timePart
                      }
                    } catch (e) {
                      // Keep default
                    }
                  }

                  return (
                    <tr
                      key={index}
                      className="wellness-table-row"
                      style={{ 
                        borderBottom: `1px solid ${colorScheme.border}40`,
                        backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}03`,
                        borderRight: `1px solid ${colorScheme.border}40`
                      }}
                    >
                      <td 
                        className="text-center p-3 font-medium"
                        style={{ 
                          color: colorScheme.text,
                          borderRight: `1px solid ${colorScheme.border}40`,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {row.playerName}
                      </td>
                      <td 
                        className="text-center p-3 font-mono text-sm"
                        style={{ 
                          color: colorScheme.textSecondary,
                          borderRight: `1px solid ${colorScheme.border}40`
                        }}
                      >
                        {submittedTime}
                      </td>
                      <td 
                        className="text-center p-3 font-bold"
                        style={{ 
                          color: getRPEColor(row.sessionHardness),
                          borderRight: `1px solid ${colorScheme.border}40`,
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}
                      >
                        {row.sessionHardness || '-'}
                      </td>
                      <td 
                        className="text-center p-3 font-mono"
                        style={{ 
                          color: colorScheme.text,
                          borderRight: `1px solid ${colorScheme.border}40`
                        }}
                      >
                        {row.sessionDuration || '-'}
                      </td>
                      <td 
                        className="text-center p-3 font-bold font-mono"
                        style={{ 
                          color: colorScheme.text,
                          borderRight: `1px solid ${colorScheme.border}40`
                        }}
                      >
                        {(() => {
                          const hardness = parseInt(row.sessionHardness || '0') || 0
                          const duration = parseInt(row.sessionDuration || '0') || 0
                          return hardness > 0 && duration > 0 ? (hardness * duration) : '-'
                        })()}
                      </td>
                      <td 
                        className="text-center p-3 font-bold"
                        style={{ 
                          color: colorScheme.text
                        }}
                      >
                        {row.performanceRating || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {sortedData.length === 0 ? (
          <div className="text-center p-5 rounded-xl border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" style={{ color: colorScheme.textSecondary }} />
            <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
              {selectedDate ? `No RPE data for ${selectedDate.toLocaleDateString()}` : 'No RPE data available'}
            </p>
          </div>
        ) : (
          sortedData.map((row, index) => {
            let submittedTime = '-'
            if (row.submittedAt) {
              try {
                const timePart = row.submittedAt.split(',')[1]?.trim()
                if (timePart) {
                  submittedTime = timePart
                }
              } catch (e) {
                // Keep default
              }
            }

            return (
              <div
                key={index}
                className="p-4 rounded-xl border-2"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderColor: `${colorScheme.primary}30`
                }}
              >
                <div className="mb-3 pb-2 border-b" style={{ borderColor: colorScheme.border }}>
                  <h3 className="font-bold text-base" style={{ color: colorScheme.text }}>
                    {row.playerName}
                  </h3>
                  <p className="text-xs font-mono mt-1" style={{ color: colorScheme.textSecondary }}>
                    {submittedTime}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                    <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                      RPE
                    </div>
                    <span 
                      className="text-sm font-bold" 
                      style={{ 
                        color: getRPEColor(row.sessionHardness)
                      }}
                    >
                      {row.sessionHardness || '-'}
                    </span>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                    <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                      Duration
                    </div>
                    <span className="text-sm font-mono font-bold" style={{ color: colorScheme.text }}>
                      {row.sessionDuration || '-'}
                    </span>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                    <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                      Load (AU)
                    </div>
                    <span className="text-sm font-mono font-bold" style={{ color: colorScheme.text }}>
                      {(() => {
                        const hardness = parseInt(row.sessionHardness || '0') || 0
                        const duration = parseInt(row.sessionDuration || '0') || 0
                        return hardness > 0 && duration > 0 ? (hardness * duration) : '-'
                      })()}
                    </span>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                    <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                      Performance
                    </div>
                    <span className="text-sm font-bold" style={{ color: colorScheme.text }}>
                      {row.performanceRating || '-'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Player Selection and Charts Section - Visible on all devices */}
      <div className="mt-8">
        {/* Player Selection */}
        <div className="mb-6">
          <h3
            className="text-base sm:text-lg font-bold mb-3"
            style={{ color: colorScheme.text }}
          >
            Select Player
          </h3>
          <div className="flex flex-wrap gap-2">
            {getUniquePlayers().map((player) => (
              <button
                key={player}
                onClick={() => setSelectedPlayer(selectedPlayer === player ? null : player)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  selectedPlayer === player ? 'shadow-lg scale-105' : 'shadow-md active:scale-105'
                }`}
                style={{
                  backgroundColor: selectedPlayer === player
                    ? colorScheme.primary
                    : colorScheme.surface,
                  color: selectedPlayer === player ? 'white' : colorScheme.text,
                  border: `2px solid ${selectedPlayer === player ? colorScheme.primary : colorScheme.border}`,
                  boxShadow: selectedPlayer === player
                    ? `0 4px 12px ${colorScheme.primary}50`
                    : `0 2px 8px ${colorScheme.primary}10`
                }}
              >
                {player}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <h3
            className="text-base sm:text-lg font-bold mb-3"
            style={{ color: colorScheme.text }}
          >
            Date Range
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colorScheme.textSecondary }}
              >
                From
              </label>
              <input
                type="date"
                value={dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateRangeStart(e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
              />
            </div>
            <div className="flex-1">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: colorScheme.textSecondary }}
              >
                To
              </label>
              <input
                type="date"
                value={dateRangeEnd ? dateRangeEnd.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateRangeEnd(e.target.value ? new Date(e.target.value) : null)}
                min={dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : undefined}
                className="w-full px-4 py-2 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border,
                  color: colorScheme.text
                }}
              />
            </div>
            {(dateRangeStart || dateRangeEnd) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateRangeStart(null)
                    setDateRangeEnd(null)
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    backgroundColor: colorScheme.error + '20',
                    color: colorScheme.error,
                    border: `2px solid ${colorScheme.error}40`
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedPlayer && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h3 
                className="text-lg sm:text-xl font-bold" 
                style={{ color: colorScheme.text }}
              >
                RPE Analysis Charts for {selectedPlayer}
              </h3>
              
              {/* Advanced Analytics Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span 
                    className="text-sm font-medium"
                    style={{ color: colorScheme.text }}
                  >
                    Show Advanced Analytics
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showAdvancedAnalytics}
                      onChange={(e) => {
                        setShowAdvancedAnalytics(e.target.checked)
                        if (!e.target.checked) {
                          setSelectedCalculation('none')
                        }
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`w-12 h-6 rounded-full transition-all duration-200 ${
                        showAdvancedAnalytics ? 'bg-blue-500' : 'bg-gray-400'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                          showAdvancedAnalytics ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                        style={{ marginTop: '2px' }}
                      />
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Calculation Dropdown - Only show when Advanced Analytics is ON */}
            {showAdvancedAnalytics && (
              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colorScheme.textSecondary }}
                >
                  Choose Calculation
                </label>
                <select
                  value={selectedCalculation}
                  onChange={(e) => setSelectedCalculation(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.border,
                    color: colorScheme.text
                  }}
                >
                  <option value="none">None (Default View)</option>
                  <option value="zscore">Z-Score</option>
                  <option value="percentile">Percentile Rank</option>
                  <option value="trend">Trend Analysis</option>
                  <option value="movingavg">Moving Average</option>
                  <option value="acwr321">ACWR (3/21)</option>
                  <option value="acwr728">ACWR (7/28)</option>
                  <option value="stats">Statistical Summary</option>
                </select>
              </div>
            )}
            
            {(() => {
              const chartData = getChartData()
              if (chartData.length === 0) {
                return (
                  <div className="text-center p-8 rounded-xl border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
                    <p className="text-base font-medium" style={{ color: colorScheme.textSecondary }}>
                      No data available for selected player and date range
                    </p>
                  </div>
                )
              }

              // Calculate dynamic font size based on number of data points
              const dataCount = chartData.length
              let labelFontSize = 12
              if (dataCount > 20) labelFontSize = 8
              else if (dataCount > 15) labelFontSize = 9
              else if (dataCount > 10) labelFontSize = 10
              else if (dataCount > 7) labelFontSize = 11

              // Prepare advanced analytics data for each metric
              const prepareAdvancedAnalytics = (metric: string) => {
                const values = chartData
                  .map(item => item[metric])
                  .filter(val => val !== null && val !== undefined && !isNaN(val)) as number[]
                
                if (values.length === 0) return null
                
                const mean = calculateAverage(chartData, metric)
                const stdDev = calculateStandardDeviation(values)
                
                // Calculate EWMA and ACWR
                const acwr321 = calculateACWR(chartData, metric, 3, 21)
                const acwr728 = calculateACWR(chartData, metric, 7, 28)
                
                // Calculate analytics for each data point
                const analytics = chartData.map((item, index) => {
                  const value = item[metric] as number | null
                  const previousValue = index > 0 ? (chartData[index - 1][metric] as number | null) : null
                  
                  let zScore: number | null = null
                  let percentile: number | null = null
                  let trend: 'up' | 'down' | 'stable' | null = null
                  let acwr321Value: number | null = null
                  let acwr728Value: number | null = null
                  
                  if (value !== null && !isNaN(value)) {
                    zScore = calculateZScore(value, mean, stdDev)
                    percentile = calculatePercentileRank(value, values)
                    trend = calculateTrend(value, previousValue)
                    
                    if (acwr321.length > index) acwr321Value = acwr321[index]
                    if (acwr728.length > index) acwr728Value = acwr728[index]
                  }
                  
                  return {
                    value,
                    zScore,
                    percentile,
                    trend,
                    acwr321: acwr321Value,
                    acwr728: acwr728Value
                  }
                })
                
                return {
                  analytics,
                  stats: getStatisticalSummary(chartData, metric),
                  movingAvg: calculateMovingAverage(chartData, metric, 3),
                  acwr321,
                  acwr728
                }
              }

              // Custom label component for data labels (inside the bar at the bottom)
              const renderLabel = (props: any, metric?: string) => {
                const { x, y, width, height, value } = props
                if (!value || value === null || value === undefined) return null
                
                const displayValue = typeof value === 'number' ? String(Math.round(value)) : String(value)
                const labelY = y - 8 // Small offset from bottom
                
                return (
                  <text
                    x={x + width / 2}
                    y={labelY}
                    fill={theme === 'dark' ? '#FFFFFF' : '#000000'}
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    fontWeight="bold"
                    dominantBaseline="middle"
                    style={{
                      textShadow: theme === 'dark' 
                        ? '0 2px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.8)' 
                        : '0 2px 4px rgba(255, 255, 255, 1), 0 0 8px rgba(255, 255, 255, 0.8)',
                      pointerEvents: 'none'
                    }}
                  >
                    {displayValue}
                  </text>
                )
              }

              // Custom label component for advanced analytics (at the top of the bar or above the dot for line charts)
              const renderAnalyticsLabel = (props: any, metric?: string, isLineChart: boolean = false) => {
                const { x, y, width, height, value, payload, index } = props
                if (!showAdvancedAnalytics || selectedCalculation === 'none' || !metric || index === undefined || value === null || value === undefined) return null
                
                const analyticsData = prepareAdvancedAnalytics(metric)
                if (!analyticsData) return null
                
                const analytics = analyticsData.analytics[index]
                if (!analytics) return null
                
                let displayText = ''
                if (selectedCalculation === 'zscore' && analytics.zScore !== null) {
                  displayText = `Z: ${analytics.zScore.toFixed(1)}`
                } else if (selectedCalculation === 'percentile' && analytics.percentile !== null) {
                  displayText = `${analytics.percentile}%`
                } else if (selectedCalculation === 'trend' && analytics.trend) {
                  const trendSymbol = analytics.trend === 'up' ? '↑' : analytics.trend === 'down' ? '↓' : '→'
                  displayText = trendSymbol
                } else if (selectedCalculation === 'acwr321' && analytics.acwr321 !== null) {
                  displayText = `ACWR: ${analytics.acwr321.toFixed(2)}`
                } else if (selectedCalculation === 'acwr728' && analytics.acwr728 !== null) {
                  displayText = `ACWR: ${analytics.acwr728.toFixed(2)}`
                }
                
                if (!displayText) return null
                
                // For line charts, y is the y-coordinate of the point
                // For bar charts, y is the top of the bar
                let labelX, labelY
                if (isLineChart) {
                  labelX = x
                  labelY = y - 15 // Position above the dot
                } else {
                  labelX = x + (width || 0) / 2
                  labelY = y + (height || 0) - 5 // Position near the top, inside the bar
                }
                
                return (
                  <text
                    x={labelX}
                    y={labelY}
                    fill={theme === 'dark' ? '#FFFFFF' : '#000000'}
                    textAnchor="middle"
                    fontSize={labelFontSize - 2}
                    fontWeight="normal"
                    dominantBaseline="middle"
                    style={{
                      textShadow: theme === 'dark' 
                        ? '0 2px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.8)' 
                        : '0 2px 4px rgba(255, 255, 255, 1), 0 0 8px rgba(255, 255, 255, 0.8)',
                      pointerEvents: 'none'
                    }}
                  >
                    {displayText}
                  </text>
                )
              }

              return (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 -mx-4 md:mx-0 px-4 md:px-0">
                  {/* Load (AU) Bar Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Load (AU)
                      </h4>
                      <div 
                        className="absolute right-0 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs shadow-md"
                        style={{
                          backgroundColor: theme === 'dark' ? `${colorScheme.primary}40` : `${colorScheme.primary}25`,
                          color: theme === 'dark' ? '#FFFFFF' : colorScheme.primary,
                          border: `2px solid ${colorScheme.primary}60`,
                          textShadow: theme === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                      >
                        Avg: {calculateAverage(chartData, 'load').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('load')
                            if (analyticsData) {
                              return chartData.map((item, index) => ({
                                ...item,
                                movingAvg: selectedCalculation === 'movingavg' ? (analyticsData.movingAvg[index] || null) : null,
                                acwr: (selectedCalculation === 'acwr321' || selectedCalculation === 'acwr728')
                                  ? (selectedCalculation === 'acwr321' ? (analyticsData.acwr321[index] || null) : (analyticsData.acwr728[index] || null))
                                  : null
                              }))
                            }
                          }
                          return chartData
                        })()}
                        margin={{ top: 5, right: 5, left: -10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={colorScheme.border} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: colorScheme.textSecondary, fontSize: 12 }}
                          stroke={colorScheme.border}
                        />
                        <YAxis 
                          tick={{ fill: colorScheme.textSecondary, fontSize: 12 }}
                          stroke={colorScheme.border}
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: colorScheme.surface,
                            border: `1px solid ${colorScheme.border}`,
                            color: colorScheme.text,
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="load" radius={[8, 8, 0, 0]} isAnimationActive={false} fill={colorScheme.primary}>
                          <LabelList content={(props: any) => renderLabel(props, 'load')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel(props, 'load')} position="insideTop" />
                          )}
                        </Bar>
                        {showAdvancedAnalytics && selectedCalculation === 'movingavg' && (
                          <Line
                            type="monotone"
                            dataKey="movingAvg"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                        {showAdvancedAnalytics && (selectedCalculation === 'acwr321' || selectedCalculation === 'acwr728') && (
                          <Line
                            type="monotone"
                            dataKey="acwr"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                        <ReferenceLine 
                          y={calculateAverage(chartData, 'load')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'load')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Performance Rating Line Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Performance Rating
                      </h4>
                      <div 
                        className="absolute right-0 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs shadow-md"
                        style={{
                          backgroundColor: theme === 'dark' ? `${colorScheme.primary}40` : `${colorScheme.primary}25`,
                          color: theme === 'dark' ? '#FFFFFF' : colorScheme.primary,
                          border: `2px solid ${colorScheme.primary}60`,
                          textShadow: theme === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                      >
                        Avg: {calculateAverage(chartData, 'performanceRating').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('performanceRating')
                            if (analyticsData) {
                              return chartData.map((item, index) => ({
                                ...item,
                                movingAvg: selectedCalculation === 'movingavg' ? (analyticsData.movingAvg[index] || null) : null,
                                acwr: (selectedCalculation === 'acwr321' || selectedCalculation === 'acwr728')
                                  ? (selectedCalculation === 'acwr321' ? (analyticsData.acwr321[index] || null) : (analyticsData.acwr728[index] || null))
                                  : null
                              }))
                            }
                          }
                          return chartData
                        })()}
                        margin={{ top: 5, right: 5, left: -10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={colorScheme.border} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: colorScheme.textSecondary, fontSize: 12 }}
                          stroke={colorScheme.border}
                        />
                        <YAxis 
                          domain={[0, 10]}
                          tick={{ fill: colorScheme.textSecondary, fontSize: 12 }}
                          stroke={colorScheme.border}
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: colorScheme.surface,
                            border: `1px solid ${colorScheme.border}`,
                            color: colorScheme.text,
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="performanceRating" 
                          stroke={colorScheme.primary}
                          strokeWidth={3}
                          dot={{ fill: colorScheme.primary, r: 4 }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={false}
                        />
                        {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                          <Line
                            type="monotone"
                            dataKey="performanceRating"
                            stroke="transparent"
                            strokeWidth={0}
                            dot={false}
                            isAnimationActive={false}
                          >
                            <LabelList content={(props: any) => renderAnalyticsLabel(props, 'performanceRating', true)} position="top" />
                          </Line>
                        )}
                        {showAdvancedAnalytics && selectedCalculation === 'movingavg' && (
                          <Line
                            type="monotone"
                            dataKey="movingAvg"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                        {showAdvancedAnalytics && (selectedCalculation === 'acwr321' || selectedCalculation === 'acwr728') && (
                          <Line
                            type="monotone"
                            dataKey="acwr"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                        <ReferenceLine 
                          y={calculateAverage(chartData, 'performanceRating')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'performanceRating')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Statistical Summary Table - Only show when "stats" is selected */}
                {showAdvancedAnalytics && selectedCalculation === 'stats' && (
                  <div className="mt-6 -mx-4 md:mx-0 px-4 md:px-0">
                    <h4 className="text-base sm:text-lg font-bold mb-4 text-center" style={{ color: colorScheme.text }}>
                      Statistical Summary
                    </h4>
                    <div 
                      className="rounded-xl border-2 overflow-hidden shadow-lg"
                      style={{
                        backgroundColor: colorScheme.surface,
                        borderColor: `${colorScheme.primary}30`
                      }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: `${colorScheme.primary}20` }}>
                              <th 
                                className="px-3 py-2 text-left text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Metric
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Mean
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Median
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Std Dev
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Min
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Max
                              </th>
                              <th 
                                className="px-3 py-2 text-center text-xs sm:text-sm font-bold"
                                style={{ 
                                  color: colorScheme.text,
                                  borderBottom: `2px solid ${colorScheme.border}`,
                                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                              >
                                Range
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {['load', 'performanceRating'].map((metric, index) => {
                              const stats = getStatisticalSummary(chartData, metric)
                              const metricNames: { [key: string]: string } = {
                                load: 'Load (AU)',
                                performanceRating: 'Performance Rating'
                              }
                              return (
                                <tr 
                                  key={metric}
                                  style={{ 
                                    borderBottom: `1px solid ${colorScheme.border}40`,
                                    backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}05`
                                  }}
                                >
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm font-semibold"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {metricNames[metric]}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.mean.toFixed(2)}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.median.toFixed(2)}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.stdDev.toFixed(2)}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.min.toFixed(2)}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.max.toFixed(2)}
                                  </td>
                                  <td 
                                    className="px-3 py-2 text-xs sm:text-sm text-center font-mono"
                                    style={{ color: colorScheme.text }}
                                  >
                                    {stats.range.toFixed(2)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

