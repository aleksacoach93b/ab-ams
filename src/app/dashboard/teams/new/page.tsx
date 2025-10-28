'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Users, Image } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function NewTeamPage() {
  const router = useRouter()
  const { colorScheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#dc2626'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Team created successfully:', result)
        router.push('/dashboard/teams')
      } else {
        const errorData = await response.json()
        console.error('❌ Error creating team:', errorData)
        const errorMessage = errorData.message || errorData.error || 'Failed to create team'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('❌ Error creating team:', error)
      alert('Network error: Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colorScheme.background }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md transition-colors"
            style={{ 
              backgroundColor: colorScheme.surface,
              color: colorScheme.text,
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colorScheme.text }}>
              Create New Team
            </h1>
            <p className="text-lg mt-2" style={{ color: colorScheme.textSecondary }}>
              Add a new team to your organization
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            className="rounded-lg border p-6"
            style={{ 
              backgroundColor: colorScheme.surface, 
              borderColor: colorScheme.border 
            }}
          >
            {/* Team Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Team Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter team name"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: colorScheme.background,
                  color: colorScheme.text,
                  borderColor: colorScheme.border,
                  focusRingColor: colorScheme.primary
                }}
                placeholder="Enter team description"
              />
            </div>

            {/* Team Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colorScheme.text }}>
                Team Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-12 h-12 rounded-md border cursor-pointer"
                  style={{ borderColor: colorScheme.border }}
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    color: colorScheme.text,
                    borderColor: colorScheme.border,
                    focusRingColor: colorScheme.primary
                  }}
                  placeholder="#dc2626"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-md font-medium transition-colors"
              style={{ 
                backgroundColor: colorScheme.surface,
                color: colorScheme.text,
                border: `1px solid ${colorScheme.border}`
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-md font-medium text-white transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: colorScheme.primary,
              }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Create Team</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
