'use client'

import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  const { colorScheme } = useTheme()

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" style={{ color: colorScheme.success }} />
      case 'error':
        return <AlertCircle className="h-5 w-5" style={{ color: colorScheme.error }} />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" style={{ color: colorScheme.warning }} />
      case 'info':
        return <Info className="h-5 w-5" style={{ color: colorScheme.info }} />
      default:
        return <Info className="h-5 w-5" style={{ color: colorScheme.info }} />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return `${colorScheme.success}15`
      case 'error':
        return `${colorScheme.error}15`
      case 'warning':
        return `${colorScheme.warning}15`
      case 'info':
        return `${colorScheme.info}15`
      default:
        return `${colorScheme.info}15`
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return colorScheme.success
      case 'error':
        return colorScheme.error
      case 'warning':
        return colorScheme.warning
      case 'info':
        return colorScheme.info
      default:
        return colorScheme.info
    }
  }

  return (
    <div
      className="card-fade-in flex items-start space-x-3 p-4 rounded-lg border-2 shadow-lg min-w-[300px] max-w-[400px] animate-slide-in"
      style={{
        backgroundColor: colorScheme.surface,
        borderColor: getBorderColor(),
        boxShadow: `0 4px 12px -2px ${getBorderColor()}40`
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: colorScheme.text }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 ml-2 p-1 rounded hover:bg-opacity-20 transition-colors"
        style={{ color: colorScheme.textSecondary }}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

