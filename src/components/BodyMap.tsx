'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface BodyPartData {
  playerName: string
  intensity: number // 1-10 scale
}

interface BodyMapProps {
  data: Array<{ 
    playerName: string
    painfulAreas?: string
    soreAreas?: string
    muscleSoreness?: string // 1-10 for soreness
    painType?: string // might contain intensity info
    painfulAreasMap?: Record<string, number> // bodyPart -> scale (1-10)
    soreAreasMap?: Record<string, number> // bodyPart -> scale (1-10)
  }>
  type: 'pain' | 'soreness'
  view: 'front' | 'back'
}


export default function BodyMap({ data, type, view }: BodyMapProps) {
  const { colorScheme, theme } = useTheme()
  const svgRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load SVG file based on view
  useEffect(() => {
    const loadSVG = async () => {
      try {
        setLoading(true)
        // Use simple file names from public folder
        const svgFileName = view === 'front' ? 'FrontBody.svg' : 'BackBody.svg'
        
        // Load from public folder
        const response = await fetch(`/${svgFileName}`)
        
        if (response.ok) {
          const svgText = await response.text()
          setSvgContent(svgText)
        } else {
          // Fallback to TypeScript imports if SVG files don't exist
          const { FrontBodySVG } = await import('./svgs/FrontBodySVG')
          const { BackBodySVG } = await import('./svgs/BackBodySVG')
          setSvgContent(view === 'front' ? FrontBodySVG : BackBodySVG)
        }
      } catch (error) {
        console.error('Error loading SVG:', error)
        // Fallback to TypeScript imports
        try {
          const { FrontBodySVG } = await import('./svgs/FrontBodySVG')
          const { BackBodySVG } = await import('./svgs/BackBodySVG')
          setSvgContent(view === 'front' ? FrontBodySVG : BackBodySVG)
        } catch (importError) {
          console.error('Error loading fallback SVG:', importError)
        }
      } finally {
        setLoading(false)
      }
    }

    loadSVG()
  }, [view])

  // Normalize body part name for matching (remove extra spaces, lowercase, handle spelling variations)
  const normalizeBodyPartName = (name: string): string => {
    if (!name) return ''
    // Convert to lowercase and remove extra spaces
    let normalized = name.trim().toLowerCase().replace(/\s+/g, ' ')
    
    // Handle common spelling variations
    // Latissimus/Latisimus/Lattisimus -> latissimus (normalize all variations)
    normalized = normalized.replace(/latis{1,3}imus/gi, 'latissimus')
    // Handle "Latissimus Dorsi" variations
    normalized = normalized.replace(/latissimus\s+dorsi/gi, 'latissimus dorsi')
    
    // Handle "Achilles 2" -> "Achilles" (remove number suffix)
    normalized = normalized.replace(/\s+achilles\s+\d+/gi, ' achilles')
    normalized = normalized.replace(/achilles\s+\d+/gi, 'achilles')
    
    // Handle "Foot Back" -> "Foot" (remove "Back" suffix for back view)
    if (view === 'back') {
      normalized = normalized.replace(/\s+foot\s+back/gi, ' foot')
      normalized = normalized.replace(/foot\s+back/gi, 'foot')
    }
    
    // Handle "Back Head" -> "Top Head" (they refer to the same part)
    normalized = normalized.replace(/back\s+head/gi, 'top head')
    
    // Handle "Left Forearm Central" -> "Left Forearm Medial" (SVG doesn't have Central for Left, only Medial)
    if (normalized.includes('left forearm central')) {
      normalized = normalized.replace(/left\s+forearm\s+central/gi, 'left forearm medial')
    }
    
    // Handle "Back 4rd Finger" typo -> "Back 4th Finger"
    normalized = normalized.replace(/back\s+4rd\s+finger/gi, 'back 4th finger')
    
    return normalized
  }

  // Find matching SVG title for a CSV body part name
  const findMatchingSVGTitle = (csvBodyPart: string, svgTitles: string[]): string | null => {
    const normalizedCSV = normalizeBodyPartName(csvBodyPart)
    
    // First try exact match (case-insensitive)
    const exactMatch = svgTitles.find(title => 
      normalizeBodyPartName(title) === normalizedCSV
    )
    if (exactMatch) return exactMatch
    
    // Try partial match (contains)
    const partialMatch = svgTitles.find(title => {
      const normalizedTitle = normalizeBodyPartName(title)
      return normalizedTitle.includes(normalizedCSV) || normalizedCSV.includes(normalizedTitle)
    })
    if (partialMatch) return partialMatch
    
    // Try fuzzy match (similarity)
    let bestMatch: string | null = null
    let bestScore = 0
    
    svgTitles.forEach(title => {
      const normalizedTitle = normalizeBodyPartName(title)
      // Calculate similarity score
      let score = 0
      const csvWords = normalizedCSV.split(' ')
      const titleWords = normalizedTitle.split(' ')
      
      csvWords.forEach(csvWord => {
        titleWords.forEach(titleWord => {
          if (csvWord === titleWord) {
            score += 2 // Exact word match
          } else if (csvWord.includes(titleWord) || titleWord.includes(csvWord)) {
            score += 1 // Partial word match
          }
        })
      })
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = title
      }
    })
    
    // Only return if we have a reasonable match (at least 2 points)
    return bestScore >= 2 ? bestMatch : null
  }

  // Parse and aggregate body part data with player names and intensities
  const bodyPartData = React.useMemo(() => {
    const partsData: Record<string, BodyPartData[]> = {}
    
    // Get all SVG titles from the loaded SVG (we'll need to extract them)
    // For now, we'll use a mapping approach
    data.forEach((row) => {
      if (!row.playerName) return
      
      // Use the map with actual scale values from CSV columns
      const areasMap = type === 'pain' ? row.painfulAreasMap : row.soreAreasMap
      
      if (!areasMap || Object.keys(areasMap).length === 0) return
      
      // Add each body part with its scale value
      Object.entries(areasMap).forEach(([csvBodyPart, scale]) => {
        if (scale >= 1 && scale <= 10) {
          // Normalize the CSV body part name to match SVG titles
          const normalizedName = normalizeBodyPartName(csvBodyPart)
          
          // Try to find matching key or use normalized name
          // We'll match against SVG titles in the useEffect
          if (!partsData[normalizedName]) {
            partsData[normalizedName] = []
          }
          partsData[normalizedName].push({
            playerName: row.playerName,
            intensity: scale
          })
          
          // Also store with original CSV name for reference
          if (!partsData[csvBodyPart]) {
            partsData[csvBodyPart] = []
          }
          partsData[csvBodyPart].push({
            playerName: row.playerName,
            intensity: scale
          })
        }
      })
    })
    
    // Debug log
    if (Object.keys(partsData).length > 0) {
      console.log(`BodyMap ${type} ${view} - Parts Data:`, partsData)
    }
    
    return partsData
  }, [data, type, view])

  // Get color based on intensity (1-10 scale)
  // Light green for low (1-3), orange for medium (4-6), red for high (7-10)
  // Same colors as in the table for consistency
  const getColorForIntensity = (intensity: number): string => {
    if (intensity === 0) return 'transparent'
    if (intensity >= 7) return '#DC2626' // Red for high intensity (7-10) - same as table
    if (intensity >= 4) return '#F59E0B' // Orange for medium intensity (4-6) - same as table
    return '#86EFAC' // Light green for low intensity (1-3) - same as table
  }
  
  // Get sum of intensities for a body part (like Power BI - sum all values)
  const getSumIntensity = (players: BodyPartData[]): number => {
    if (players.length === 0) return 0
    return players.reduce((acc, p) => acc + p.intensity, 0)
  }
  
  // Get color based on sum intensity (for visualization)
  // Use average of sum to determine color, but display sum value
  // Same conditional formatting as table: >= 7 red, >= 4 orange, < 4 green
  const getColorForSum = (sum: number, playerCount: number): string => {
    if (sum === 0) return 'transparent'
    // Calculate average for color determination (same logic as table)
    const avg = sum / playerCount
    if (avg >= 7) return '#DC2626' // Red for high average (7-10) - same as table
    if (avg >= 4) return '#F59E0B' // Orange for medium average (4-6) - same as table
    return '#86EFAC' // Light green for low average (1-3) - same as table
  }

  // Apply styling to SVG elements
  useEffect(() => {
    if (!svgRef.current) return

    // Wait for DOM to be ready
    const applyStyles = () => {
      const svgElement = svgRef.current?.querySelector('svg')
      if (!svgElement) return

      // First, reset all elements to default state
      // All unmarked areas: light gray (same for both front and back views)
      // Face and Skin: darker gray (#b8c2d0)
      const allElements = svgElement.querySelectorAll('[title]')
      const lightGrayColor = '#E5E7EB' // Light gray for unmarked areas (both views)
      const faceAndSkinColor = '#b8c2d0' // Darker gray for Face and Skin
      
      allElements.forEach((element) => {
        const title = element.getAttribute('title')
        if (!title || title === 'Body' || title === 'Skin' || title === 'Back Head' || title === 'Back Skin') {
          return
        }

        // Check if this is Face and Skin - set lighter gray and skip further processing
        const isFaceOrSkin = title.toLowerCase().includes('face') || title.toLowerCase().includes('skin')
        
        if (isFaceOrSkin) {
          // Face and Skin: darker gray (#b8c2d0), never changes
          if (element instanceof SVGPathElement) {
            element.style.fill = faceAndSkinColor
            element.style.opacity = '1'
            element.removeAttribute('data-count')
            element.removeAttribute('data-sum')
          } else if (element instanceof SVGGElement) {
            const paths = element.querySelectorAll('path')
            paths.forEach((path) => {
              path.style.fill = faceAndSkinColor
              path.style.opacity = '1'
              path.removeAttribute('data-count')
              path.removeAttribute('data-sum')
            })
          } else {
            const paths = element.querySelectorAll('path')
            if (paths.length > 0) {
              paths.forEach((path) => {
                path.style.fill = faceAndSkinColor
                path.style.opacity = '1'
                path.removeAttribute('data-count')
                path.removeAttribute('data-sum')
              })
            }
          }
          return // Skip further processing for Face and Skin
        }

        // All other unmarked body parts use light gray (same for front and back)
        const resetColor = lightGrayColor
        const resetOpacity = '1'
        
        if (element instanceof SVGPathElement) {
          element.style.fill = resetColor
          element.style.opacity = resetOpacity
          element.removeAttribute('data-count')
          element.removeAttribute('data-sum')
        } else if (element instanceof SVGGElement) {
          const paths = element.querySelectorAll('path')
          paths.forEach((path) => {
            path.style.fill = resetColor
            path.style.opacity = resetOpacity
            path.removeAttribute('data-count')
            path.removeAttribute('data-sum')
          })
        } else {
          // Handle other element types
          const paths = element.querySelectorAll('path')
          if (paths.length > 0) {
            paths.forEach((path) => {
              path.style.fill = resetColor
              path.style.opacity = resetOpacity
              path.removeAttribute('data-count')
              path.removeAttribute('data-sum')
            })
          }
        }
      })

      // Remove all existing text labels
      const existingLabels = svgElement.querySelectorAll('[data-label]')
      existingLabels.forEach((label) => {
        label.remove()
      })

      // Now apply colors only to elements with players who reported something
      allElements.forEach((element) => {
        const title = element.getAttribute('title')
        if (!title || title === 'Body' || title === 'Skin' || title === 'Back Head' || title === 'Back Skin') {
          return
        }

        // Skip Face and Skin - they never change color
        const isFaceOrSkin = title.toLowerCase().includes('face') || title.toLowerCase().includes('skin')
        if (isFaceOrSkin) {
          return // Face and Skin always stay darker gray, never highlighted
        }

        // Try to find matching data using fuzzy matching
        let players: BodyPartData[] = []
        
        // First try exact match
        if (bodyPartData[title]) {
          players = bodyPartData[title]
        } else {
          // Try normalized match
          const normalizedTitle = normalizeBodyPartName(title)
          const matchingKey = Object.keys(bodyPartData).find(key => 
            normalizeBodyPartName(key) === normalizedTitle
          )
          if (matchingKey) {
            players = bodyPartData[matchingKey]
          } else {
            // Try partial/fuzzy match
            Object.keys(bodyPartData).forEach(key => {
              const normalizedKey = normalizeBodyPartName(key)
              if (normalizedKey.includes(normalizedTitle) || normalizedTitle.includes(normalizedKey)) {
                if (bodyPartData[key].length > 0) {
                  players = [...players, ...bodyPartData[key]]
                }
              }
            })
          }
        }
        
        if (players.length > 0) {
          // Get sum of intensities (like Power BI - sum all values)
          const sumIntensity = getSumIntensity(players)
          const color = getColorForSum(sumIntensity, players.length)
          
          // Apply color fill - same colors as table, full opacity for consistency
          if (element instanceof SVGPathElement) {
            element.style.fill = color
            element.style.opacity = '1' // Full opacity for consistent colors across devices
            element.style.fillOpacity = '1' // Ensure fill opacity is also set
            element.setAttribute('fill', color) // Set fill attribute for better cross-device compatibility
            element.setAttribute('opacity', '1')
            element.setAttribute('data-sum', sumIntensity.toString())
          } else if (element instanceof SVGGElement) {
            const paths = element.querySelectorAll('path')
            paths.forEach((path) => {
              path.style.fill = color
              path.style.opacity = '1' // Full opacity for consistent colors across devices
              path.style.fillOpacity = '1' // Ensure fill opacity is also set
              path.setAttribute('fill', color) // Set fill attribute for better cross-device compatibility
              path.setAttribute('opacity', '1')
              path.setAttribute('data-sum', sumIntensity.toString())
            })
          } else {
            // Handle other element types (circles, rects, etc.)
            const paths = element.querySelectorAll('path, circle, rect, polygon, ellipse')
            if (paths.length > 0) {
              paths.forEach((path) => {
                path.style.fill = color
                path.style.opacity = '1'
                path.style.fillOpacity = '1'
                path.setAttribute('fill', color)
                path.setAttribute('opacity', '1')
                path.setAttribute('data-sum', sumIntensity.toString())
              })
            } else {
              // Direct element styling
              element.style.fill = color
              element.style.opacity = '1'
              element.style.fillOpacity = '1'
              element.setAttribute('fill', color)
              element.setAttribute('opacity', '1')
              element.setAttribute('data-sum', sumIntensity.toString())
            }
          }

          // Add text label with sum value (like Power BI)
          try {
            const bbox = element.getBBox()
            const centerX = bbox.x + bbox.width / 2
            const centerY = bbox.y + bbox.height / 2

            // Create a group for the text
            const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
            textGroup.setAttribute('data-label', title)
            textGroup.style.pointerEvents = 'none'
            
            // Show sum value (like Power BI - e.g., 3+8=11)
            const displayText = sumIntensity.toString()
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.setAttribute('x', centerX.toString())
            text.setAttribute('y', centerY.toString())
            text.setAttribute('text-anchor', 'middle')
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('font-size', '16')
            text.setAttribute('font-weight', 'bold')
            text.setAttribute('fill', theme === 'dark' ? '#FFFFFF' : '#000000')
            text.textContent = displayText
            text.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
            
            textGroup.appendChild(text)
            element.parentElement?.appendChild(textGroup)
          } catch (error) {
            console.warn('Could not get bounding box for element:', title, error)
          }
        }
      })
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setTimeout(applyStyles, 0)
    })
  }, [bodyPartData, theme, view, type])

  if (loading || !svgContent) {
    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{ 
          backgroundColor: colorScheme.surface,
          borderRadius: '12px',
          padding: '16px'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colorScheme.primary }}></div>
          <p style={{ color: colorScheme.textSecondary }}>Loading body map...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={svgRef}
      key={`${view}-${type}`}
      className="w-full h-full"
      style={{ 
        backgroundColor: colorScheme.surface,
        borderRadius: '12px',
        padding: '16px',
        // Ensure consistent rendering across devices
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)' // Force hardware acceleration for consistent colors
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

