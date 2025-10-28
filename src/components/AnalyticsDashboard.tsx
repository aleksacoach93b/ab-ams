'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Activity, 
  Target, 
  Award,
  Clock,
  Heart,
  Zap,
  Star,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface AnalyticsData {
  playerPerformance: {
    name: string
    rating: number
    trend: number
    lastUpdated: string
  }[]
  attendanceData: {
    date: string
    attendance: number
    totalPlayers: number
  }[]
  wellnessTrends: {
    date: string
    averageScore: number
    participants: number
  }[]
  eventStats: {
    type: string
    count: number
    averageDuration: number
    participation: number
  }[]
  teamMetrics: {
    totalPlayers: number
    activePlayers: number
    averageAge: number
    averageExperience: number
  }
}

interface AnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | '1y'
}

export default function AnalyticsDashboard({ timeRange = '30d' }: AnalyticsDashboardProps) {
  const { colorScheme } = useTheme()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'attendance' | 'wellness' | 'events'>('performance')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Fetch real analytics data from API
      const response = await fetch('/api/analytics/dashboard')
      
      if (response.ok) {
        const realData = await response.json()
        setData(realData)
      } else {
        console.error('Failed to fetch analytics data')
        // Set empty data if API fails
        setData({
          playerPerformance: [],
          attendanceData: [],
          wellnessTrends: [],
          eventStats: [],
          teamMetrics: {
            totalPlayers: 0,
            activePlayers: 0,
            averageAge: 0,
            averageExperience: 0
          }
        })
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      // Set empty data if API fails
      setData({
        playerPerformance: [],
        attendanceData: [],
        wellnessTrends: [],
        eventStats: [],
        teamMetrics: {
          totalPlayers: 0,
          activePlayers: 0,
          averageAge: 0,
          averageExperience: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#10B981'
    if (trend < 0) return '#EF4444'
    return '#6B7280'
  }

  const SimpleBarChart = ({ data, maxValue, color }: { data: number[], maxValue: number, color: string }) => {
    return (
      <div className="flex items-end space-x-1 h-20">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
            style={{
              height: `${(value / maxValue) * 100}%`,
              backgroundColor: color,
              minHeight: '4px'
            }}
          />
        ))}
      </div>
    )
  }

  const SimpleLineChart = ({ data, maxValue, color }: { data: number[], maxValue: number, color: string }) => {
    const points = data.map((value, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: 100 - (value / maxValue) * 100
    }))

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')

    return (
      <div className="h-20 w-full">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
            />
          ))}
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{ color: colorScheme.textSecondary }} />
          <p style={{ color: colorScheme.textSecondary }}>No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: colorScheme.text }}>
              Analytics Dashboard
            </h1>
            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
              Comprehensive insights into team performance and trends
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ 
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                borderColor: colorScheme.border,
                focusRingColor: colorScheme.primary
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={fetchAnalyticsData}
              className="p-2 rounded-lg transition-colors hover:bg-opacity-20"
              style={{ 
                backgroundColor: colorScheme.surface,
                color: colorScheme.text
              }}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: colorScheme.primary,
                color: colorScheme.primaryText || 'white'
              }}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Team Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { 
            title: 'Total Players', 
            value: data.teamMetrics.totalPlayers, 
            icon: Users, 
            color: '#3B82F6',
            change: '+2',
            trend: 'up'
          },
          { 
            title: 'Active Players', 
            value: data.teamMetrics.activePlayers, 
            icon: Activity, 
            color: '#10B981',
            change: '+1',
            trend: 'up'
          },
          { 
            title: 'Avg Age', 
            value: `${data.teamMetrics.averageAge} years`, 
            icon: Clock, 
            color: '#F59E0B',
            change: '-0.5',
            trend: 'down'
          },
          { 
            title: 'Avg Experience', 
            value: `${data.teamMetrics.averageExperience} years`, 
            icon: Award, 
            color: '#8B5CF6',
            change: '+0.3',
            trend: 'up'
          }
        ].map((metric, index) => (
          <div key={index} 
               className="p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl"
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border
               }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${metric.color}20` }}>
                <metric.icon className="h-6 w-6" style={{ color: metric.color }} />
              </div>
              <div className="flex items-center space-x-1 text-sm font-medium"
                   style={{ color: getTrendColor(metric.trend === 'up' ? 1 : -1) }}>
                {getTrendIcon(metric.trend === 'up' ? 1 : -1)}
                <span>{metric.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1" style={{ color: colorScheme.text }}>
              {metric.value}
            </h3>
            <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
              {metric.title}
            </p>
          </div>
        ))}
      </div>

      {/* Metric Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 p-1 rounded-2xl" style={{ backgroundColor: colorScheme.surface }}>
          {[
            { id: 'performance', label: 'Performance', icon: Star },
            { id: 'attendance', label: 'Attendance', icon: Users },
            { id: 'wellness', label: 'Wellness', icon: Heart },
            { id: 'events', label: 'Events', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedMetric === tab.id ? 'shadow-lg' : ''
              }`}
              style={{
                backgroundColor: selectedMetric === tab.id ? colorScheme.primary : 'transparent',
                color: selectedMetric === tab.id ? (colorScheme.primaryText || 'white') : colorScheme.text
              }}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Performance Analytics */}
      {selectedMetric === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Top Performers
            </h3>
            <div className="space-y-4">
              {data.playerPerformance.map((player, index) => (
                <div key={index} 
                     className="flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                     style={{ backgroundColor: colorScheme.background }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
                       style={{ 
                         backgroundColor: index < 3 ? '#F59E0B' : colorScheme.border,
                         color: index < 3 ? 'white' : colorScheme.text
                       }}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium" style={{ color: colorScheme.text }}>
                      {player.name}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < Math.floor(player.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium" style={{ color: colorScheme.text }}>
                        {player.rating}/5
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(player.trend)}
                    <span className="text-sm font-medium" 
                          style={{ color: getTrendColor(player.trend) }}>
                      {player.trend > 0 ? '+' : ''}{player.trend.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Performance Trends
            </h3>
            <div className="space-y-4">
              {data.playerPerformance.slice(0, 5).map((player, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: colorScheme.text }}>
                      {player.name}
                    </span>
                    <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                      {player.rating}/5
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(player.rating / 5) * 100}%`,
                        backgroundColor: colorScheme.primary
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Analytics */}
      {selectedMetric === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Daily Attendance
            </h3>
            <div className="space-y-4">
              <SimpleBarChart 
                data={data.attendanceData.map(d => d.attendance)} 
                maxValue={20} 
                color={colorScheme.primary} 
              />
              <div className="flex justify-between text-xs" style={{ color: colorScheme.textSecondary }}>
                {data.attendanceData.map((day, index) => (
                  <span key={index}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Attendance Statistics
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Average Attendance', value: `${(data.attendanceData.reduce((acc, d) => acc + d.attendance, 0) / data.attendanceData.length).toFixed(1)}/20` },
                { label: 'Best Day', value: `${Math.max(...data.attendanceData.map(d => d.attendance))}/20` },
                { label: 'Attendance Rate', value: `${((data.attendanceData.reduce((acc, d) => acc + d.attendance, 0) / data.attendanceData.length) / 20 * 100).toFixed(1)}%` },
                { label: 'Perfect Days', value: `${data.attendanceData.filter(d => d.attendance === 20).length} days` }
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg"
                     style={{ backgroundColor: colorScheme.background }}>
                  <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {stat.label}
                  </span>
                  <span className="font-semibold" style={{ color: colorScheme.text }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wellness Analytics */}
      {selectedMetric === 'wellness' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wellness Trends */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Wellness Trends
            </h3>
            <div className="space-y-4">
              <SimpleLineChart 
                data={data.wellnessTrends.map(d => d.averageScore)} 
                maxValue={10} 
                color="#10B981" 
              />
              <div className="flex justify-between text-xs" style={{ color: colorScheme.textSecondary }}>
                {data.wellnessTrends.map((day, index) => (
                  <span key={index}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Wellness Stats */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Wellness Statistics
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Average Score', value: `${(data.wellnessTrends.reduce((acc, d) => acc + d.averageScore, 0) / data.wellnessTrends.length).toFixed(1)}/10` },
                { label: 'Best Day', value: `${Math.max(...data.wellnessTrends.map(d => d.averageScore)).toFixed(1)}/10` },
                { label: 'Participation Rate', value: `${((data.wellnessTrends.reduce((acc, d) => acc + d.participants, 0) / data.wellnessTrends.length) / 20 * 100).toFixed(1)}%` },
                { label: 'Trend', value: data.wellnessTrends[data.wellnessTrends.length - 1].averageScore > data.wellnessTrends[0].averageScore ? '↗ Improving' : '↘ Declining' }
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg"
                     style={{ backgroundColor: colorScheme.background }}>
                  <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {stat.label}
                  </span>
                  <span className="font-semibold" style={{ color: colorScheme.text }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Events Analytics */}
      {selectedMetric === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Types */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Event Types Distribution
            </h3>
            <div className="space-y-4">
              {data.eventStats.map((event, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: colorScheme.text }}>
                      {event.type}
                    </span>
                    <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                      {event.count} events
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(event.count / Math.max(...data.eventStats.map(e => e.count))) * 100}%`,
                        backgroundColor: colorScheme.primary
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Statistics */}
          <div className="p-6 rounded-2xl border" 
               style={{ 
                 backgroundColor: colorScheme.surface,
                 borderColor: colorScheme.border 
               }}>
            <h3 className="text-lg font-semibold mb-6" style={{ color: colorScheme.text }}>
              Event Statistics
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Total Events', value: data.eventStats.reduce((acc, e) => acc + e.count, 0) },
                { label: 'Avg Duration', value: `${(data.eventStats.reduce((acc, e) => acc + e.averageDuration, 0) / data.eventStats.length).toFixed(0)} min` },
                { label: 'Avg Participation', value: `${(data.eventStats.reduce((acc, e) => acc + e.participation, 0) / data.eventStats.length).toFixed(1)}%` },
                { label: 'Most Popular', value: data.eventStats.reduce((prev, current) => prev.count > current.count ? prev : current).type }
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg"
                     style={{ backgroundColor: colorScheme.background }}>
                  <span className="text-sm" style={{ color: colorScheme.textSecondary }}>
                    {stat.label}
                  </span>
                  <span className="font-semibold" style={{ color: colorScheme.text }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
