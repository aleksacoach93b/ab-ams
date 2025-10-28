'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { StickyNote, Plus, Edit, Trash2, Pin, Eye, EyeOff, User, Users, Check, X } from 'lucide-react'
import RichTextEditor from './RichTextEditor'

interface StaffMember {
  id: string
  name: string
  email: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface CoachNote {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
  visibleToStaff: {
    id: string
    canView: boolean
    staff: {
      id: string
      name: string
      email: string
    }
  }[]
}

interface CoachNotesProps {
  className?: string
}

export default function CoachNotes({ className = '' }: CoachNotesProps) {
  const { user } = useAuth()
  const { colorScheme, theme } = useTheme()
  const [notes, setNotes] = useState<CoachNote[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewNote, setShowNewNote] = useState(false)
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<{ [staffId: string]: boolean }>({})

  useEffect(() => {
    fetchNotes()
    fetchStaff()
  }, [])

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach-notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error('Error fetching coach notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach-notes/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const handleSaveNote = async (content: string, isPinned: boolean) => {
    if (!user?.id) {
      alert('You must be logged in to save notes')
      return
    }

    try {
      // Extract text content for title (first 50 characters)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const textContent = tempDiv.textContent || tempDiv.innerText || ''
      const title = textContent.trim().substring(0, 50) || 'Untitled Note'

      // Create staff access array from selected staff
      const staffAccess = Object.entries(selectedStaff).map(([staffId, canView]) => ({
        staffId,
        canView
      }))

      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          isPinned,
          staffAccess
        })
      })

      if (response.ok) {
        const newNote = await response.json()
        setNotes(prev => [newNote, ...prev])
        setShowNewNote(false)
        setSelectedStaff({})
        alert('Note saved successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to save note: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Error saving note')
    }
  }

  const handleUpdateNote = async (noteId: string, content: string, isPinned: boolean) => {
    try {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const textContent = tempDiv.textContent || tempDiv.innerText || ''
      const title = textContent.trim().substring(0, 50) || 'Untitled Note'

      // Create staff access array from selected staff
      const staffAccess = Object.entries(selectedStaff).map(([staffId, canView]) => ({
        staffId,
        canView
      }))

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/coach-notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          isPinned,
          staffAccess
        })
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => note.id === noteId ? updatedNote : note))
        setEditingNote(null)
        setSelectedStaff({})
        alert('Note updated successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to update note: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Error updating note')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/coach-notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
        alert('Note deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to delete note: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Error deleting note')
    }
  }

  const canManageNotes = () => {
    return user?.role === 'ADMIN' || user?.role === 'COACH'
  }

  if (loading) {
    return (
      <div className={`rounded-lg shadow-sm border p-6 ${className}`} style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg shadow-sm border ${className}`} style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
            Coach Notes
          </h2>
          {canManageNotes() && (
            <button
              onClick={() => setShowNewNote(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: colorScheme.primary, color: 'white' }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Note</span>
            </button>
          )}
        </div>

        {/* New Note Form */}
        {showNewNote && canManageNotes() && (
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-3" style={{ color: colorScheme.text }}>
                Staff Access Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staff.map((staffMember) => (
                  <div key={staffMember.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`staff-${staffMember.id}`}
                      checked={selectedStaff[staffMember.id] || false}
                      onChange={(e) => {
                        setSelectedStaff(prev => ({
                          ...prev,
                          [staffMember.id]: e.target.checked
                        }))
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label 
                      htmlFor={`staff-${staffMember.id}`}
                      className="text-sm font-medium"
                      style={{ color: colorScheme.text }}
                    >
                      {staffMember.name || staffMember.email}
                    </label>
                  </div>
                ))}
              </div>
              {staff.length === 0 && (
                <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                  No staff members found
                </p>
              )}
            </div>
            <RichTextEditor
              onSave={(content) => {
                handleSaveNote(content, false)
              }}
              onCancel={() => {
                setShowNewNote(false)
                setSelectedStaff({})
              }}
              placeholder="Enter a coach note..."
            />
          </div>
        )}

        {/* Edit Note Form */}
        {editingNote && canManageNotes() && (
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-3" style={{ color: colorScheme.text }}>
                Edit Note - Staff Access Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staff.map((staffMember) => (
                  <div key={staffMember.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`edit-staff-${staffMember.id}`}
                      checked={selectedStaff[staffMember.id] || false}
                      onChange={(e) => {
                        setSelectedStaff(prev => ({
                          ...prev,
                          [staffMember.id]: e.target.checked
                        }))
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label 
                      htmlFor={`edit-staff-${staffMember.id}`}
                      className="text-sm font-medium"
                      style={{ color: colorScheme.text }}
                    >
                      {staffMember.name || staffMember.email}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <RichTextEditor
              initialContent={editingNote.content}
              onSave={(content) => {
                handleUpdateNote(editingNote.id, content, false)
              }}
              onCancel={() => {
                setEditingNote(null)
                setSelectedStaff({})
              }}
              placeholder="Edit your coach note..."
            />
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 ? (
          <div 
            className="text-center py-12 rounded-lg border"
            style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border
            }}
          >
            <StickyNote 
              className="h-16 w-16 mx-auto mb-4"
              style={{ color: colorScheme.textSecondary }}
            />
            <h3 
              className="text-lg font-medium mb-2"
              style={{ color: colorScheme.text }}
            >
              No coach notes yet
            </h3>
            <p style={{ color: colorScheme.textSecondary }}>
              {canManageNotes() ? 'Add your first coach note' : 'No notes available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border"
                style={{ 
                  backgroundColor: colorScheme.surface,
                  borderColor: colorScheme.border
                }}
              >
                {/* Note Header */}
                <div 
                  className="flex items-center justify-between p-4 border-b"
                  style={{ borderColor: colorScheme.border }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                      <span 
                        className="text-sm font-medium"
                        style={{ color: colorScheme.text }}
                      >
                        {note.author.name || note.author.email}
                      </span>
                    </div>
                    <span 
                      className="text-xs"
                      style={{ color: colorScheme.textSecondary }}
                    >
                      {new Date(note.createdAt).toLocaleDateString()} 
                      {note.updatedAt !== note.createdAt && ' (edited)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {note.isPinned && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Pin className="h-3 w-3 mr-1" />
                        PINNED
                      </span>
                    )}
                    {note.visibleToStaff.length > 0 ? (
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${colorScheme.primary}20`,
                          color: colorScheme.primary
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {note.visibleToStaff.length} STAFF
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <EyeOff className="h-3 w-3 mr-1" />
                        COACH ONLY
                      </span>
                    )}
                    {canManageNotes() && (note.author.id === user?.id || user?.role === 'ADMIN') && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            // Initialize selected staff based on current note visibility
                            const currentStaffSelection: { [staffId: string]: boolean } = {}
                            note.visibleToStaff.forEach(access => {
                              currentStaffSelection[access.staff.id] = access.canView
                            })
                            setSelectedStaff(currentStaffSelection)
                            setEditingNote(note)
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          style={{ color: colorScheme.textSecondary }}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded hover:bg-red-100 transition-colors text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                <div className="p-4">
                  <h3 
                    className="font-medium mb-2"
                    style={{ color: colorScheme.text }}
                  >
                    {note.title}
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none mb-3"
                    style={{ color: colorScheme.textSecondary }}
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  
                  {/* Staff Access Info */}
                  {note.visibleToStaff.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: colorScheme.border }}>
                      <p className="text-xs font-medium mb-2" style={{ color: colorScheme.textSecondary }}>
                        Visible to staff:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {note.visibleToStaff.map((access) => (
                          <span
                            key={access.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {access.staff.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
