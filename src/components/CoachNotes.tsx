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
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [selectedNoteForVisibility, setSelectedNoteForVisibility] = useState<CoachNote | null>(null)

  useEffect(() => {
    fetchNotes()
    fetchStaff()
  }, [user?.id ?? null]) // Re-fetch when user changes (e.g., after login)

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
        console.log(`📋 [COACH NOTES FRONTEND] Received ${(data.notes || []).length} notes from API`)
        console.log(`📋 [COACH NOTES FRONTEND] Current user:`, { id: user?.id, role: user?.role, email: user?.email })
        
        // Sanitize notes data - ensure visibleToStaff is always properly formatted
        const sanitizedNotes = (data.notes || []).map((note: any) => ({
          ...note,
          visibleToStaff: Array.isArray(note.visibleToStaff) 
            ? note.visibleToStaff
                .filter((access: any) => 
                  access && 
                  access.staff && 
                  typeof access.staff === 'object' &&
                  (access.staff.name || access.staff.email || access.staff.id)
                )
                .map((access: any) => ({
                  ...access,
                  staff: {
                    id: access.staff.id || '',
                    name: access.staff.name || access.staff.email?.split('@')[0] || 'Unknown',
                    email: access.staff.email || ''
                  }
                }))
            : []
        }))
        
        console.log(`📋 [COACH NOTES FRONTEND] Setting ${sanitizedNotes.length} notes in state`)
        setNotes(sanitizedNotes)
      } else {
        console.error('❌ [COACH NOTES FRONTEND] Failed to fetch notes:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('   Error details:', errorData)
      }
    } catch (error) {
      console.error('❌ [COACH NOTES FRONTEND] Error fetching coach notes:', error)
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
        console.log('📋 Fetched staff for access control:', data.staff?.length || 0)
        setStaff(data.staff || [])
      } else {
        console.error('Failed to fetch staff:', response.status, response.statusText)
        setStaff([])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      setStaff([])
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
      <div className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold" style={{ color: colorScheme.text }}>
            Coach Notes
          </h2>
          {canManageNotes() && (
            <button
              onClick={() => setShowNewNote(true)}
              className="flex items-center justify-center sm:justify-start space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
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
              <h3 className="text-base sm:text-lg font-medium mb-3" style={{ color: colorScheme.text }}>
                Staff Access Control
              </h3>
              {staff.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
                        className="text-xs sm:text-sm font-medium truncate"
                        style={{ color: colorScheme.text }}
                      >
                        {staffMember.name || staffMember.email || 'Unknown Staff'}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border" style={{ borderColor: colorScheme.border, backgroundColor: colorScheme.surface }}>
                  <p className="text-sm mb-2" style={{ color: colorScheme.textSecondary }}>
                    No staff members found. Staff access control will be available once staff members are added.
                  </p>
                </div>
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
              <h3 className="text-base sm:text-lg font-medium mb-3" style={{ color: colorScheme.text }}>
                Edit Note - Staff Access Control
              </h3>
              {staff.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
                        className="text-xs sm:text-sm font-medium truncate"
                        style={{ color: colorScheme.text }}
                      >
                        {staffMember.name || staffMember.email || 'Unknown Staff'}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border" style={{ borderColor: colorScheme.border, backgroundColor: colorScheme.surface }}>
                  <p className="text-sm mb-2" style={{ color: colorScheme.textSecondary }}>
                    No staff members found. Staff access control will be available once staff members are added.
                  </p>
                </div>
              )}
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
            {notes
              .filter((note: any) => note && note.id) // Filter out invalid notes
              .map((note: any) => {
              // Ensure visibleToStaff is always an array and filter out invalid entries
              // Double-check to prevent any null/undefined access
              let safeVisibleToStaff: any[] = []
              
              try {
                if (note && note.visibleToStaff && Array.isArray(note.visibleToStaff)) {
                  safeVisibleToStaff = note.visibleToStaff
                    .filter((access: any) => {
                      if (!access || typeof access !== 'object') return false
                      if (!access.staff || typeof access.staff !== 'object') return false
                      // Ensure staff has at least id or email
                      return !!(access.staff?.id || access.staff?.email || access.staff?.name)
                    })
                    .map((access: any) => {
                      const staffId = access?.staff?.id || ''
                      const staffName = access?.staff?.name || ''
                      const staffEmail = access?.staff?.email || ''
                      
                      return {
                        id: access?.id || `access-${Date.now()}-${Math.random()}`,
                        canView: access?.canView !== false,
                        staff: {
                          id: staffId,
                          name: staffName || staffEmail?.split('@')[0] || 'Unknown Staff',
                          email: staffEmail || ''
                        }
                      }
                    })
                }
              } catch (error) {
                console.error('Error processing visibleToStaff:', error, note)
                safeVisibleToStaff = []
              }

              return (
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
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b gap-2 sm:gap-0"
                  style={{ borderColor: colorScheme.border }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-sm sm:text-base"
                      style={{ backgroundColor: colorScheme.primary }}
                    >
                      {note?.author?.name?.charAt(0)?.toUpperCase() || note?.author?.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    {/* Author Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate" style={{ color: colorScheme.text }}>
                        {note?.author?.name || note?.author?.email || 'Unknown Author'}
                      </p>
                      <p className="text-xs sm:text-sm truncate" style={{ color: colorScheme.textSecondary }}>
                        {note?.author?.email || ''}
                      </p>
                    </div>
                  </div>
                  {/* Date */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap block" style={{ color: colorScheme.textSecondary }}>
                      {new Date(note.createdAt).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </span>
                    {note.updatedAt !== note.createdAt && (
                      <span className="text-xs whitespace-nowrap block" style={{ color: colorScheme.textSecondary }}>(edited)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1 sm:gap-0">
                    {note.isPinned && (
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                        <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        PINNED
                      </span>
                    )}
                    {safeVisibleToStaff && safeVisibleToStaff.length > 0 ? (
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1">
                        <span 
                          className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                          style={{ 
                            backgroundColor: `${colorScheme.primary}20`,
                            color: colorScheme.primary
                          }}
                        >
                          <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          {safeVisibleToStaff.filter((a: any) => a && a.staff).length} {safeVisibleToStaff.filter((a: any) => a && a.staff).length === 1 ? 'STAFF' : 'STAFF'}
                        </span>
                        <div className="flex items-center space-x-0.5 sm:space-x-1 flex-wrap gap-0.5 sm:gap-0">
                          {safeVisibleToStaff
                            .filter((access: any) => access && access.staff && typeof access.staff === 'object')
                            .slice(0, 2)
                            .map((access: any) => {
                              const staffName = access?.staff?.name || ''
                              const staffEmail = access?.staff?.email || ''
                              const displayName = staffName ? staffName.split(' ')[0] : (staffEmail ? staffEmail.split('@')[0] : 'Staff')
                              
                              return (
                                <span
                                  key={access?.id || `access-${Math.random()}`}
                                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[60px] sm:max-w-none"
                                  style={{
                                    backgroundColor: `${colorScheme.primary}15`,
                                    color: colorScheme.textSecondary
                                  }}
                                  title={staffName || staffEmail || 'Unknown'}
                                >
                                  {displayName}
                                </span>
                              )
                            })}
                          {safeVisibleToStaff.filter((access: any) => access && access.staff && typeof access.staff === 'object').length > 2 && (
                            <span className="text-[10px] sm:text-xs" style={{ color: colorScheme.textSecondary }}>
                              +{safeVisibleToStaff.filter((access: any) => access && access.staff && typeof access.staff === 'object').length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span 
                        className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                        style={{ 
                          backgroundColor: `${colorScheme.textSecondary}20`,
                          color: colorScheme.textSecondary
                        }}
                      >
                        <EyeOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        NO ACCESS
                      </span>
                    )}
                    {canManageNotes() && (note?.author?.id === user?.id || user?.role === 'ADMIN') && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            // Refresh staff list before opening modal
                            await fetchStaff()
                            setSelectedNoteForVisibility(note)
                            setShowVisibilityModal(true)
                          }}
                          className="p-1 sm:p-1.5 rounded hover:bg-gray-100 transition-colors"
                          style={{ color: colorScheme.primary }}
                          title="Manage visibility"
                        >
                          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Initialize selected staff based on current note visibility
                            const currentStaffSelection: { [staffId: string]: boolean } = {}
                            const safeVisibleToStaff = Array.isArray(note.visibleToStaff) ? note.visibleToStaff : []
                            safeVisibleToStaff.forEach((access: any) => {
                              if (access && access.staff && access.staff.id) {
                                currentStaffSelection[access.staff.id] = access.canView !== false
                              }
                            })
                            setSelectedStaff(currentStaffSelection)
                            setEditingNote(note)
                          }}
                          className="p-1 sm:p-1.5 rounded hover:bg-gray-100 transition-colors"
                          style={{ color: colorScheme.textSecondary }}
                          title="Edit note"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNote(note.id)
                          }}
                          className="p-1 sm:p-1.5 rounded hover:bg-red-100 transition-colors text-red-600"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                {note.title && (
                  <div className="px-3 sm:px-4 sm:px-6 pt-4 pb-2">
                    <h3 className="font-semibold text-base sm:text-lg break-words" style={{ color: colorScheme.text }}>
                      {note.title}
                    </h3>
                  </div>
                )}

                {/* Note Content */}
                <div className="px-3 sm:px-4 sm:px-6 pb-3 sm:pb-4 sm:pb-6">
                  <div 
                    className="text-sm sm:text-base prose prose-sm sm:prose-base max-w-none note-content break-words mb-3"
                    style={{ color: colorScheme.textSecondary }}
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  
                  {/* Staff Access Info */}
                  {safeVisibleToStaff && Array.isArray(safeVisibleToStaff) && safeVisibleToStaff.length > 0 && (
                    <div className="mt-4 pt-3 border-t" style={{ borderColor: colorScheme.border }}>
                      <p className="text-xs sm:text-sm font-medium mb-2" style={{ color: colorScheme.textSecondary }}>
                        Visible to staff:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {safeVisibleToStaff
                          .filter((access: any) => access && access.staff && typeof access.staff === 'object')
                          .map((access: any) => {
                            const staffName = access?.staff?.name || ''
                            const staffEmail = access?.staff?.email || ''
                            const displayText = staffName || staffEmail || 'Unknown Staff'
                            
                            return (
                              <span
                                key={access?.id || `access-${Math.random()}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {displayText}
                              </span>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Visibility Modal - Same as Reports folder */}
        {showVisibilityModal && selectedNoteForVisibility && canManageNotes() && (
          <VisibilityManagerModal
            note={selectedNoteForVisibility}
            staff={staff}
            selectedStaff={selectedStaff}
            setSelectedStaff={setSelectedStaff}
            onCancel={() => {
              setShowVisibilityModal(false)
              setSelectedNoteForVisibility(null)
              setSelectedStaff({})
            }}
            onSuccess={async () => {
              await fetchNotes()
            }}
            colorScheme={colorScheme}
          />
        )}
      </div>
    </div>
  )
}

// Visibility Manager Modal Component - Same as Reports folder
function VisibilityManagerModal({ 
  note, 
  staff, 
  selectedStaff, 
  setSelectedStaff,
  onCancel, 
  onSuccess, 
  colorScheme 
}: any) {
  useEffect(() => {
    // Initialize with all staff unchecked
    const initialSelection: {[key: string]: boolean} = {}
    staff.forEach((staffMember: any) => {
      initialSelection[staffMember.id] = false
    })
    setSelectedStaff(initialSelection)
    
    // Then check those who have access
    if (note && note.visibleToStaff && Array.isArray(note.visibleToStaff)) {
      note.visibleToStaff.forEach((access: any) => {
        if (access && access.staff && access.staff.id) {
          initialSelection[access.staff.id] = access.canView !== false
        }
      })
    }
    setSelectedStaff(initialSelection)
  }, [staff, note, setSelectedStaff])

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      // Create staff access array from selected staff (same as Reports folder)
      const staffAccess = Object.entries(selectedStaff)
        .filter(([staffId, canView]) => canView) // Only include selected staff
        .map(([staffId, canView]) => ({
          staffId,
          canView
        }))

      console.log('=== FRONTEND DEBUG ===')
      console.log('Selected staff:', selectedStaff)
      console.log('Staff access data being sent:', staffAccess)
      console.log('Staff array:', staff)

      const response = await fetch(`/api/coach-notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          isPinned: note.isPinned,
          staffAccess: staffAccess
        })
      })

      if (response.ok) {
        const updatedNote = await response.json()
        console.log('✅ Visibility updated successfully:', updatedNote)
        onCancel()
        // Refresh data to show updated visibility without page reload
        if (onSuccess) {
          await onSuccess()
        }
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || 'Unknown error'
          console.error('❌ Error updating visibility:', errorData)
        } catch (e) {
          console.error('❌ Error parsing error response:', e)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        alert(`Failed to update visibility: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Error updating visibility:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error updating visibility: ${errorMessage}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="p-6 rounded-lg max-w-lg w-full mx-4"
        style={{ backgroundColor: colorScheme.surface }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: colorScheme.text }}>
          Manage Visibility
        </h2>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
            Staff Access Control
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staff.map((staffMember: any) => (
              <div key={staffMember.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`staff-${staffMember.id}`}
                  checked={selectedStaff[staffMember.id] || false}
                  onChange={(e) => {
                    setSelectedStaff((prev: any) => ({
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
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 px-4 rounded-lg font-medium"
              style={{ 
                backgroundColor: colorScheme.primary, 
                color: 'white' 
              }}
            >
              Save Visibility
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded-lg border font-medium"
              style={{ 
                backgroundColor: 'transparent', 
                borderColor: colorScheme.border,
                color: colorScheme.text
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
