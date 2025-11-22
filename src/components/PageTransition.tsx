'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    setIsTransitioning(true)
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div 
      className="page-transition"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.3s ease-out'
      }}
    >
      {displayChildren}
    </div>
  )
}

