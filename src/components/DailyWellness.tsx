'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, ChevronUp, ChevronDown, Download } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, ReferenceLine, Cell, LabelList } from 'recharts'
import BodyMap from './BodyMap'

interface WellnessData {
  playerName: string
  playerEmail: string
  submittedAt: string
  surveyTitle: string
  feelingSick?: string
  sleepTime?: string
  wakeTime?: string
  sleepQuality?: string
  fatigue?: string
  mood?: string
  stress?: string
  painType?: string
  muscleSoreness?: string
  painfulAreas?: string // JSON array string (old format)
  soreAreas?: string // JSON array string (old format)
  painfulAreasMap?: Record<string, number> // bodyPart -> scale (1-10)
  soreAreasMap?: Record<string, number> // bodyPart -> scale (1-10)
}

export default function DailyWellness() {
  const { colorScheme, theme } = useTheme()
  const [wellnessData, setWellnessData] = useState<WellnessData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sortColumn, setSortColumn] = useState<string | null>('playerName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  // Separate sort states for Painful Areas and Sore Areas tables
  const [painfulAreasSortColumn, setPainfulAreasSortColumn] = useState<string | null>('athleteName')
  const [painfulAreasSortDirection, setPainfulAreasSortDirection] = useState<'asc' | 'desc'>('asc')
  const [soreAreasSortColumn, setSoreAreasSortColumn] = useState<string | null>('athleteName')
  const [soreAreasSortDirection, setSoreAreasSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null)
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState<boolean>(false)
  const [selectedCalculation, setSelectedCalculation] = useState<string>('none')
  const tableRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const bodyPartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchWellnessData()
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

  const fetchWellnessData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/wellness/csv')
      
      if (!response.ok) {
        throw new Error('Failed to fetch wellness data')
      }

      const csvText = await response.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setWellnessData([])
        return
      }

      // Parse CSV headers - use parseCSVLine to handle quoted values properly
      const headerValues = parseCSVLine(lines[0])
      const headers = headerValues.map(h => h.trim().replace(/^"|"$/g, ''))
      
      // Find column indices
      const nameIdx = headers.findIndex(h => h === 'playerName')
      const emailIdx = headers.findIndex(h => h === 'playerEmail')
      const submittedIdx = headers.findIndex(h => h === 'submittedAt')
      const titleIdx = headers.findIndex(h => h === 'surveyTitle')
      const feelingIdx = headers.findIndex(h => h.includes('Are you feeling'))
      const sleepTimeIdx = headers.findIndex(h => h.includes('What time did you go to sleep'))
      const wakeTimeIdx = headers.findIndex(h => h.includes('What time did you wake up'))
      const sleepQualityIdx = headers.findIndex(h => h.includes('How would you rate your sleep quality'))
      const fatigueIdx = headers.findIndex(h => h.includes('How fatigued do you feel today'))
      const moodIdx = headers.findIndex(h => h.includes('How is your mood today'))
      const stressIdx = headers.findIndex(h => h.includes('What is your stress level'))
      const painTypeIdx = headers.findIndex(h => h.includes('If you have any pain today'))
      // Use includes for soreness to handle variations
      const sorenessIdx = headers.findIndex(h => 
        h.includes('What is your general muscle soreness today') ||
        h === 'What is your general muscle soreness today'
      )
      const painfulAreasIdx = headers.findIndex(h => h === 'Painful Areas?' || h.includes('Painful Areas'))
      const soreAreasIdx = headers.findIndex(h => h === 'Sore Areas?' || h.includes('Sore Areas'))
      
      // Find all individual body part columns (with scale values)
      const painfulAreaColumns: Array<{ index: number; bodyPart: string }> = []
      const soreAreaColumns: Array<{ index: number; bodyPart: string }> = []
      
      headers.forEach((header, idx) => {
        if (header.startsWith('Painful Areas? - ')) {
          const bodyPart = header.replace('Painful Areas? - ', '').trim()
          painfulAreaColumns.push({ index: idx, bodyPart })
        } else if (header.startsWith('Sore Areas? - ')) {
          const bodyPart = header.replace('Sore Areas? - ', '').trim()
          soreAreaColumns.push({ index: idx, bodyPart })
        }
      })

      // Parse data rows
      const data: WellnessData[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        
        if (values.length < 4) continue // Skip invalid rows

        const muscleSorenessValue = values[sorenessIdx] || ''
        const painfulAreasValue = values[painfulAreasIdx] || ''
        const soreAreasValue = values[soreAreasIdx] || ''

        // Parse individual body part columns with scale values
        const painfulAreasMap: Record<string, number> = {}
        const soreAreasMap: Record<string, number> = {}
        
        // Read painful areas with scale values
        painfulAreaColumns.forEach(({ index, bodyPart }) => {
          const value = values[index]?.trim()
          if (value && value !== '') {
            const scale = parseInt(value, 10)
            if (!isNaN(scale) && scale >= 1 && scale <= 10) {
              painfulAreasMap[bodyPart] = scale
            }
          }
        })
        
        // Read sore areas with scale values
        soreAreaColumns.forEach(({ index, bodyPart }) => {
          const value = values[index]?.trim()
          if (value && value !== '') {
            const scale = parseInt(value, 10)
            if (!isNaN(scale) && scale >= 1 && scale <= 10) {
              soreAreasMap[bodyPart] = scale
            }
          }
        })

        data.push({
          playerName: values[nameIdx] || 'Unknown',
          playerEmail: values[emailIdx] || '',
          submittedAt: values[submittedIdx] || '',
          surveyTitle: values[titleIdx] || '',
          feelingSick: values[feelingIdx] || '',
          sleepTime: values[sleepTimeIdx] || '',
          wakeTime: values[wakeTimeIdx] || '',
          sleepQuality: values[sleepQualityIdx] || '',
          fatigue: values[fatigueIdx] || '',
          mood: values[moodIdx] || '',
          stress: values[stressIdx] || '',
          painType: values[painTypeIdx] || '',
          muscleSoreness: muscleSorenessValue.trim(),
          painfulAreas: painfulAreasValue.trim(),
          soreAreas: soreAreasValue.trim(),
          painfulAreasMap,
          soreAreasMap
        })
      }

      setWellnessData(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching wellness data:', error)
      setWellnessData([])
      setError(error instanceof Error ? error.message : 'Failed to load wellness data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to parse CSV line (handles quoted values and JSON arrays)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = i < line.length - 1 ? line[i + 1] : ''
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  // Calculate sleep duration from sleepTime and wakeTime
  const calculateSleepDuration = (sleepTime: string, wakeTime: string): string => {
    if (!sleepTime || !wakeTime) return '-'
    
    try {
      // Parse time strings (format: "HH:MM" or "HH:MM:SS")
      const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':')
        if (parts.length < 2) return 0
        const hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        return hours * 60 + minutes // Convert to total minutes
      }

      const sleepMinutes = parseTime(sleepTime)
      const wakeMinutes = parseTime(wakeTime)

      if (isNaN(sleepMinutes) || isNaN(wakeMinutes)) return '-'

      let durationMinutes = wakeMinutes - sleepMinutes

      // If wake time is earlier than sleep time, it means sleep crossed midnight
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60 // Add 24 hours
      }

      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60

      if (hours === 0) {
        return `${minutes}m`
      } else if (minutes === 0) {
        return `${hours}h`
      } else {
        return `${hours}h ${minutes}m`
      }
    } catch (error) {
      console.error('Error calculating sleep duration:', error)
      return '-'
    }
  }

  // Get sleep duration in hours for color calculation
  const getSleepDurationHours = (sleepTime: string, wakeTime: string): number => {
    if (!sleepTime || !wakeTime) return 0
    
    try {
      const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':')
        if (parts.length < 2) return 0
        const hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        return hours * 60 + minutes
      }

      const sleepMinutes = parseTime(sleepTime)
      const wakeMinutes = parseTime(wakeTime)

      if (isNaN(sleepMinutes) || isNaN(wakeMinutes)) return 0

      let durationMinutes = wakeMinutes - sleepMinutes

      if (durationMinutes < 0) {
        durationMinutes += 24 * 60
      }

      return durationMinutes / 60 // Return hours as decimal
    } catch (error) {
      return 0
    }
  }

  // Get color for sleep duration (red if < 8h, green otherwise)
  const getSleepDurationColor = (sleepTime: string, wakeTime: string): string => {
    const hours = getSleepDurationHours(sleepTime, wakeTime)
    if (hours === 0) return '#10B981' // Default green if can't calculate
    return hours < 8 ? '#EF4444' : '#10B981' // Red if < 8h, green if >= 8h
  }

  // Calculate Readiness score (average of Sleep Quality, Mood, Stress, Fatigue, Soreness)
  const calculateReadiness = (row: WellnessData): number => {
    const values: number[] = []
    
    // Parse and add each value if available
    if (row.sleepQuality) {
      const num = parseInt(row.sleepQuality)
      if (!isNaN(num)) values.push(num)
    }
    if (row.mood) {
      const num = parseInt(row.mood)
      if (!isNaN(num)) values.push(num)
    }
    if (row.stress) {
      const num = parseInt(row.stress)
      if (!isNaN(num)) values.push(num)
    }
    if (row.fatigue) {
      const num = parseInt(row.fatigue)
      if (!isNaN(num)) values.push(num)
    }
    if (row.muscleSoreness) {
      const num = parseInt(row.muscleSoreness)
      if (!isNaN(num)) values.push(num)
    }
    
    if (values.length === 0) return 0
    
    // Calculate average
    const sum = values.reduce((acc, val) => acc + val, 0)
    return Math.round((sum / values.length) * 10) / 10 // Round to 1 decimal place
  }

  // Get color for readiness value (same logic as other numeric values)
  const getReadinessColor = (readiness: number): string => {
    if (readiness === 0) return colorScheme.textSecondary
    if (readiness >= 8) return '#10B981' // Green for high scores (8-10)
    if (readiness >= 5) return '#F59E0B' // Yellow for medium scores (5-7)
    return '#EF4444' // Red for low scores (1-4)
  }

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, start with ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort data based on column and direction
  const sortData = (data: WellnessData[]): WellnessData[] => {
    if (!sortColumn) return data

    return [...data].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'playerName':
          aValue = a.playerName?.toLowerCase() || ''
          bValue = b.playerName?.toLowerCase() || ''
          break
        case 'submittedAt':
          aValue = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
          bValue = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
          break
        case 'feelingSick':
          aValue = (a.feelingSick || '').toLowerCase()
          bValue = (b.feelingSick || '').toLowerCase()
          break
        case 'sleepTime':
        case 'wakeTime':
          aValue = a[sortColumn as keyof WellnessData] || ''
          bValue = b[sortColumn as keyof WellnessData] || ''
          // Parse time for proper sorting
          const parseTime = (time: string): number => {
            if (!time) return 0
            const parts = time.split(':')
            if (parts.length < 2) return 0
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
          }
          aValue = parseTime(aValue)
          bValue = parseTime(bValue)
          break
        case 'duration':
          aValue = getSleepDurationHours(a.sleepTime || '', a.wakeTime || '')
          bValue = getSleepDurationHours(b.sleepTime || '', b.wakeTime || '')
          break
        case 'sleepQuality':
        case 'fatigue':
        case 'mood':
        case 'stress':
        case 'muscleSoreness':
          aValue = parseInt(a[sortColumn as keyof WellnessData] as string) || 0
          bValue = parseInt(b[sortColumn as keyof WellnessData] as string) || 0
          break
        case 'readiness':
          aValue = calculateReadiness(a)
          bValue = calculateReadiness(b)
          break
        default:
          return 0
      }

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Get filtered data for table and cards (only by selected date from calendar)
  const getFilteredData = () => {
    let filtered = wellnessData

    // Filter only by selected date from calendar
    if (selectedDate) {
      const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })

      filtered = filtered.filter(item => {
        if (!item.submittedAt) return false
        const itemDate = new Date(item.submittedAt)
        const itemDateStr = itemDate.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        })
        return itemDateStr === selectedDateStr
      })
    }

    // Apply sorting
    return sortData(filtered)
  }

  // Get filtered data for charts (by selected player and date range)
  const getFilteredDataForCharts = () => {
    let filtered = wellnessData

    // Filter by selected player
    if (selectedPlayer) {
      filtered = filtered.filter(item => item.playerName === selectedPlayer)
    }

    // Filter by date range if set
    if (dateRangeStart && dateRangeEnd) {
      filtered = filtered.filter(item => {
        if (!item.submittedAt) return false
        const itemDate = new Date(item.submittedAt)
        itemDate.setHours(0, 0, 0, 0)
        const start = new Date(dateRangeStart)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRangeEnd)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      })
    }

    return filtered
  }

  // Get unique list of players
  const getUniquePlayers = (): string[] => {
    const players = new Set<string>()
    wellnessData.forEach(item => {
      if (item.playerName) {
        players.add(item.playerName)
      }
    })
    return Array.from(players).sort()
  }

  // Get body parts table data (Athlete Name, Body Part, Pain/Soreness Scale)
  // Uses selectedDate from calendar picker (same as main table)
  // Handle sort for Painful Areas and Sore Areas tables
  const handleBodyPartsSort = (column: string, type: 'pain' | 'soreness') => {
    if (type === 'pain') {
      if (painfulAreasSortColumn === column) {
        setPainfulAreasSortDirection(painfulAreasSortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setPainfulAreasSortColumn(column)
        setPainfulAreasSortDirection('asc')
      }
    } else {
      if (soreAreasSortColumn === column) {
        setSoreAreasSortDirection(soreAreasSortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSoreAreasSortColumn(column)
        setSoreAreasSortDirection('asc')
      }
    }
  }

  const getBodyPartsTableData = (type: 'pain' | 'soreness') => {
    // Use getFilteredData() which already filters by selectedDate from calendar
    const filtered = getFilteredData()
    const tableData: Array<{ athleteName: string; bodyPart: string; scale: number }> = []
    
    filtered.forEach((row) => {
      if (!row.playerName) return
      
      // Use the map with actual scale values from CSV columns
      const areasMap = type === 'pain' ? row.painfulAreasMap : row.soreAreasMap
      
      if (!areasMap || Object.keys(areasMap).length === 0) return
      
      // Add each body part with its scale value to table
      Object.entries(areasMap).forEach(([bodyPart, scale]) => {
        if (scale >= 1 && scale <= 10) {
          tableData.push({
            athleteName: row.playerName,
            bodyPart: bodyPart,
            scale: scale
          })
        }
      })
    })
    
    // Get sort column and direction based on type
    const sortCol = type === 'pain' ? painfulAreasSortColumn : soreAreasSortColumn
    const sortDir = type === 'pain' ? painfulAreasSortDirection : soreAreasSortDirection
    
    // Sort data based on selected column
    return tableData.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortCol) {
        case 'athleteName':
          aValue = a.athleteName.toLowerCase()
          bValue = b.athleteName.toLowerCase()
          break
        case 'bodyPart':
          aValue = a.bodyPart.toLowerCase()
          bValue = b.bodyPart.toLowerCase()
          break
        case 'scale':
          aValue = a.scale
          bValue = b.scale
          break
        default:
          // Default: sort by athlete name first, then by body part
          if (a.athleteName !== b.athleteName) {
            return a.athleteName.localeCompare(b.athleteName)
          }
          return a.bodyPart.localeCompare(b.bodyPart)
      }
      
      // Compare values
      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  // Get chart data for selected player and date range
  const getChartData = () => {
    const filtered = getFilteredDataForCharts()
    
    const chartData = filtered.map(item => {
      const sleepDuration = getSleepDurationHours(item.sleepTime || '', item.wakeTime || '')
      const sleepQuality = item.sleepQuality ? parseInt(item.sleepQuality) : null
      const fatigue = item.fatigue ? parseInt(item.fatigue) : null
      const mood = item.mood ? parseInt(item.mood) : null
      const stress = item.stress ? parseInt(item.stress) : null
      const soreness = item.muscleSoreness ? parseInt(item.muscleSoreness) : null
      const readiness = calculateReadiness(item)
      
      const date = item.submittedAt ? new Date(item.submittedAt) : new Date()
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      return {
        date: dateStr,
        dateValue: date.getTime(), // Store timestamp for sorting
        sleepDuration: sleepDuration > 0 ? parseFloat(sleepDuration.toFixed(1)) : null,
        sleepQuality,
        fatigue,
        mood,
        stress,
        soreness,
        readiness: readiness > 0 ? readiness : null
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


  // Get color for sleep duration (red if < 8h, green otherwise)
  const getSleepDurationChartColor = (hours: number | null): string => {
    if (hours === null || hours === 0) return '#10B981' // Default green
    return hours < 8 ? '#EF4444' : '#10B981' // Red if < 8h, green if >= 8h
  }

  // Get color for readiness (same logic as other numeric values)
  const getReadinessChartColor = (readiness: number | null): string => {
    if (readiness === null || readiness === 0) return colorScheme.textSecondary
    if (readiness >= 8) return '#10B981' // Green for high scores (8-10)
    if (readiness >= 5) return '#F59E0B' // Yellow for medium scores (5-7)
    return '#EF4444' // Red for low scores (1-4)
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getDatesWithData = () => {
    const dates = new Set<string>()
    wellnessData.forEach(item => {
      if (item.submittedAt) {
        const date = new Date(item.submittedAt)
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        dates.add(dateStr)
      }
    })
    return dates
  }

  const datesWithData = getDatesWithData()

  const renderMiniCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
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

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0]
  }

  // Export to PDF using html2canvas to capture exact table appearance
  const exportToPDF = async () => {
    const data = getFilteredData()
    
    if (data.length === 0) {
      alert('No data available to export')
      return
    }

    if (!exportRef.current) {
      alert('Export content not found')
      return
    }

    try {
      // Show loading state
      const originalOpacity = exportRef.current.style.opacity
      exportRef.current.style.opacity = '0.99' // Slight opacity to ensure rendering

      // Temporarily expand export container to full width for export
      const originalExportWidth = exportRef.current.style.width
      const originalExportMaxWidth = exportRef.current.style.maxWidth
      const originalExportMargin = exportRef.current.style.margin
      const originalExportPadding = exportRef.current.style.padding
      
      // Get the table element inside
      const tableElement = exportRef.current.querySelector('table') as HTMLTableElement
      const originalTableElementWidth = tableElement?.style.width
      const originalTableElementMaxWidth = tableElement?.style.maxWidth
      
      // Hide card containers for PDF export (only export table)
      const cardContainers = exportRef.current.querySelectorAll('.grid')
      const originalCardDisplay: Map<HTMLElement, string> = new Map()
      cardContainers.forEach((container) => {
        const element = container as HTMLElement
        const computedStyle = window.getComputedStyle(element)
        originalCardDisplay.set(element, element.style.display || computedStyle.display)
        element.style.display = 'none' // Hide cards for export
      })
      
      // Expand to full viewport width
      exportRef.current.style.width = '100vw'
      exportRef.current.style.maxWidth = 'none'
      exportRef.current.style.margin = '0'
      exportRef.current.style.padding = '0'
      
      if (tableElement) {
        tableElement.style.width = '100%'
        tableElement.style.maxWidth = 'none'
        tableElement.style.margin = '0'
        tableElement.style.padding = '0'
      }

      // Temporarily increase row height for PDF export
      const allCells = exportRef.current.querySelectorAll('td, th')
      const originalCellStyles: Map<HTMLElement, { padding: string; minHeight: string; fontSize: string; fontWeight: string }> = new Map()
      
      allCells.forEach((cell) => {
        const element = cell as HTMLElement
        const computedStyle = window.getComputedStyle(element)
        const padding = element.style.padding || computedStyle.padding
        const minHeight = element.style.minHeight || computedStyle.minHeight
        const fontSize = element.style.fontSize || computedStyle.fontSize
        const fontWeight = element.style.fontWeight || computedStyle.fontWeight
        
        // Save original styles
        originalCellStyles.set(element, { padding, minHeight, fontSize, fontWeight })
        
        // Increase padding significantly for better row height and visibility
        element.style.padding = '36px 24px' // Increased vertical padding for better visibility
        element.style.minHeight = '105px' // Minimum row height - larger for print
        // Ensure font size is at least 28px for PDF print visibility (much larger for readability)
        const currentFontSize = parseInt(fontSize) || 16
        if (currentFontSize < 28) {
          element.style.fontSize = '28px'
        } else {
          // Scale up existing font size by 1.8x for PDF
          element.style.fontSize = `${Math.round(currentFontSize * 1.8)}px`
        }
        // Make headers and text bolder for better visibility
        if (element.tagName === 'TH') {
          element.style.fontWeight = '700'
        }
      })

      // Temporarily remove shape styles from badge spans and increase font sizes for PDF export
      // Include all spans with inline styles (including Illness Yes/No values)
      const badgeSpans = exportRef.current.querySelectorAll('span[style*="fontSize"], span[style*="color"], span.font-mono, td span')
      const originalStyles: { element: HTMLElement; styles: { [key: string]: string }; fontSize: string }[] = []
      
      badgeSpans.forEach((span) => {
        const element = span as HTMLElement
        const computedStyle = window.getComputedStyle(element)
        const currentFontSize = element.style.fontSize || computedStyle.fontSize
        
        // Save all original inline styles
        const originalStyleObj: { [key: string]: string } = {}
        for (let i = 0; i < element.style.length; i++) {
          const prop = element.style[i]
          originalStyleObj[prop] = element.style.getPropertyValue(prop)
        }
        originalStyles.push({ element, styles: originalStyleObj, fontSize: currentFontSize })
        
        // Completely remove shape-related styles
        element.style.removeProperty('background-color')
        element.style.removeProperty('backgroundColor')
        element.style.removeProperty('border')
        element.style.removeProperty('border-radius')
        element.style.removeProperty('borderRadius')
        element.style.removeProperty('width')
        element.style.removeProperty('height')
        element.style.setProperty('line-height', 'normal', 'important')
        
        // Significantly increase font size for all values in PDF (at least 30px, scale up existing by 1.8x)
        // This includes Yes/No values in Illness column
        const fontSizeNum = parseInt(currentFontSize) || 16
        const newFontSize = Math.max(30, Math.round(fontSizeNum * 1.8))
        element.style.fontSize = `${newFontSize}px`
        element.style.fontWeight = '900' // Make values bolder for better visibility
        
        // Force reflow
        void element.offsetHeight
      })

      // Center content in card rows for PDF export
      // Select all card row containers (divs with flex items-center justify-between)
      const cardRows = exportRef.current.querySelectorAll('div.flex.items-center.justify-between')
      const originalCardRowStyles: Map<HTMLElement, { alignItems: string; justifyContent: string; minHeight: string; padding: string }> = new Map()
      
      cardRows.forEach((row) => {
        const element = row as HTMLElement
        const computedStyle = window.getComputedStyle(element)
        const alignItems = element.style.alignItems || computedStyle.alignItems
        const justifyContent = element.style.justifyContent || computedStyle.justifyContent
        const minHeight = element.style.minHeight || computedStyle.minHeight
        const padding = element.style.padding || computedStyle.padding
        
        // Save original styles
        originalCardRowStyles.set(element, { alignItems, justifyContent, minHeight, padding })
        
        // Ensure vertical and horizontal centering
        element.style.setProperty('align-items', 'center', 'important')
        element.style.setProperty('justify-content', 'space-between', 'important')
        element.style.setProperty('display', 'flex', 'important')
        // Ensure minimum height for better centering
        if (!minHeight || parseInt(minHeight) < 50) {
          element.style.minHeight = '50px'
        }
        // Ensure adequate padding for better spacing
        if (!padding || parseInt(padding.split(' ')[0]) < 12) {
          element.style.padding = '14px 12px'
        }
        
        // Also center inner content (player name and number containers)
        // Use attribute selector to find elements with gap-1.5 class (contains dot)
        const innerFlex = element.querySelector('[class*="flex"][class*="items-center"][class*="gap-1"]')
        if (innerFlex) {
          const innerElement = innerFlex as HTMLElement
          innerElement.style.setProperty('align-items', 'center', 'important')
          innerElement.style.setProperty('display', 'flex', 'important')
        }
      })

      // Wait for browser to apply styles and render - multiple frames to ensure rendering
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => setTimeout(resolve, 300))

      // Capture export content (table + cards) as image - use theme background for PDF export
      const canvasBgColor = theme === 'dark' ? colorScheme.background : '#FFFFFF'
      // Calculate optimal width to ensure all columns fit (reduced for smaller file size)
      const tableWidth = tableElement?.offsetWidth || exportRef.current.offsetWidth
      const optimalWidth = Math.max(tableWidth, 1000) // Reduced from 1200 for smaller file size
      
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: canvasBgColor,
        scale: 1.5, // Reduced from 2.5 for smaller file size (still good quality)
        logging: false,
        useCORS: true,
        windowWidth: optimalWidth, // Use calculated optimal width
        windowHeight: exportRef.current.scrollHeight,
        allowTaint: true,
        removeContainer: false,
        width: optimalWidth, // Force optimal width
        height: exportRef.current.scrollHeight
      })

      // Restore original styles immediately after capture
      originalStyles.forEach(({ element, styles, fontSize }) => {
        // Clear current styles
        element.style.cssText = ''
        // Restore all original styles
        Object.keys(styles).forEach(prop => {
          element.style.setProperty(prop, styles[prop])
        })
        // Restore original font size
        if (fontSize) {
          element.style.fontSize = fontSize
        }
        // Ensure lineHeight is restored
        element.style.setProperty('line-height', '24px')
      })

      // Restore card row styles
      originalCardRowStyles.forEach((originalStyle, element) => {
        element.style.alignItems = originalStyle.alignItems || ''
        element.style.justifyContent = originalStyle.justifyContent || ''
        element.style.minHeight = originalStyle.minHeight || ''
        element.style.padding = originalStyle.padding || ''
      })

      // Restore card containers display
      originalCardDisplay.forEach((originalDisplay, element) => {
        element.style.display = originalDisplay || ''
      })

      // Restore export container width and styles
      exportRef.current.style.width = originalExportWidth
      exportRef.current.style.maxWidth = originalExportMaxWidth
      exportRef.current.style.margin = originalExportMargin
      exportRef.current.style.padding = originalExportPadding
      
      if (tableElement) {
        tableElement.style.width = originalTableElementWidth || ''
        tableElement.style.maxWidth = originalTableElementMaxWidth || ''
        tableElement.style.margin = ''
        tableElement.style.padding = ''
      }

      // Restore cell padding, height, font size, and font weight
      allCells.forEach((cell) => {
        const element = cell as HTMLElement
        const originalStyle = originalCellStyles.get(element)
        if (originalStyle) {
          element.style.padding = originalStyle.padding || ''
          element.style.minHeight = originalStyle.minHeight || ''
          element.style.fontSize = originalStyle.fontSize || ''
          element.style.fontWeight = originalStyle.fontWeight || ''
        } else {
          element.style.padding = ''
          element.style.minHeight = ''
          element.style.fontSize = ''
          element.style.fontWeight = ''
        }
      })

      // Restore opacity
      exportRef.current.style.opacity = originalOpacity

      // Use JPEG with compression to reduce file size significantly
      const imgData = canvas.toDataURL('image/jpeg', 0.85) // 85% quality - good balance between quality and file size
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Calculate PDF dimensions - full width table with minimal margins
      const doc = new jsPDF('portrait', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 1 // Minimal margin (almost full width)
      const bottomMargin = 8 // Bottom margin to leave space below table
      const contentWidth = pageWidth - 2 * margin // Full width minus minimal margins
      
      // Calculate header and table positioning
      const yOffset = 18 // Reduced offset for smaller header
      const maxHeightPerPage = pageHeight - yOffset - margin - bottomMargin // Maximum height for single page (with bottom margin)

      // Calculate image dimensions to fill entire page width and height
      const imgAspectRatio = imgWidth / imgHeight
      const availableHeight = maxHeightPerPage
      const availableWidth = contentWidth
      
      // First, scale to fill available width (ensure all columns are visible)
      let finalWidth = availableWidth
      let finalHeight = availableWidth / imgAspectRatio
      
      // If scaled height exceeds available height, scale down proportionally
      if (finalHeight > availableHeight) {
        const scaleFactor = availableHeight / finalHeight
        finalHeight = availableHeight
        finalWidth = finalWidth * scaleFactor
      }
      
      // Center the table horizontally on the page
      const xOffset = (pageWidth - finalWidth) / 2

      // Set background color based on theme
      const bgColor = theme === 'dark' ? hexToRgb(colorScheme.background) : [255, 255, 255]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(0, 0, pageWidth, pageHeight, 'F')

      // Add header with modern font and smaller size
      const textColor = hexToRgb(colorScheme.text)
      const textSecondaryColor = hexToRgb(colorScheme.textSecondary)
      
      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.text('Daily Wellness Report', pageWidth / 2, 10, { align: 'center' })
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(textSecondaryColor[0], textSecondaryColor[1], textSecondaryColor[2])
      const dateText = selectedDate 
        ? selectedDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        : 'All Dates'
      doc.text(dateText, pageWidth / 2, 14, { align: 'center' })

      // Add table image - fit on single page (using JPEG format for smaller file size)
      doc.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight)

      // PAGE 2: Body Parts Tables and Body Maps
      if (bodyPartsRef.current) {
        // Add new page
        doc.addPage()
        
        // Reset background for page 2
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
        // Prepare body parts section for export
        const originalBodyPartsWidth = bodyPartsRef.current.style.width
        const originalBodyPartsMaxWidth = bodyPartsRef.current.style.maxWidth
        const originalBodyPartsMargin = bodyPartsRef.current.style.margin
        const originalBodyPartsPadding = bodyPartsRef.current.style.padding
        
        // Expand body parts container to full width
        bodyPartsRef.current.style.width = '100vw'
        bodyPartsRef.current.style.maxWidth = 'none'
        bodyPartsRef.current.style.margin = '0'
        bodyPartsRef.current.style.padding = '20px'
        
        // Increase "Body Maps" header font size for PDF
        const bodyMapsHeader = bodyPartsRef.current.querySelector('h3') as HTMLElement
        const originalHeader3Style: { fontSize: string; marginBottom: string } | null = bodyMapsHeader ? {
          fontSize: bodyMapsHeader.style.fontSize || window.getComputedStyle(bodyMapsHeader).fontSize,
          marginBottom: bodyMapsHeader.style.marginBottom || window.getComputedStyle(bodyMapsHeader).marginBottom
        } : null
        if (bodyMapsHeader) {
          const fontSizeNum = parseInt(originalHeader3Style?.fontSize || '20') || 20
          bodyMapsHeader.style.fontSize = `${Math.max(24, Math.round(fontSizeNum * 1.5))}px`
          bodyMapsHeader.style.marginBottom = '24px'
        }
        
        // Increase font sizes in body parts tables for PDF
        const bodyPartsTables = bodyPartsRef.current.querySelectorAll('table')
        const originalTableStyles: Map<HTMLElement, { fontSize: string; padding: string }> = new Map()
        
        bodyPartsTables.forEach((table) => {
          const tableElement = table as HTMLElement
          const allCells = tableElement.querySelectorAll('td, th')
          
          allCells.forEach((cell) => {
            const element = cell as HTMLElement
            const computedStyle = window.getComputedStyle(element)
            const fontSize = element.style.fontSize || computedStyle.fontSize
            const padding = element.style.padding || computedStyle.padding
            
            originalTableStyles.set(element, { fontSize, padding })
            
            // Increase font size for PDF
            const fontSizeNum = parseInt(fontSize) || 10
            element.style.fontSize = `${Math.max(14, fontSizeNum * 1.5)}px`
            element.style.padding = '8px 12px'
          })
        })
        
        // Increase body map container sizes for PDF (much larger for better visibility)
        const bodyMapContainers = bodyPartsRef.current.querySelectorAll('[style*="height"]')
        const originalBodyMapHeights: Map<HTMLElement, string> = new Map()
        bodyMapContainers.forEach((container) => {
          const element = container as HTMLElement
          const currentHeight = element.style.height || '600px'
          originalBodyMapHeights.set(element, currentHeight)
          const heightNum = parseInt(currentHeight) || 600
          // Significantly increase height for PDF export (at least 800px, or 1.5x current)
          element.style.height = `${Math.max(800, Math.round(heightNum * 1.5))}px`
        })
        
        // Also increase padding and header font size on body map card containers for PDF
        const bodyMapCards = bodyPartsRef.current.querySelectorAll('.rounded-xl.border-2')
        const originalCardPadding: Map<HTMLElement, string> = new Map()
        const originalHeaderStyles: Map<HTMLElement, { fontSize: string; marginBottom: string }> = new Map()
        
        bodyMapCards.forEach((card) => {
          const element = card as HTMLElement
          const computedStyle = window.getComputedStyle(element)
          const padding = element.style.padding || computedStyle.padding
          originalCardPadding.set(element, padding)
          element.style.padding = '32px' // Larger padding for PDF
          
          // Increase header font size in cards
          const header = element.querySelector('h4') as HTMLElement
          if (header) {
            const headerComputedStyle = window.getComputedStyle(header)
            const fontSize = header.style.fontSize || headerComputedStyle.fontSize
            const marginBottom = header.style.marginBottom || headerComputedStyle.marginBottom
            originalHeaderStyles.set(header, { fontSize, marginBottom })
            const fontSizeNum = parseInt(fontSize) || 16
            header.style.fontSize = `${Math.max(20, Math.round(fontSizeNum * 1.5))}px`
            header.style.marginBottom = '16px'
          }
        })
        
        // Wait for rendering
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Capture body parts section
        const bodyPartsCanvas = await html2canvas(bodyPartsRef.current, {
          backgroundColor: canvasBgColor,
          scale: 1.5,
          logging: false,
          useCORS: true,
          windowWidth: bodyPartsRef.current.offsetWidth,
          windowHeight: bodyPartsRef.current.scrollHeight,
          allowTaint: true,
          removeContainer: false,
          width: bodyPartsRef.current.offsetWidth,
          height: bodyPartsRef.current.scrollHeight
        })
        
        // Restore body parts styles
        bodyPartsRef.current.style.width = originalBodyPartsWidth
        bodyPartsRef.current.style.maxWidth = originalBodyPartsMaxWidth
        bodyPartsRef.current.style.margin = originalBodyPartsMargin
        bodyPartsRef.current.style.padding = originalBodyPartsPadding
        
        // Restore table styles
        originalTableStyles.forEach((originalStyle, element) => {
          element.style.fontSize = originalStyle.fontSize || ''
          element.style.padding = originalStyle.padding || ''
        })
        
        // Restore body map container sizes
        originalBodyMapHeights.forEach((originalHeight, element) => {
          element.style.height = originalHeight || ''
        })
        
        // Restore card padding
        originalCardPadding.forEach((originalPadding, element) => {
          element.style.padding = originalPadding || ''
        })
        
        // Restore header styles
        originalHeaderStyles.forEach((originalStyle, element) => {
          element.style.fontSize = originalStyle.fontSize || ''
          element.style.marginBottom = originalStyle.marginBottom || ''
        })
        
        // Restore "Body Maps" header style
        if (bodyMapsHeader && originalHeader3Style) {
          bodyMapsHeader.style.fontSize = originalHeader3Style.fontSize || ''
          bodyMapsHeader.style.marginBottom = originalHeader3Style.marginBottom || ''
        }
        
        // Convert body parts canvas to image
        const bodyPartsImgData = bodyPartsCanvas.toDataURL('image/jpeg', 0.85)
        const bodyPartsImgWidth = bodyPartsCanvas.width
        const bodyPartsImgHeight = bodyPartsCanvas.height
        
        // Calculate dimensions for page 2
        const bodyPartsImgAspectRatio = bodyPartsImgWidth / bodyPartsImgHeight
        const bodyPartsAvailableHeight = pageHeight - yOffset - margin - bottomMargin
        const bodyPartsAvailableWidth = contentWidth
        
        let bodyPartsFinalWidth = bodyPartsAvailableWidth
        let bodyPartsFinalHeight = bodyPartsAvailableWidth / bodyPartsImgAspectRatio
        
        if (bodyPartsFinalHeight > bodyPartsAvailableHeight) {
          const scaleFactor = bodyPartsAvailableHeight / bodyPartsFinalHeight
          bodyPartsFinalHeight = bodyPartsAvailableHeight
          bodyPartsFinalWidth = bodyPartsFinalWidth * scaleFactor
        }
        
        const bodyPartsXOffset = (pageWidth - bodyPartsFinalWidth) / 2
        
        // Add body parts image to page 2
        doc.addImage(bodyPartsImgData, 'JPEG', bodyPartsXOffset, yOffset, bodyPartsFinalWidth, bodyPartsFinalHeight)
      }

      // Save PDF
      const fileName = `Daily_Wellness_Report_${selectedDate ? selectedDate.toISOString().split('T')[0] : 'All'}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const filteredData = getFilteredData()

  // Get top 3 players with lowest Fatigue
  const getTop3LowestFatigue = () => {
    const sorted = [...filteredData].filter(row => row.fatigue && parseInt(row.fatigue) > 0)
      .sort((a, b) => {
        const aFatigue = parseInt(a.fatigue || '0')
        const bFatigue = parseInt(b.fatigue || '0')
        return aFatigue - bFatigue
      })
    return sorted.slice(0, 3)
  }

  // Get top 3 players with lowest Soreness
  const getTop3LowestSoreness = () => {
    const sorted = [...filteredData].filter(row => row.muscleSoreness && parseInt(row.muscleSoreness) > 0)
      .sort((a, b) => {
        const aSoreness = parseInt(a.muscleSoreness || '0')
        const bSoreness = parseInt(b.muscleSoreness || '0')
        return aSoreness - bSoreness
      })
    return sorted.slice(0, 3)
  }

  // Get top 3 players with lowest Stress (lowest is best for stress)
  const getTop3LowestStress = () => {
    const sorted = [...filteredData].filter(row => row.stress && parseInt(row.stress) > 0)
      .sort((a, b) => {
        const aStress = parseInt(a.stress || '0')
        const bStress = parseInt(b.stress || '0')
        return aStress - bStress // Ascending order (lowest first)
      })
    return sorted.slice(0, 3)
  }

  // Get top 3 players with lowest Sleep Quality
  const getTop3LowestSleepQuality = () => {
    const sorted = [...filteredData].filter(row => row.sleepQuality && parseInt(row.sleepQuality) > 0)
      .sort((a, b) => {
        const aQuality = parseInt(a.sleepQuality || '0')
        const bQuality = parseInt(b.sleepQuality || '0')
        return aQuality - bQuality // Ascending order (lowest first)
      })
    return sorted.slice(0, 3)
  }

  // Get top 3 players with lowest Mood
  const getTop3LowestMood = () => {
    const sorted = [...filteredData].filter(row => row.mood && parseInt(row.mood) > 0)
      .sort((a, b) => {
        const aMood = parseInt(a.mood || '0')
        const bMood = parseInt(b.mood || '0')
        return aMood - bMood // Ascending order (lowest first)
      })
    return sorted.slice(0, 3)
  }

  // Get top 3 players with shortest sleep duration
  const getTop3ShortestSleepDuration = () => {
    const sorted = [...filteredData].filter(row => row.sleepTime && row.wakeTime)
      .sort((a, b) => {
        const aDuration = getSleepDurationHours(a.sleepTime || '', a.wakeTime || '')
        const bDuration = getSleepDurationHours(b.sleepTime || '', b.wakeTime || '')
        return aDuration - bDuration // Ascending order (shortest first)
      })
      .filter(row => getSleepDurationHours(row.sleepTime || '', row.wakeTime || '') > 0) // Only include valid durations
    return sorted.slice(0, 3)
  }

  const top3LowestFatigue = getTop3LowestFatigue()
  const top3LowestSoreness = getTop3LowestSoreness()
  const top3LowestStress = getTop3LowestStress()
  const top3LowestSleepQuality = getTop3LowestSleepQuality()
  const top3LowestMood = getTop3LowestMood()
  const top3ShortestSleepDuration = getTop3ShortestSleepDuration()

  if (loading) {
    return (
      <div className="p-6 rounded-lg border-2" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>Loading wellness data...</p>
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
            onClick={fetchWellnessData}
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

  // Helper function to get badge color based on value
  // 10 = green (best), 1 = red (worst) for all numeric scales
  const getBadgeColor = (value: string, type: 'sick' | 'quality' | 'fatigue' | 'mood' | 'stress' | 'soreness'): string => {
    if (!value || value === '-') return colorScheme.textSecondary
    
    const lowerValue = value.toLowerCase()
    
    if (type === 'sick') {
      if (lowerValue === 'yes') return '#EF4444'
      return '#10B981'
    }
    
    // For all numeric scales: 10 = green (best), 1 = red (worst)
    // Quality, Mood, Fatigue, Stress, Soreness all follow same scale
    if (type === 'quality' || type === 'mood' || type === 'fatigue' || type === 'stress' || type === 'soreness') {
      const num = parseInt(value)
      if (isNaN(num)) return colorScheme.textSecondary
      if (num >= 8) return '#10B981' // Green for high scores (8-10)
      if (num >= 5) return '#F59E0B' // Yellow for medium scores (5-7)
      return '#EF4444' // Red for low scores (1-4)
    }
    
    return colorScheme.textSecondary
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
      {/* Mini Horizontal Calendar - Modern Design */}
      <div className="mb-3 md:mb-4 text-center">
        <h2 className="text-base md:text-lg font-bold" style={{ color: colorScheme.text }}>
          Calendar
        </h2>
      </div>
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

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block">
        {/* Export Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            style={{
              backgroundColor: colorScheme.primary,
              color: 'white'
            }}
          >
            <Download className="h-4 w-4" />
            Export to PDF
          </button>
        </div>
        
        {/* Wrapper for table and cards for PDF export */}
        <div ref={exportRef}>
        <div 
          ref={tableRef}
          className="overflow-x-auto md:overflow-x-auto lg:overflow-x-hidden rounded-2xl border-2 shadow-2xl" 
          style={{ 
            borderColor: `${colorScheme.primary}30`,
            backgroundColor: colorScheme.surface,
            boxShadow: `0 8px 32px ${colorScheme.primary}10, 0 2px 8px ${colorScheme.primary}05`
          }}
        >
        <style jsx>{`
          .wellness-table-row {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .wellness-table-row:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          }
          .wellness-table-row:hover td:first-child {
            background-color: inherit !important;
          }
          .wellness-table-header th {
            transition: all 0.2s ease;
          }
          .wellness-table-header th:hover {
            background: linear-gradient(135deg, ${colorScheme.primary}25, ${colorScheme.primary}15) !important;
          }
        `}</style>
          <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr 
                className="wellness-table-header"
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.primary}20, ${colorScheme.primary}12)`,
                  borderBottom: `3px solid ${colorScheme.primary}50`,
                  boxShadow: `0 2px 8px ${colorScheme.primary}10`
                }}
              >
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide sticky left-0 z-10 cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text,
                  backgroundColor: `${colorScheme.primary}08`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '100px',
                  minWidth: '100px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
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
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '60px',
                  minWidth: '60px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
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
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '55px',
                  minWidth: '55px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('feelingSick')}
              >
                <div className="flex items-center justify-center gap-1">
                  Illness
                  {sortColumn === 'feelingSick' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer hover:opacity-80 transition-opacity" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '60px',
                  minWidth: '60px',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('sleepTime')}
              >
                <div className="flex items-center justify-center gap-1">
                  Bed Time
                  {sortColumn === 'sleepTime' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer hover:opacity-80 transition-opacity" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '60px',
                  minWidth: '60px',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('wakeTime')}
              >
                <div className="flex items-center justify-center gap-1">
                  Wake-Up
                  {sortColumn === 'wakeTime' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer hover:opacity-80 transition-opacity" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '65px',
                  minWidth: '65px',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center justify-center gap-1">
                  Duration
                  {sortColumn === 'duration' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '55px',
                  minWidth: '55px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('sleepQuality')}
              >
                <div className="flex items-center justify-center gap-1">
                  Quality
                  {sortColumn === 'sleepQuality' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '55px',
                  minWidth: '55px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('fatigue')}
              >
                <div className="flex items-center justify-center gap-1">
                  Fatigue
                  {sortColumn === 'fatigue' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '55px',
                  minWidth: '55px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('mood')}
              >
                <div className="flex items-center justify-center gap-1">
                  Mood
                  {sortColumn === 'mood' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '55px',
                  minWidth: '55px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('stress')}
              >
                <div className="flex items-center justify-center gap-1">
                  Stress
                  {sortColumn === 'stress' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '65px',
                  minWidth: '65px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('muscleSoreness')}
              >
                <div className="flex items-center justify-center gap-1">
                  Soreness
                  {sortColumn === 'muscleSoreness' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th 
                className="text-center p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium tracking-wide cursor-pointer transition-all" 
                style={{ 
                  color: colorScheme.text, 
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                  width: '70px',
                  minWidth: '70px',
                  whiteSpace: 'nowrap',
                  borderRight: `1px solid ${colorScheme.border}40`,
                  fontSize: 'clamp(11px, 2vw, 16px)'
                }}
                onClick={() => handleSort('readiness')}
              >
                <div className="flex items-center justify-center gap-1">
                  Readiness
                  {sortColumn === 'readiness' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center p-12" style={{ color: colorScheme.textSecondary }}>
                  <div className="flex flex-col items-center">
                    <Calendar className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-base font-medium">
                      {selectedDate ? `No wellness data for ${selectedDate.toLocaleDateString()}` : 'No wellness data available'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr 
                  key={index} 
                  className="wellness-table-row group transition-all duration-200"
                  style={{ 
                    borderBottom: `1px solid ${colorScheme.border}30`,
                    backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}03`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colorScheme.primary}08`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}03`
                  }}
                >
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-medium sticky left-0 z-10 transition-all duration-200 text-center"
                    style={{ 
                      color: colorScheme.text,
                      backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}03`,
                      verticalAlign: 'middle',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '100px',
                      minWidth: '100px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      borderRight: `1px solid ${colorScheme.border}40`,
                      fontSize: 'clamp(11px, 2vw, 16px)',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${colorScheme.primary}08`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}03`
                    }}
                    title={row.playerName}
                  >
                    {row.playerName}
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-mono text-center font-semibold" 
                    style={{ 
                      color: colorScheme.text,
                      verticalAlign: 'middle',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      letterSpacing: '1px',
                      width: '60px',
                      minWidth: '60px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`,
                      fontSize: 'clamp(11px, 2vw, 16px)'
                    }}
                  >
                    {row.submittedAt ? (() => {
                      const date = new Date(row.submittedAt)
                      date.setHours(date.getHours() + 1) // Add 1 hour for timezone adjustment
                      return date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    })() : '-'}
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '55px',
                      minWidth: '55px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      style={{
                        color: getBadgeColor(row.feelingSick || '', 'sick'),
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        fontWeight: '800',
                        display: 'inline-block',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.feelingSick || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-mono text-center font-semibold" 
                    style={{ 
                      color: colorScheme.text,
                      verticalAlign: 'middle',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      letterSpacing: '1px',
                      width: '60px',
                      minWidth: '60px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`,
                      fontSize: 'clamp(11px, 2vw, 16px)'
                    }}
                  >
                    {row.sleepTime || '-'}
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-xs md:text-sm lg:text-base font-mono text-center font-semibold" 
                    style={{ 
                      color: colorScheme.text,
                      verticalAlign: 'middle',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      letterSpacing: '1px',
                      width: '60px',
                      minWidth: '60px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`,
                      fontSize: 'clamp(11px, 2vw, 16px)'
                    }}
                  >
                    {row.wakeTime || '-'}
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '65px',
                      minWidth: '65px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono font-bold"
                      style={{
                        color: getSleepDurationColor(row.sleepTime || '', row.wakeTime || ''),
                        fontWeight: '700',
                        display: 'inline-block',
                        lineHeight: '1',
                        letterSpacing: '0.5px',
                        fontSize: 'clamp(11px, 2vw, 16px)'
                      }}
                    >
                      {calculateSleepDuration(row.sleepTime || '', row.wakeTime || '')}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '55px',
                      minWidth: '55px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getBadgeColor(row.sleepQuality || '', 'quality'),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.sleepQuality || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '55px',
                      minWidth: '55px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getBadgeColor(row.fatigue || '', 'fatigue'),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.fatigue || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '55px',
                      minWidth: '55px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getBadgeColor(row.mood || '', 'mood'),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.mood || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '55px',
                      minWidth: '55px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getBadgeColor(row.stress || '', 'stress'),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.stress || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '65px',
                      minWidth: '65px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colorScheme.border}40`
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getBadgeColor(row.muscleSoreness || '', 'soreness'),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {row.muscleSoreness || '-'}
                    </span>
                  </td>
                  <td 
                    className="p-2 md:p-2 lg:p-3 text-center" 
                    style={{ 
                      verticalAlign: 'middle', 
                      textAlign: 'center',
                      display: 'table-cell',
                      lineHeight: '1.5',
                      width: '70px',
                      minWidth: '70px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span 
                      className="text-xs md:text-sm lg:text-base font-mono"
                      style={{
                        color: getReadinessColor(calculateReadiness(row)),
                        fontWeight: '800',
                        fontSize: 'clamp(11px, 2vw, 16px)',
                        display: 'inline-block',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {calculateReadiness(row) > 0 ? calculateReadiness(row).toFixed(1) : '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

      {/* Top 3 Cards - Lowest Fatigue, Soreness, Stress, Sleep Quality, Mood, and Shortest Sleep Duration */}
      {(top3LowestFatigue.length > 0 || top3LowestSoreness.length > 0 || top3LowestStress.length > 0 || top3LowestSleepQuality.length > 0 || top3LowestMood.length > 0 || top3ShortestSleepDuration.length > 0) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Top 3 Lowest Fatigue */}
          {top3LowestFatigue.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Lowest Fatigue
              </h3>
              <div className="space-y-1.5">
                {top3LowestFatigue.map((player, index) => {
                  const badgeColor = getBadgeColor(player.fatigue || '', 'fatigue')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: badgeColor + '18',
                        borderColor: badgeColor + '50',
                        boxShadow: `0 1px 4px ${badgeColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: badgeColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold px-1.5 flex-shrink-0"
                        style={{
                          color: badgeColor,
                          textShadow: `0 1px 2px ${badgeColor}30`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {player.fatigue || '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top 3 Lowest Soreness */}
          {top3LowestSoreness.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Lowest Soreness
              </h3>
              <div className="space-y-1.5">
                {top3LowestSoreness.map((player, index) => {
                  const badgeColor = getBadgeColor(player.muscleSoreness || '', 'soreness')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: badgeColor + '18',
                        borderColor: badgeColor + '50',
                        boxShadow: `0 1px 4px ${badgeColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: badgeColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold px-1.5 flex-shrink-0"
                        style={{
                          color: badgeColor,
                          textShadow: `0 1px 2px ${badgeColor}30`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {player.muscleSoreness || '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top 3 Lowest Stress */}
          {top3LowestStress.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Lowest Stress
              </h3>
              <div className="space-y-1.5">
                {top3LowestStress.map((player, index) => {
                  const badgeColor = getBadgeColor(player.stress || '', 'stress')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: badgeColor + '18',
                        borderColor: badgeColor + '50',
                        boxShadow: `0 1px 4px ${badgeColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: badgeColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold px-1.5 flex-shrink-0"
                        style={{
                          color: badgeColor,
                          textShadow: `0 1px 2px ${badgeColor}30`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {player.stress || '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top 3 Lowest Sleep Quality */}
          {top3LowestSleepQuality.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Lowest Sleep Quality
              </h3>
              <div className="space-y-1.5">
                {top3LowestSleepQuality.map((player, index) => {
                  const badgeColor = getBadgeColor(player.sleepQuality || '', 'quality')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: badgeColor + '18',
                        borderColor: badgeColor + '50',
                        boxShadow: `0 1px 4px ${badgeColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: badgeColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold px-1.5 flex-shrink-0"
                        style={{
                          color: badgeColor,
                          textShadow: `0 1px 2px ${badgeColor}30`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {player.sleepQuality || '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top 3 Lowest Mood */}
          {top3LowestMood.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Lowest Mood
              </h3>
              <div className="space-y-1.5">
                {top3LowestMood.map((player, index) => {
                  const badgeColor = getBadgeColor(player.mood || '', 'mood')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: badgeColor + '18',
                        borderColor: badgeColor + '50',
                        boxShadow: `0 1px 4px ${badgeColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: badgeColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold px-1.5 flex-shrink-0"
                        style={{
                          color: badgeColor,
                          textShadow: `0 1px 2px ${badgeColor}30`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {player.mood || '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top 3 Shortest Sleep Duration */}
          {top3ShortestSleepDuration.length > 0 && (
            <div 
              className="rounded-lg border-2 p-2.5 shadow-md transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}40`,
                boxShadow: `0 2px 8px ${colorScheme.primary}10`
              }}
            >
              <h3 
                className="text-sm font-bold mb-2 text-center pb-1.5 border-b"
                style={{ 
                  color: colorScheme.text,
                  borderColor: `${colorScheme.primary}30`,
                  fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '-0.01em'
                }}
              >
                Top 3 - Shortest Sleep Duration
              </h3>
              <div className="space-y-1.5">
                {top3ShortestSleepDuration.map((player, index) => {
                  const duration = calculateSleepDuration(player.sleepTime || '', player.wakeTime || '')
                  const durationColor = getSleepDurationColor(player.sleepTime || '', player.wakeTime || '')
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 rounded border transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        backgroundColor: durationColor + '18',
                        borderColor: durationColor + '50',
                        boxShadow: `0 1px 4px ${durationColor}20`
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span 
                          className="font-bold text-xs flex-shrink-0" 
                          style={{ 
                            color: durationColor,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {index + 1}.
                        </span>
                        <p 
                          className="font-semibold text-xs truncate" 
                          style={{ 
                            color: colorScheme.text,
                            fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em'
                          }}
                          title={player.playerName}
                        >
                          {player.playerName}
                        </p>
                      </div>
                      <span 
                        className="text-xs font-bold font-mono px-1.5 flex-shrink-0"
                        style={{
                          color: durationColor,
                          textShadow: `0 1px 2px ${durationColor}30`,
                          fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {duration}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </div>
        )}
        </div>
      </div>

      {/* Body Maps Section - Tables and 4 Maps: Front Pain, Front Soreness, Back Pain, Back Soreness */}
      <div ref={bodyPartsRef} className="mt-8 sm:mt-12">
        <h3 
          className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center" 
          style={{ color: colorScheme.text }}
        >
          Body Maps
        </h3>
        
        {/* Body Parts Tables - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Painful Areas Table */}
          <div>
            <h4 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 text-center" style={{ color: colorScheme.text }}>
              Painful Areas
            </h4>
            <div 
              className="rounded-lg border overflow-hidden shadow-md"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}30`,
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: `${colorScheme.primary}20` }}>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('athleteName', 'pain')}
                      >
                        <div className="flex items-center gap-1">
                          Athlete
                          {painfulAreasSortColumn === 'athleteName' && (
                            painfulAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('bodyPart', 'pain')}
                      >
                        <div className="flex items-center gap-1">
                          Body Part
                          {painfulAreasSortColumn === 'bodyPart' && (
                            painfulAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('scale', 'pain')}
                      >
                        <div className="flex items-center gap-1">
                          Scale
                          {painfulAreasSortColumn === 'scale' && (
                            painfulAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getBodyPartsTableData('pain').map((row, index) => (
                      <tr 
                        key={`pain-${index}`}
                        style={{ 
                          borderBottom: `1px solid ${colorScheme.border}40`,
                          backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}05`
                        }}
                      >
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs"
                          style={{ color: colorScheme.text }}
                        >
                          {row.athleteName}
                        </td>
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs"
                          style={{ color: colorScheme.text }}
                        >
                          {row.bodyPart}
                        </td>
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold"
                          style={{ 
                            color: row.scale >= 7 ? '#DC2626' : row.scale >= 4 ? '#F59E0B' : '#86EFAC'
                          }}
                        >
                          {row.scale}
                        </td>
                      </tr>
                    ))}
                    {getBodyPartsTableData('pain').length === 0 && (
                      <tr>
                        <td 
                          colSpan={3}
                          className="px-2 sm:px-3 py-3 text-center text-[10px] sm:text-xs"
                          style={{ color: colorScheme.textSecondary }}
                        >
                          No painful areas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sore Areas Table */}
          <div>
            <h4 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 text-center" style={{ color: colorScheme.text }}>
              Sore Areas
            </h4>
            <div 
              className="rounded-lg border overflow-hidden shadow-md"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.primary}30`,
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: `${colorScheme.primary}20` }}>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('athleteName', 'soreness')}
                      >
                        <div className="flex items-center gap-1">
                          Athlete
                          {soreAreasSortColumn === 'athleteName' && (
                            soreAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('bodyPart', 'soreness')}
                      >
                        <div className="flex items-center gap-1">
                          Body Part
                          {soreAreasSortColumn === 'bodyPart' && (
                            soreAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-bold cursor-pointer transition-all hover:opacity-80"
                        style={{ 
                          color: colorScheme.text,
                          borderBottom: `1px solid ${colorScheme.border}`,
                          fontFamily: 'DIN, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        onClick={() => handleBodyPartsSort('scale', 'soreness')}
                      >
                        <div className="flex items-center gap-1">
                          Scale
                          {soreAreasSortColumn === 'scale' && (
                            soreAreasSortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getBodyPartsTableData('soreness').map((row, index) => (
                      <tr 
                        key={`soreness-${index}`}
                        style={{ 
                          borderBottom: `1px solid ${colorScheme.border}40`,
                          backgroundColor: index % 2 === 0 ? colorScheme.surface : `${colorScheme.primary}05`
                        }}
                      >
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs"
                          style={{ color: colorScheme.text }}
                        >
                          {row.athleteName}
                        </td>
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs"
                          style={{ color: colorScheme.text }}
                        >
                          {row.bodyPart}
                        </td>
                        <td 
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold"
                          style={{ 
                            color: row.scale >= 7 ? '#DC2626' : row.scale >= 4 ? '#F59E0B' : '#86EFAC'
                          }}
                        >
                          {row.scale}
                        </td>
                      </tr>
                    ))}
                    {getBodyPartsTableData('soreness').length === 0 && (
                      <tr>
                        <td 
                          colSpan={3}
                          className="px-2 sm:px-3 py-3 text-center text-[10px] sm:text-xs"
                          style={{ color: colorScheme.textSecondary }}
                        >
                          No sore areas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Front Pain Map */}
          <div 
            className="rounded-xl border-2 p-6 shadow-lg"
            style={{
              backgroundColor: colorScheme.surface,
              borderColor: `${colorScheme.primary}30`
            }}
          >
            <h4 className="text-base sm:text-lg font-bold mb-4 text-center" style={{ color: colorScheme.text }}>
              Painful Areas - Front
            </h4>
            <div className="w-full" style={{ height: '600px', minHeight: '600px' }}>
              <BodyMap 
                data={getFilteredData()} 
                type="pain" 
                view="front" 
              />
            </div>
          </div>

          {/* Front Soreness Map */}
          <div 
            className="rounded-xl border-2 p-6 shadow-lg"
            style={{
              backgroundColor: colorScheme.surface,
              borderColor: `${colorScheme.primary}30`
            }}
          >
            <h4 className="text-base sm:text-lg font-bold mb-4 text-center" style={{ color: colorScheme.text }}>
              Sore Areas - Front
            </h4>
            <div className="w-full" style={{ height: '600px', minHeight: '600px' }}>
              <BodyMap 
                data={getFilteredData()} 
                type="soreness" 
                view="front" 
              />
            </div>
          </div>

          {/* Back Pain Map */}
          <div 
            className="rounded-xl border-2 p-6 shadow-lg"
            style={{
              backgroundColor: colorScheme.surface,
              borderColor: `${colorScheme.primary}30`
            }}
          >
            <h4 className="text-base sm:text-lg font-bold mb-4 text-center" style={{ color: colorScheme.text }}>
              Painful Areas - Back
            </h4>
            <div className="w-full" style={{ height: '600px', minHeight: '600px' }}>
              <BodyMap 
                data={getFilteredData()} 
                type="pain" 
                view="back" 
              />
            </div>
          </div>

          {/* Back Soreness Map */}
          <div 
            className="rounded-xl border-2 p-6 shadow-lg"
            style={{
              backgroundColor: colorScheme.surface,
              borderColor: `${colorScheme.primary}30`
            }}
          >
            <h4 className="text-base sm:text-lg font-bold mb-4 text-center" style={{ color: colorScheme.text }}>
              Sore Areas - Back
            </h4>
            <div className="w-full" style={{ height: '600px', minHeight: '600px' }}>
              <BodyMap 
                data={getFilteredData()} 
                type="soreness" 
                view="back" 
              />
            </div>
          </div>
        </div>
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
                Wellness Charts for {selectedPlayer}
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
              // More data points = smaller font to prevent overlap
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
                const ewma3 = calculateEWMA(chartData, metric, 3)
                const ewma7 = calculateEWMA(chartData, metric, 7)
                const acwr321 = calculateACWR(chartData, metric, 3, 21)
                const acwr728 = calculateACWR(chartData, metric, 7, 28)
                
                // Calculate analytics for each data point
                const analytics = chartData.map((item, index) => {
                  const value = item[metric] as number | null
                  const previousValue = index > 0 ? (chartData[index - 1][metric] as number | null) : null
                  
                  let zScore: number | null = null
                  let percentile: number | null = null
                  let trend: 'up' | 'down' | 'stable' | null = null
                  let ewma3Value: number | null = null
                  let ewma7Value: number | null = null
                  let acwr321Value: number | null = null
                  let acwr728Value: number | null = null
                  
                  if (value !== null && !isNaN(value)) {
                    zScore = calculateZScore(value, mean, stdDev)
                    percentile = calculatePercentileRank(value, values)
                    trend = calculateTrend(value, previousValue)
                    
                    if (ewma3.length > index) ewma3Value = ewma3[index]
                    if (ewma7.length > index) ewma7Value = ewma7[index]
                    if (acwr321.length > index) acwr321Value = acwr321[index]
                    if (acwr728.length > index) acwr728Value = acwr728[index]
                  }
                  
                  return {
                    value,
                    zScore,
                    percentile,
                    trend,
                    ewma3: ewma3Value,
                    ewma7: ewma7Value,
                    acwr321: acwr321Value,
                    acwr728: acwr728Value
                  }
                })
                
                return {
                  analytics,
                  stats: getStatisticalSummary(chartData, metric),
                  movingAvg: calculateMovingAverage(chartData, metric, 3),
                  ewma3,
                  ewma7,
                  acwr321,
                  acwr728
                }
              }

              // Custom label component for data labels (inside the bar at the bottom)
              const renderLabel = (props: any, isSleepDuration: boolean = false, metric?: string) => {
                const { x, y, width, height, value, payload, index } = props
                if (!value || value === null || value === undefined) return null
                
                // Format value based on type
                let displayValue: string
                if (isSleepDuration && typeof value === 'number') {
                  // Format sleep duration as time (e.g., "7h 30m" or "8h")
                  const hours = Math.floor(value)
                  const minutes = Math.round((value - hours) * 60)
                  if (minutes === 0) {
                    displayValue = `${hours}h`
                  } else {
                    displayValue = `${hours}h ${minutes}m`
                  }
                } else {
                  displayValue = typeof value === 'number' ? String(Math.round(value)) : String(value)
                }
                
                // In recharts, y is the top of the bar, and bars extend downward
                // So the bottom of the bar is at: y (since y is already the bottom in SVG coordinates)
                // Position label near the bottom inside the bar
                const labelY = y - (isSleepDuration ? 15 : 8) // Small offset from bottom
                
                // For Sleep Duration, rotate text vertically
                if (isSleepDuration) {
                  return (
                    <text
                      x={x + width / 2}
                      y={labelY}
                      fill={theme === 'dark' ? '#FFFFFF' : '#000000'}
                      textAnchor="middle"
                      fontSize={labelFontSize}
                      fontWeight="bold"
                      dominantBaseline="middle"
                      transform={`rotate(-90 ${x + width / 2} ${labelY})`}
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

              // Custom label component for advanced analytics (at the top of the bar)
              const renderAnalyticsLabel = (props: any, metric?: string) => {
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
                
                // Position at the top of the bar, inside the bar (y is the top in SVG coordinates)
                // Place it near the top of the bar, but inside it
                const topY = y + height - 5 // Position near the top, inside the bar
                
                return (
                  <text
                    x={x + width / 2}
                    y={topY}
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
                  {/* Sleep Duration Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Sleep Duration (hours)
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
                        Avg: {calculateAverage(chartData, 'sleepDuration').toFixed(1)}h
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('sleepDuration')
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
                        <Bar dataKey="sleepDuration" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getSleepDurationChartColor(entry.sleepDuration)} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'sleepDuration' }, true, 'sleepDuration')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'sleepDuration' }, 'sleepDuration')} position="insideTop" />
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
                          y={calculateAverage(chartData, 'sleepDuration')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'sleepDuration')}h`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sleep Quality Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Sleep Quality
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
                        Avg: {calculateAverage(chartData, 'sleepQuality').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('sleepQuality')
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
                        <Bar dataKey="sleepQuality" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBadgeColor(String(entry.sleepQuality || ''), 'quality')} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'sleepQuality' }, false, 'sleepQuality')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'sleepQuality' }, 'sleepQuality')} position="top" />
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
                          y={calculateAverage(chartData, 'sleepQuality')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'sleepQuality')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Fatigue Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Fatigue
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
                        Avg: {calculateAverage(chartData, 'fatigue').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('fatigue')
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
                        <Bar dataKey="fatigue" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBadgeColor(String(entry.fatigue || ''), 'fatigue')} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'fatigue' }, false, 'fatigue')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'fatigue' }, 'fatigue')} position="top" />
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
                          y={calculateAverage(chartData, 'fatigue')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'fatigue')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Mood Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Mood
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
                        Avg: {calculateAverage(chartData, 'mood').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('mood')
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
                        <Bar dataKey="mood" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBadgeColor(String(entry.mood || ''), 'mood')} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'mood' }, false, 'mood')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'mood' }, 'mood')} position="top" />
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
                          y={calculateAverage(chartData, 'mood')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'mood')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stress Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Stress
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
                        Avg: {calculateAverage(chartData, 'stress').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('stress')
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
                        <Bar dataKey="stress" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBadgeColor(String(entry.stress || ''), 'stress')} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'stress' }, false, 'stress')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'stress' }, 'stress')} position="top" />
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
                          y={calculateAverage(chartData, 'stress')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'stress')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Soreness Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Soreness
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
                        Avg: {calculateAverage(chartData, 'soreness').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('soreness')
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
                        <Bar dataKey="soreness" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBadgeColor(String(entry.soreness || ''), 'soreness')} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'soreness' }, false, 'soreness')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'soreness' }, 'soreness')} position="top" />
                          )}
                        </Bar>
                        {showAdvancedAnalytics && selectedCalculation === 'movingavg' && (() => {
                          const analyticsData = prepareAdvancedAnalytics('soreness')
                          if (analyticsData) {
                            const movingAvgData = chartData.map((item, index) => ({
                              ...item,
                              movingAvg: analyticsData.movingAvg[index] || null
                            }))
                            return (
                              <Line
                                type="monotone"
                                dataKey="movingAvg"
                                data={movingAvgData}
                                stroke="#8B5CF6"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            )
                          }
                          return null
                        })()}
                        <ReferenceLine 
                          y={calculateAverage(chartData, 'soreness')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'soreness')}`, position: 'right', fill: '#F59E0B' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Readiness Chart */}
                  <div 
                    className="rounded-xl border-2 p-2 sm:p-4 shadow-lg relative w-full"
                    style={{
                      backgroundColor: colorScheme.surface,
                      borderColor: `${colorScheme.primary}30`
                    }}
                  >
                    <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
                      <h4 className="text-sm sm:text-base font-bold" style={{ color: colorScheme.text }}>
                        Readiness
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
                        Avg: {calculateAverage(chartData, 'readiness').toFixed(1)}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart 
                        data={(() => {
                          if (showAdvancedAnalytics) {
                            const analyticsData = prepareAdvancedAnalytics('readiness')
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
                        <Bar dataKey="readiness" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getReadinessChartColor(entry.readiness)} />
                          ))}
                          <LabelList content={(props: any) => renderLabel({ ...props, metric: 'readiness' }, false, 'readiness')} position="insideBottom" />
                          {showAdvancedAnalytics && selectedCalculation !== 'none' && selectedCalculation !== 'movingavg' && selectedCalculation !== 'stats' && (
                            <LabelList content={(props: any) => renderAnalyticsLabel({ ...props, metric: 'readiness' }, 'readiness')} position="top" />
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
                          y={calculateAverage(chartData, 'readiness')} 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Avg: ${calculateAverage(chartData, 'readiness')}`, position: 'right', fill: '#F59E0B' }}
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
                            {['sleepDuration', 'sleepQuality', 'fatigue', 'mood', 'stress', 'soreness', 'readiness'].map((metric, index) => {
                              const stats = getStatisticalSummary(chartData, metric)
                              const metricNames: { [key: string]: string } = {
                                sleepDuration: 'Sleep Duration',
                                sleepQuality: 'Sleep Quality',
                                fatigue: 'Fatigue',
                                mood: 'Mood',
                                stress: 'Stress',
                                soreness: 'Soreness',
                                readiness: 'Readiness'
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

      {/* Mobile Card View - Only visible on mobile */}
      <div className="md:hidden space-y-2.5">
        {filteredData.length === 0 ? (
          <div className="text-center p-5 rounded-xl border" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" style={{ color: colorScheme.textSecondary }} />
            <p className="text-sm font-medium" style={{ color: colorScheme.textSecondary }}>
              {selectedDate ? `No wellness data for ${selectedDate.toLocaleDateString()}` : 'No wellness data available'}
            </p>
          </div>
        ) : (
          filteredData.map((row, index) => (
            <div
              key={index}
              className="rounded-lg border p-2.5 shadow-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: colorScheme.surface,
                borderColor: `${colorScheme.border}E6`,
                boxShadow: `0 1px 4px ${colorScheme.primary}06`
              }}
            >
              {/* Player Name Header - Standout Design with Enhanced Background */}
              <div 
                className="flex items-center justify-between mb-2 p-2 rounded-lg -mx-0.5"
                style={{ 
                  background: `linear-gradient(135deg, ${colorScheme.primary}30, ${colorScheme.primary}20)`,
                  border: `1px solid ${colorScheme.primary}60`,
                  boxShadow: `0 2px 8px ${colorScheme.primary}25`
                }}
              >
                <h3 className="text-xs font-bold" style={{ color: colorScheme.text }}>
                  {row.playerName}
                </h3>
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm"
                  style={{
                    backgroundColor: getBadgeColor(row.feelingSick || '', 'sick') + '25',
                    color: getBadgeColor(row.feelingSick || '', 'sick'),
                    border: `1px solid ${getBadgeColor(row.feelingSick || '', 'sick')}40`
                  }}
                >
                  {row.feelingSick || '-'}
                </span>
              </div>

              {/* Submitted Time */}
              <div className="mb-2 text-[10px] text-center" style={{ color: colorScheme.textSecondary }}>
                {row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : '-'}
              </div>

              {/* Sleep Info Grid */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <div className="p-1.5 rounded-lg text-center" style={{ backgroundColor: `${colorScheme.primary}08` }}>
                  <div className="text-[10px] font-semibold mb-0.5 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Sleep
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color: colorScheme.text }}>
                    {row.sleepTime || '-'}
                  </div>
                </div>
                <div className="p-1.5 rounded-lg text-center" style={{ backgroundColor: `${colorScheme.primary}08` }}>
                  <div className="text-[10px] font-semibold mb-0.5 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Wake
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color: colorScheme.text }}>
                    {row.wakeTime || '-'}
                  </div>
                </div>
              </div>

              {/* Duration - Centered */}
              <div className="mb-2.5 text-center">
                <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                  Duration
                </div>
                <span 
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: getSleepDurationColor(row.sleepTime || '', row.wakeTime || '') + '20',
                    color: getSleepDurationColor(row.sleepTime || '', row.wakeTime || ''),
                    border: `1px solid ${getSleepDurationColor(row.sleepTime || '', row.wakeTime || '')}40`
                  }}
                >
                  {calculateSleepDuration(row.sleepTime || '', row.wakeTime || '')}
                </span>
              </div>

              {/* Wellness Metrics Grid - Compact */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Quality
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getBadgeColor(row.sleepQuality || '', 'quality') + '20',
                      color: getBadgeColor(row.sleepQuality || '', 'quality')
                    }}
                  >
                    {row.sleepQuality || '-'}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Fatigue
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getBadgeColor(row.fatigue || '', 'fatigue') + '20',
                      color: getBadgeColor(row.fatigue || '', 'fatigue')
                    }}
                  >
                    {row.fatigue || '-'}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Mood
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getBadgeColor(row.mood || '', 'mood') + '20',
                      color: getBadgeColor(row.mood || '', 'mood')
                    }}
                  >
                    {row.mood || '-'}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Stress
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getBadgeColor(row.stress || '', 'stress') + '20',
                      color: getBadgeColor(row.stress || '', 'stress')
                    }}
                  >
                    {row.stress || '-'}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Soreness
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getBadgeColor(row.muscleSoreness || '', 'soreness') + '20',
                      color: getBadgeColor(row.muscleSoreness || '', 'soreness')
                    }}
                  >
                    {row.muscleSoreness || '-'}
                  </span>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ backgroundColor: `${colorScheme.background}80` }}>
                  <div className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: colorScheme.textSecondary }}>
                    Readiness
                  </div>
                  <span 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: getReadinessColor(calculateReadiness(row)) + '20',
                      color: getReadinessColor(calculateReadiness(row))
                    }}
                  >
                    {calculateReadiness(row) > 0 ? calculateReadiness(row).toFixed(1) : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
