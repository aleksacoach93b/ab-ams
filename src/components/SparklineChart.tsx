'use client'

import React from 'react'

interface SparklineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  showArea?: boolean
}

export default function SparklineChart({ 
  data, 
  color = '#10B981', 
  width = 60, 
  height = 20,
  showArea = true 
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Normalize data to fit within chart bounds
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1 // Avoid division by zero
  
  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  
  // Generate points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return { x, y, value }
  })

  // Create path string for line
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  // Create path string for area (closed path)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg width={width} height={height} className="sparkline-chart">
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          fillOpacity="0.2"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

