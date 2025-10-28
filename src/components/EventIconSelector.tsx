'use client'

import React from 'react'
import CustomIcon from './CustomIcon'
import { useTheme } from '@/contexts/ThemeContext'

interface EventIconSelectorProps {
  selectedIcon?: string
  onIconSelect: (icon: string) => void
}

// Simplified list of only the requested icons
const selectedIcons = [
  { key: 'SoccerPitch', label: 'Football Pitch' },
  { key: 'FootballBall', label: 'Football Ball' },
  { key: 'Dumbbell', label: 'Gym' },
  { key: 'Video', label: 'Video' },
  { key: 'Meeting', label: 'Meeting' },
  { key: 'Recovery', label: 'Recovery' },
  { key: 'BloodSample', label: 'Blood Sample' },
  { key: 'StopwatchWhistle', label: 'Match Timer' },
  { key: 'ElectronicScale', label: 'Electronic Scale' },
  { key: 'Calendar', label: 'Calendar' },
  { key: 'Activity', label: 'Heart Rate' },
  { key: 'Bus', label: 'Bus' },
  { key: 'Plane', label: 'Airplane' },
  { key: 'Car', label: 'Car' },
  { key: 'Camera', label: 'Camera' },
  { key: 'Users', label: 'Team' },
  { key: 'CarArrival', label: 'Arrival', iconKey: 'Car' },
  { key: 'UsersMeeting', label: 'Team Meeting', iconKey: 'Users' },
  { key: 'BedTime', label: 'Bed Time' },
  { key: 'MealPlate', label: 'Meal' },
  { key: 'CoffeeCup', label: 'Coffee' },
  { key: 'AmericanFootball', label: 'American Football' },
  { key: 'Basketball', label: 'Basketball' },
  { key: 'TennisBall', label: 'Tennis Ball' },
  { key: 'Volleyball', label: 'Volleyball' },
  { key: 'WarmUp', label: 'Warm-Up' },
  { key: 'Mobility', label: 'Mobility' },
]

// Helper function to get icon color based on icon type
const getIconColor = (iconKey: string) => {
  switch (iconKey) {
    // Training related icons
    case 'SoccerPitch':
    case 'FootballBall':
    case 'Dumbbell':
    case 'StopwatchWhistle':
    case 'AmericanFootball':
    case 'Basketball':
    case 'TennisBall':
    case 'Volleyball':
    case 'WarmUp':
      return '#F59E0B' // Orange
    
    // Meeting related icons
    case 'Meeting':
    case 'Users':
    case 'UsersMeeting':
      return '#3B82F6' // Blue
    
    // Medical/Health related icons
    case 'BloodSample':
    case 'ElectronicScale':
    case 'Activity':
    case 'Recovery':
    case 'Mobility':
      return '#10B981' // Green
    
    // Travel related icons
    case 'Bus':
    case 'Plane':
    case 'Car':
    case 'CarArrival':
      return '#8B5CF6' // Purple
    
    // Media related icons
    case 'Video':
    case 'Camera':
      return '#EF4444' // Red
    
    // Meal related icons
    case 'MealPlate':
    case 'CoffeeCup':
      return '#F97316' // Orange-red
    
    // Rest related icons
    case 'BedTime':
      return '#6366F1' // Indigo
    
    // General icons
    case 'Calendar':
    default:
      return '#6B7280' // Gray
  }
}

export default function EventIconSelector({ selectedIcon, onIconSelect }: EventIconSelectorProps) {
  const { colorScheme, theme } = useTheme()

  return (
    <div className={`p-4 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-700 border-gray-600' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="grid grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-2">
        {selectedIcons.map(({ key, label, iconKey }) => {
          // Determine the color based on the icon type
          const iconColor = getIconColor(key)
          
          return (
            <button
              key={key}
              type="button"
              onClick={() => onIconSelect(key)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors min-h-[60px] ${
                selectedIcon === key
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : theme === 'dark'
                    ? 'border-gray-600 bg-gray-600 text-gray-300 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
              title={label}
            >
              <CustomIcon 
                name={iconKey || key} 
                className="h-5 w-5 mb-1" 
                style={{ color: iconColor, fill: iconColor }}
              />
              <span className="text-xs text-center truncate w-full">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}