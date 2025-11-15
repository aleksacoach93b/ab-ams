'use client'

import React from 'react'
import { 
  Calendar, Target, Users, Heart, UtensilsCrossed, Dumbbell, Trophy, Zap, Stethoscope, Shield, Award, Star, Sparkles, Gift, Music, Video, Image, FileText, Download, Upload, Share, MessageCircle, Phone, Mail, Globe, Settings, Bell, Search, Sun, Moon, Cloud, TreePine, Leaf, Flower2, Flame, Droplets, Wrench, Hammer, Key, Palette, Brush, Scissors, CreditCard, Calculator, PieChart, LineChart, BarChart, Database, Server, Box, Package, ShoppingCart, TrendingUp, Activity, Home, Camera, Book, Clock, MapPin, Circle, Square, Triangle, Hexagon, Pentagon, Octagon, Car, Plane, Bus, Scale, Mic, Droplet, Smartphone, Laptop, Monitor, Battery, Headphones, File, Folder, Briefcase, Coffee, Lightbulb, Smile, ThumbsUp, Hand, Crown, Gem
} from 'lucide-react'

interface CustomIconProps {
  name: string
  className?: string
  style?: React.CSSProperties
}

// Map of Lucide icons
const lucideIcons: { [key: string]: any } = {
  Calendar, Target, Users, Heart, UtensilsCrossed, Dumbbell, Trophy, Zap, Stethoscope, Shield, Award, Star, Sparkles, Gift, Music, Video, Image, FileText, Download, Upload, Share, MessageCircle, Phone, Mail, Globe, Settings, Bell, Search, Sun, Moon, Cloud, TreePine, Leaf, Flower2, Flame, Droplets, Wrench, Hammer, Key, Palette, Brush, Scissors, CreditCard, Calculator, PieChart, LineChart, BarChart, Database, Server, Box, Package, ShoppingCart, TrendingUp, Activity, Home, Camera, Book, Clock, MapPin, Circle, Square, Triangle, Hexagon, Pentagon, Octagon, Car, Plane, Bus, Scale, Mic, Droplet, Smartphone, Laptop, Monitor, Battery, Headphones, File, Folder, Briefcase, Coffee, Lightbulb, Smile, ThumbsUp, Hand, Crown, Gem
}

// Custom SVG icons
const customIcons: { [key: string]: string } = {
  'FootballBall': '/icons/soccer-ball-new.svg',
  'SoccerPitch': '/icons/football-pitch-new.svg',
  'StopwatchWhistle': '/icons/stopwatch-whistle.svg',
  'ElectronicScale': '/icons/electronic-scale-final.svg',
  'Recovery': '/icons/recovery-new.svg',
  'Bus': '/icons/bus-new.svg',
  'Meeting': '/icons/meeting-new.svg',
  'BloodSample': '/icons/blood-sample-final.svg',
  'BedTime': '/icons/bed-time.svg',
  'MealPlate': '/icons/meal-plate.svg',
  'CoffeeCup': '/icons/coffee-cup.svg',
  'AmericanFootball': '/icons/american-football.svg',
  'Basketball': '/icons/basketball.svg',
  'TennisBall': '/icons/tennis-ball.svg',
  'Volleyball': '/icons/volleyball.svg',
  'WarmUp': '/icons/warm-up.svg',
  'Mobility': '/icons/mobility.svg'
}

// Helper function to convert hex color to CSS filter
const getColorFilter = (color: string) => {
  const colorMap: { [key: string]: string } = {
    '#EF4444': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)', // Red
    '#3B82F6': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(214deg) brightness(104%) contrast(97%)', // Blue
    '#10B981': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(142deg) brightness(104%) contrast(97%)', // Green
    '#F59E0B': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(38deg) brightness(104%) contrast(97%)', // Yellow
    '#8B5CF6': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(272deg) brightness(104%) contrast(97%)', // Purple
    '#F97316': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(18deg) brightness(104%) contrast(97%)', // Orange
    '#6366F1': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(240deg) brightness(104%) contrast(97%)', // Indigo
    '#DC2626': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)', // Dark Red
    '#B91C1C': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)', // Red
    '#EA580C': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(18deg) brightness(104%) contrast(97%)', // Orange
    '#059669': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(142deg) brightness(104%) contrast(97%)', // Green
    '#1D4ED8': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(214deg) brightness(104%) contrast(97%)', // Blue
    '#7C3AED': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(272deg) brightness(104%) contrast(97%)', // Purple
    '#06B6D4': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(180deg) brightness(104%) contrast(97%)', // Cyan
    '#92400E': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(25deg) brightness(104%) contrast(97%)', // Brown
    '#6B7280': 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(0deg) brightness(104%) contrast(97%)', // Gray
  }
  return colorMap[color] || 'none'
}

export default function CustomIcon({ name, className = "h-6 w-6", style }: CustomIconProps) {
  // Normalize icon name (remove spaces, handle case variations)
  const normalizedName = name?.trim() || 'Calendar'
  
  // Check if it's a custom SVG icon (case-insensitive)
  const customIconKey = Object.keys(customIcons).find(
    key => key.toLowerCase() === normalizedName.toLowerCase()
  )
  
  if (customIconKey) {
    console.log(`✅ Using custom icon: ${customIconKey} for "${normalizedName}"`)
    return (
      <img 
        src={customIcons[customIconKey]}
        alt={normalizedName}
        className={className}
        style={{
          ...style,
          objectFit: 'contain',
          filter: style?.color ? getColorFilter(style.color) : 'none',
          opacity: 1
        }}
        onError={(e) => {
          console.error(`❌ Failed to load icon: ${normalizedName} from ${customIcons[customIconKey]}`)
          // Don't hide, show Calendar fallback instead
          e.currentTarget.style.display = 'none'
          // This will trigger the fallback below
        }}
      />
    )
  }

  // Check if it's a Lucide icon (case-insensitive)
  const lucideIconKey = Object.keys(lucideIcons).find(
    key => key.toLowerCase() === normalizedName.toLowerCase()
  )
  
  if (lucideIconKey && lucideIcons[lucideIconKey]) {
    const IconComponent = lucideIcons[lucideIconKey]
    console.log(`✅ Using Lucide icon: ${lucideIconKey} for "${normalizedName}"`)
    return <IconComponent className={className} style={style} />
  }

  // Fallback to Calendar icon only if name is explicitly empty or undefined
  if (!name || name.trim() === '' || name === 'Calendar') {
    console.log(`⚠️ Using Calendar fallback for: "${normalizedName}"`)
    return <Calendar className={className} style={style} />
  }
  
  // If name exists but icon not found, log warning and use Calendar
  console.warn(`⚠️ Icon not found: "${normalizedName}", using Calendar fallback`)
  return <Calendar className={className} style={style} />
}
