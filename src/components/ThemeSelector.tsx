'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Palette, Check } from 'lucide-react'

const themes = [
  { name: 'Light', value: 'light', color: '#F8FAFC' },
  { name: 'Dark', value: 'dark', color: '#0F172A' },
  { name: 'Blue', value: 'blue', color: '#05E6E2' },
  { name: 'Green', value: 'green', color: '#26E624' },
  { name: 'Purple', value: 'purple', color: '#6B21A8' },
  { name: 'Red', value: 'red', color: '#DC2626' },
]

export default function ThemeSelector() {
  const { theme, setTheme, colorScheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [hasModal, setHasModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Check if any modal is open and reset isOpen state accordingly - ALWAYS RUN
  useEffect(() => {
    const checkForModals = () => {
      // Check for elements with fixed positioning that cover the screen
      const allElements = document.querySelectorAll('*')
      let foundModal = false
      
      for (const element of allElements) {
        // Skip our own elements
        if (element === dropdownRef.current || element === buttonRef.current || 
            (dropdownRef.current && element.contains(dropdownRef.current)) || 
            (buttonRef.current && element.contains(buttonRef.current))) {
          continue
        }
        
        const styles = window.getComputedStyle(element)
        const position = styles.position
        const zIndex = parseInt(styles.zIndex) || 0
        
        if (position === 'fixed') {
          const rect = element.getBoundingClientRect()
          const screenWidth = window.innerWidth
          const screenHeight = window.innerHeight
          const coverage = (rect.width * rect.height) / (screenWidth * screenHeight)
          
          // Check if it's our backdrop (has specific classes and z-index)
          const isOurBackdrop = element.classList.contains('fixed') && 
                                element.classList.contains('inset-0') && 
                                zIndex === 9998
          
          // If element has fixed inset-0 (covers full screen) and z-index >= 50, it's likely a modal
          const hasInset0 = element.classList.contains('inset-0') || 
                           (rect.left <= 0 && rect.top <= 0 && rect.width >= screenWidth * 0.9 && rect.height >= screenHeight * 0.9)
          
          // If element covers more than 80% of screen OR has inset-0 class, it's likely a modal
          if ((coverage > 0.8 || hasInset0) && zIndex >= 50 && !isOurBackdrop) {
            // Modal is open, ALWAYS ensure dropdown is closed
            foundModal = true
            setIsOpen(false)
            break
          }
        }
      }
      
      // Update hasModal state
      setHasModal(foundModal)
    }

    // Check immediately
    checkForModals()

    // Check periodically for modals (more frequently) - ALWAYS RUN
    const interval = setInterval(checkForModals, 50)

    // Also use MutationObserver to detect modals immediately when added
    const handleModalAdded = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            
            // Skip our own elements
            if (element === dropdownRef.current || element === buttonRef.current) {
              continue
            }
            
            const styles = window.getComputedStyle(element)
            const position = styles.position
            const zIndex = parseInt(styles.zIndex) || 0
            
            // Check if it's a modal (fixed inset-0 with z-index >= 50)
            if (position === 'fixed' && element.classList.contains('inset-0') && zIndex >= 50 && zIndex !== 9998) {
              setHasModal(true)
              setIsOpen(false)
              return
            }
            
            // Also check if element covers most of screen
            const rect = element.getBoundingClientRect()
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            const coverage = (rect.width * rect.height) / (screenWidth * screenHeight)
            
            if (position === 'fixed' && coverage > 0.8 && zIndex >= 50 && zIndex !== 9998) {
              setHasModal(true)
              setIsOpen(false)
              return
            }
          }
        }
      }
    }

    const observer = new MutationObserver(handleModalAdded)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, []) // Empty dependency array - always run

  // Close dropdown when clicking outside or when any modal opens
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
        // Also check if modal is open
        const allElements = document.querySelectorAll('*')
        for (const element of allElements) {
          if (element === dropdownRef.current || element === buttonRef.current) continue
          const styles = window.getComputedStyle(element)
          if (styles.position === 'fixed' && element.classList.contains('inset-0')) {
            const zIndex = parseInt(styles.zIndex) || 0
            if (zIndex >= 50 && zIndex !== 9998) {
              setHasModal(true)
              return
            }
          }
        }
        setHasModal(false)
      }
    }

    // Close dropdown when modal is added to DOM
    const handleModalOpen = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            
            // Skip our own elements
            if (element === dropdownRef.current || element === buttonRef.current || element.contains(dropdownRef.current) || element.contains(buttonRef.current)) {
              continue
            }
            
            // Check if added element is a modal (has fixed positioning and high z-index)
            const styles = window.getComputedStyle(element)
            const zIndex = parseInt(styles.zIndex) || 0
            const position = styles.position
            
            // If it's a fixed/absolute element with z-index higher than our dropdown, close
            if ((position === 'fixed' || position === 'absolute') && zIndex > 9999) {
              setIsOpen(false)
              return
            }
            
            // Check if element has inset-0 class (covers full screen)
            const hasInset0 = element.classList.contains('inset-0')
            
            // Check if element covers most of the screen (typical modal behavior)
            const rect = element.getBoundingClientRect()
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            const coverage = (rect.width * rect.height) / (screenWidth * screenHeight)
            
            // Check if it's our backdrop
            const isOurBackdrop = element.classList.contains('fixed') && 
                                  element.classList.contains('inset-0') && 
                                  zIndex === 9998
            
            // If element has inset-0 or covers more than 80% of screen and has fixed positioning, it's likely a modal
            if (position === 'fixed' && (hasInset0 || coverage > 0.8) && zIndex >= 50 && !isOurBackdrop) {
              setHasModal(true)
              setIsOpen(false)
              return
            }
            
            // Also check children for modals
            const modals = element.querySelectorAll?.('[role="dialog"], .modal, [data-modal="true"]')
            if (modals && modals.length > 0) {
              setIsOpen(false)
              return
            }
          }
        }
      }
    }
    
    // Also check periodically for any modals that might have been missed
    const checkForModals = () => {
      // Check for elements with fixed positioning that cover the screen
      const allElements = document.querySelectorAll('*')
      for (const element of allElements) {
        // Skip our own elements
        if (element === dropdownRef.current || element === buttonRef.current || element.contains(dropdownRef.current) || element.contains(buttonRef.current)) {
          continue
        }
        
        const styles = window.getComputedStyle(element)
        const position = styles.position
        const zIndex = parseInt(styles.zIndex) || 0
        
        if (position === 'fixed' && zIndex >= 50) {
          const rect = element.getBoundingClientRect()
          const screenWidth = window.innerWidth
          const screenHeight = window.innerHeight
          const coverage = (rect.width * rect.height) / (screenWidth * screenHeight)
          
          // Check if it's our backdrop
          const isOurBackdrop = element.classList.contains('fixed') && 
                                element.classList.contains('inset-0') && 
                                zIndex === 9998
          
          // Check if element has inset-0 or covers most of screen
          const hasInset0 = element.classList.contains('inset-0') || 
                           (rect.left <= 0 && rect.top <= 0 && rect.width >= screenWidth * 0.9 && rect.height >= screenHeight * 0.9)
          
          // If element covers more than 80% of screen OR has inset-0, it's likely a modal
          if ((coverage > 0.8 || hasInset0) && !isOurBackdrop) {
            setHasModal(true)
            setIsOpen(false)
            return
          }
        }
      }
      // No modal found in this check
      setHasModal(false)
    }

    // Listen for clicks outside
    document.addEventListener('mousedown', handleClickOutside, true)
    
    // Use MutationObserver to detect when modals are added
    const observer = new MutationObserver(handleModalOpen)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Also check periodically for modals
    const modalCheckInterval = setInterval(checkForModals, 100)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      observer.disconnect()
      clearInterval(modalCheckInterval)
    }
  }, [isOpen])

  // Direct check for modal in render (for immediate feedback)
  const checkModalDirectly = () => {
    if (typeof window === 'undefined') return false
    
    const allElements = document.querySelectorAll('*')
    for (const element of allElements) {
      // Skip our own elements
      if (element === dropdownRef.current || element === buttonRef.current) {
        continue
      }
      
      const styles = window.getComputedStyle(element)
      const position = styles.position
      const zIndex = parseInt(styles.zIndex) || 0
      
      // Check if it's a modal (fixed inset-0 with z-index >= 50)
      if (position === 'fixed' && element.classList.contains('inset-0') && zIndex >= 50 && zIndex !== 9998) {
        return true
      }
      
      // Also check if element covers most of screen
      if (position === 'fixed' && zIndex >= 50 && zIndex !== 9998) {
        const rect = element.getBoundingClientRect()
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight
        const coverage = (rect.width * rect.height) / (screenWidth * screenHeight)
        
        if (coverage > 0.8) {
          return true
        }
      }
    }
    return false
  }

  const modalIsOpen = checkModalDirectly() || hasModal
  const shouldHighlight = isOpen && !modalIsOpen

  return (
    <div 
      className="relative z-[10000]"
      style={{
        // Hide entire container when modal is open (except when ThemeSelector dropdown is open)
        display: modalIsOpen && !isOpen ? 'none' : 'block',
        visibility: modalIsOpen && !isOpen ? 'hidden' : 'visible',
      }}
    >
      <button
        ref={buttonRef}
        onClick={() => {
          // Check if any modal is open before opening dropdown
          const modalOpen = checkModalDirectly()
          
          if (modalOpen) {
            setIsOpen(false)
            setHasModal(true)
          } else {
            setIsOpen(!isOpen)
            setHasModal(false)
          }
        }}
        className="p-2 rounded-md transition-colors hover:opacity-70 relative z-[10001]"
        style={{ 
          backgroundColor: shouldHighlight ? `${colorScheme.primary}20` : 'transparent',
          color: colorScheme.text,
        }}
        title="Change theme"
      >
        <Palette className="h-5 w-5" style={{ color: colorScheme.text }} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          />
          
          {/* Theme selector - Absolute positioning relative to button, fixed on mobile */}
          <div 
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 sm:right-0 sm:top-full sm:mt-2 w-56 sm:w-48 rounded-lg shadow-xl border z-[9999]"
            style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border,
              maxWidth: 'calc(100vw - 2rem)', // Prevent overflow on mobile
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="p-2">
              <div className="px-3 py-2 text-sm font-medium border-b"
                   style={{ 
                     color: colorScheme.textSecondary,
                     borderColor: colorScheme.border 
                   }}>
                Choose Theme
              </div>
              
              <div className="py-1">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => {
                      setTheme(themeOption.value as any)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors hover:bg-opacity-20"
                    style={{ 
                      color: colorScheme.text,
                      backgroundColor: theme === themeOption.value ? colorScheme.primary : 'transparent'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2"
                        style={{ 
                          backgroundColor: themeOption.color,
                          borderColor: colorScheme.border
                        }}
                      />
                      <span>{themeOption.name}</span>
                    </div>
                    
                    {theme === themeOption.value && (
                      <Check className="h-4 w-4" style={{ color: colorScheme.primaryText || 'white' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
