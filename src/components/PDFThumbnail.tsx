'use client'

import { useState, useEffect } from 'react'

interface PDFThumbnailProps {
  pdfUrl: string
  fileName: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}

export default function PDFThumbnail({ pdfUrl, fileName, className = '', onLoad, onError }: PDFThumbnailProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset states when URL changes
    setHasError(false)
    setIsLoading(true)
  }, [pdfUrl])

  const handleIframeLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleIframeError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  if (hasError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg ${className}`}>
        <div className="text-center p-6">
          <div className="text-5xl mb-4 animate-pulse">📄</div>
          <div className="text-sm font-bold mb-2 truncate px-2">{fileName}</div>
          <div className="text-xs opacity-80 mb-2">PDF Document</div>
          <div className="text-xs opacity-60">Click to view</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-lg ${className}`}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <div className="text-xs text-gray-600">Loading PDF...</div>
          </div>
        </div>
      )}
      
      {/* PDF Preview with clean styling - Try object tag first, fallback to iframe */}
      <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200">
        <object
          data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH&zoom=50`}
          type="application/pdf"
          className="w-full h-full border-0 rounded-lg"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`PDF Preview: ${fileName}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          {/* Fallback to iframe if object doesn't work */}
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH&zoom=50`}
            className="w-full h-full border-0 rounded-lg"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`PDF Preview: ${fileName}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px'
            }}
          />
        </object>
      </div>
    </div>
  )
}
