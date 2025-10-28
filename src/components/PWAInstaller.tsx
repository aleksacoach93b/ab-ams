'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface PWAInstallerProps {
  onClose?: () => void
}

export default function PWAInstaller({ onClose }: PWAInstallerProps) {
  const { colorScheme } = useTheme()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleClose = () => {
    setShowInstallPrompt(false)
    onClose?.()
  }

  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="p-4 rounded-2xl shadow-2xl border backdrop-blur-md"
           style={{ 
             backgroundColor: `${colorScheme.surface}CC`,
             borderColor: colorScheme.border 
           }}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: `${colorScheme.primary}20` }}>
              <Download className="h-6 w-6" style={{ color: colorScheme.primary }} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1" style={{ color: colorScheme.text }}>
              Install AB AMS
            </h3>
            <p className="text-sm mb-3" style={{ color: colorScheme.textSecondary }}>
              Install our app for a better experience with offline access and push notifications.
            </p>
            
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex items-center space-x-1 text-xs" style={{ color: colorScheme.textSecondary }}>
                <Smartphone className="h-3 w-3" />
                <span>Mobile</span>
              </div>
              <div className="flex items-center space-x-1 text-xs" style={{ color: colorScheme.textSecondary }}>
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: 'white'
                }}
              >
                Install App
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg transition-colors hover:bg-opacity-20"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
