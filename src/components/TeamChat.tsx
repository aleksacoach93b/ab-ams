'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Users,
  Search,
  Filter,
  X,
  Check,
  CheckCheck,
  Clock,
  Plus,
  Settings,
  FileText,
  Download,
  Image as ImageIcon,
  ExternalLink,
  Eye
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  senderRole: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'system'
  status: 'sending' | 'sent' | 'delivered' | 'read'
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  fileInfo?: {
    fileName: string
    fileSize: number
    fileType: string
    fileUrl?: string
  }
}

interface ChatRoom {
  id: string
  name: string
  type: 'group' | 'direct'
  participants: {
    id: string
    name: string
    role: string
    avatar?: string
    isOnline: boolean
  }[]
  lastMessage?: Message
  unreadCount: number
}

interface TeamChatProps {
  isOpen: boolean
  onClose: () => void
}

export default function TeamChat({ isOpen, onClose }: TeamChatProps) {
  const { colorScheme } = useTheme()
  const { user } = useAuth()
  const [activeRoom, setActiveRoom] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showRoomDropdown, setShowRoomDropdown] = useState<string | null>(null)
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])

  useEffect(() => {
    // Load messages for active room only when a valid DB room id is selected
    if (!activeRoom) return
    const roomExists = chatRooms.some(r => r.id === activeRoom)
    if (!roomExists) return
    loadMessages(activeRoom)
  }, [activeRoom, chatRooms])

  useEffect(() => {
    // Load real users and create initial chat rooms when component mounts
    loadRealUsersAndCreateChatRooms()
  }, [])

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreOptions) {
        setShowMoreOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOptions])

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const loadRealUsersAndCreateChatRooms = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      // Load chat rooms from database
      const response = await fetch('/api/chat/rooms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const rooms = await response.json()
        console.log('Fetched chat rooms from database:', rooms)
        
        setChatRooms(rooms)
        
        // Set first room as active if available, otherwise clear activeRoom
        if (rooms.length > 0) {
          setActiveRoom(rooms[0].id)
        } else {
          setActiveRoom('')
        }
      } else {
        console.error('Failed to fetch chat rooms:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error)
    }
  }

  const loadMessages = async (roomId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const messages = await response.json()
        console.log('Fetched messages for room:', roomId, messages)
        
        // Parse messages and add file info
        const parsedMessages = messages.map((message: any) => {
          // If message has fileUrl, it's a file message
          if (message.fileUrl) {
            return {
              ...message,
              type: 'file' as const,
              fileInfo: {
                fileName: message.fileName || 'Unknown file',
                fileSize: message.fileSize || 0,
                fileType: message.fileType || 'application/octet-stream',
                fileUrl: message.fileUrl
              }
            }
          }
          
          // Check if message content looks like a PDF
          const pdfInfo = parsePDFMessage(message.content)
          if (pdfInfo.isPDF) {
            return {
              ...message,
              type: 'file' as const,
              fileInfo: {
                fileName: pdfInfo.fileName,
                fileSize: pdfInfo.fileSize,
                fileType: pdfInfo.fileType
              }
            }
          }
          
          return message
        })
        
        setMessages(parsedMessages)
      } else {
        console.error('Failed to fetch messages:', response.status, response.statusText)
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    // Check if user has access to the active room
    if (!activeRoom) {
      console.error('No active room selected')
      return
    }

    const hasAccess = chatRooms.some(room => room.id === activeRoom)
    if (!hasAccess) {
      console.error('User does not have access to this chat room')
      alert('You do not have access to this chat room')
      return
    }

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Check if message contains PDF file name pattern
    const pdfInfo = parsePDFMessage(messageContent)

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      content: messageContent,
      senderId: user?.id || '1',
      senderName: user?.name || 'You',
      senderRole: user?.role || 'COACH',
      timestamp: new Date().toISOString(),
      type: pdfInfo.isPDF ? 'file' : 'text',
      status: 'sending',
      fileInfo: pdfInfo.isPDF ? {
        fileName: pdfInfo.fileName,
        fileSize: pdfInfo.fileSize,
        fileType: pdfInfo.fileType
      } : undefined
    }

    setMessages(prev => [...prev, tempMessage])

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/chat/rooms/${activeRoom}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: 'text'
        })
      })

      if (response.ok) {
        const sentMessage = await response.json()
        console.log('Message sent successfully:', sentMessage)
        
        // Replace temp message with real message
        setMessages(prev => 
          prev.map(m => 
            m.id === tempMessage.id 
              ? { ...sentMessage, status: 'delivered' }
              : m
          )
        )
      } else {
        console.error('Failed to send message:', response.status, response.statusText)
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
        setNewMessage(messageContent) // Restore message content
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      setNewMessage(messageContent) // Restore message content
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chatRoomId', activeRoom)

      // Upload file to server
      console.log('Starting file upload...', { fileName: file.name, fileSize: file.size, fileType: file.type })
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing')
      
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      console.log('Upload response status:', response.status)
      console.log('Upload response ok:', response.ok)

      if (response.ok) {
        const uploadResult = await response.json()
        console.log('Upload result:', uploadResult)
        
        // Send file message to API to save in database
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const messageResponse = await fetch(`/api/chat/rooms/${activeRoom}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: `📎 ${file.name}`,
                messageType: 'file',
                fileUrl: uploadResult.fileUrl,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              })
            })

            if (messageResponse.ok) {
              const savedMessage = await messageResponse.json()
              console.log('File message saved to database:', savedMessage)
              
              // Use the message from database
              setMessages(prev => [...prev, savedMessage])
            } else {
              throw new Error('Failed to save file message')
            }
          } catch (error) {
            console.error('Error saving file message to database:', error)
            // Fallback: add message to UI without saving
            const fileMessage: Message = {
              id: String(Date.now()),
              senderId: user?.id || '1',
              senderName: user?.name || 'You',
              senderRole: user?.role || 'ADMIN',
              content: `📎 ${file.name}`,
              timestamp: new Date().toISOString(),
              type: 'file',
              status: 'delivered',
              fileInfo: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileUrl: uploadResult.fileUrl
              }
            }
            setMessages(prev => [...prev, fileMessage])
          }
        } else {
          // No token, just add to UI
          const fileMessage: Message = {
            id: String(Date.now()),
            senderId: user?.id || '1',
            senderName: user?.name || 'You',
            senderRole: user?.role || 'ADMIN',
            content: `📎 ${file.name}`,
            timestamp: new Date().toISOString(),
            type: 'file',
            status: 'delivered',
            fileInfo: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              fileUrl: uploadResult.fileUrl
            }
          }
          setMessages(prev => [...prev, fileMessage])
        }
        
        console.log('File uploaded successfully:', file.name, 'URL:', uploadResult.fileUrl)
      } else {
        // Fallback: create file message without upload
        console.warn('Upload failed, creating file message without URL')
        console.log('Response status:', response.status)
        console.log('Response statusText:', response.statusText)
        
        // Try to get error message from response
        try {
          const errorData = await response.json()
          console.log('Error response:', errorData)
        } catch (e) {
          console.log('Could not parse error response')
        }
        
        const fileMessage: Message = {
          id: String(Date.now()),
          senderId: user?.id || '1',
          senderName: user?.name || 'You',
          senderRole: user?.role || 'ADMIN',
          content: `📎 ${file.name}`,
          timestamp: new Date().toISOString(),
          type: 'file',
          status: 'delivered',
          fileInfo: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
            // No fileUrl - will show as non-downloadable
          }
        }
        
        setMessages(prev => [...prev, fileMessage])
        console.log('File message created (no upload):', file.name)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      
      // Fallback: create file message without upload
      const fileMessage: Message = {
        id: String(Date.now()),
        senderId: user?.id || '1',
        senderName: user?.name || 'You',
        senderRole: user?.role || 'ADMIN',
        content: `📎 ${file.name}`,
        timestamp: new Date().toISOString(),
        type: 'file',
        status: 'delivered',
        fileInfo: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
          // No fileUrl - will show as non-downloadable
        }
      }
      
      setMessages(prev => [...prev, fileMessage])
      console.log('File message created (fallback):', file.name)
    } finally {
      setUploadingFile(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const parsePDFMessage = (messageContent: string) => {
    // Check if message contains PDF file name pattern
    // Look for .pdf extension anywhere in the message
    const pdfPattern = /([^\\n]+\.pdf)/i
    const sizePattern = /(\d+\.?\d*)\s*(KB|MB|GB)/i
    
    const pdfMatch = messageContent.match(pdfPattern)
    const sizeMatch = messageContent.match(sizePattern)
    
    if (pdfMatch) {
      // Extract just the filename
      let fileName = pdfMatch[1].trim()
      
      // Convert size to bytes for consistency
      let sizeInBytes = 0
      if (sizeMatch) {
        const sizeValue = parseFloat(sizeMatch[1])
        const sizeUnit = sizeMatch[2].toUpperCase()
        
        switch (sizeUnit) {
          case 'KB':
            sizeInBytes = sizeValue * 1024
            break
          case 'MB':
            sizeInBytes = sizeValue * 1024 * 1024
            break
          case 'GB':
            sizeInBytes = sizeValue * 1024 * 1024 * 1024
            break
        }
      }
      
      return {
        isPDF: true,
        fileName,
        fileSize: sizeInBytes,
        fileType: 'application/pdf'
      }
    }
    
    return { isPDF: false }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />
    } else if (fileType.includes('image')) {
      return <ImageIcon className="h-5 w-5" style={{ color: colorScheme.primary }} />
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const renderFileMessage = (message: Message) => {
    if (!message.fileInfo) return null

    const { fileName, fileSize, fileType, fileUrl } = message.fileInfo
    const isPDF = fileType.includes('pdf')
    const isImage = fileType.includes('image')
    
    console.log('Rendering file message:', { fileName, fileUrl, hasUrl: !!fileUrl })

    return (
      <div className="flex items-center space-x-3 p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow" 
           style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
        <div className="flex-shrink-0">
          {getFileIcon(fileType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: colorScheme.text }}>
            {fileName}
          </p>
          <p className="text-xs mt-1" style={{ color: colorScheme.textSecondary }}>
            {formatFileSize(fileSize)} • {fileType.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Open in new window button - for PDFs and Images */}
          {(isPDF || isImage) && fileUrl && (
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="p-2.5 rounded-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#10B981' }}
              title={isPDF ? "View PDF in new tab" : "View image in new tab"}
            >
              <Eye className="h-4 w-4 text-white" />
            </button>
          )}
          {/* Download button */}
          {fileUrl && (
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = fileUrl
                link.download = fileName
                link.target = '_blank'
                link.rel = 'noopener noreferrer'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
              className="p-2.5 rounded-lg hover:bg-opacity-90 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#3B82F6' }}
              title="Download file"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>
    )
  }

  const handleMoreOptions = () => {
    setShowMoreOptions(!showMoreOptions)
  }

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages in this chat?')) {
      setMessages([])
      setShowMoreOptions(false)
    }
  }

  const handleLeaveChat = () => {
    if (confirm('Are you sure you want to leave this chat room?')) {
      // Remove user from chat room
      setChatRooms(prev => prev.map(room => 
        room.id === activeRoom 
          ? {
              ...room,
              participants: room.participants.filter(p => p.id !== user?.id)
            }
          : room
      ))
      setActiveRoom('general')
      setShowMoreOptions(false)
    }
  }

  const startEditingMessage = (messageId: string, currentText: string) => {
    setEditingMessage(messageId)
    setEditText(currentText)
  }

  const saveEditedMessage = () => {
    if (editingMessage && editText.trim()) {
      setMessages(prev => 
        prev.map(m => 
          m.id === editingMessage 
            ? { ...m, content: editText.trim() }
            : m
        )
      )
      setEditingMessage(null)
      setEditText('')
    }
  }

  const cancelEditing = () => {
    setEditingMessage(null)
    setEditText('')
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      console.log('🗑️ Deleting message:', messageId)

      // Call API to delete message from database
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Message deleted successfully from database')
        
        // Remove from frontend state
        setMessages(prev => prev.filter(m => m.id !== messageId))
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to delete message:', errorData.message)
        alert(`Failed to delete message: ${errorData.message}`)
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error)
      alert('Error deleting message. Please try again.')
    }
  }

  const createNewChatRoom = async (roomName: string) => {
    if (roomName.trim()) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('No authentication token found')
          return
        }

        const response = await fetch('/api/chat/rooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: roomName.trim(),
            type: 'group',
            participantIds: [] // Only creator for now
          })
        })

        if (response.ok) {
          const newRoom = await response.json()
          console.log('Created new chat room:', newRoom)
          setChatRooms(prev => [...prev, newRoom])
          setActiveRoom(newRoom.id)
        } else {
          const errorData = await response.json()
          console.error('Failed to create chat room:', response.status, response.statusText)
          alert(`Failed to create chat room: ${errorData.message || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error creating chat room:', error)
      }
    }
  }

  const deleteChatRoom = async (roomId: string) => {
    if (!roomId) return

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      console.log('🗑️ Deleting chat room:', roomId)

      // Call API to delete chat room from database
      const response = await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Chat room deleted successfully from database')
        
        // Remove from frontend state
        setChatRooms(prev => prev.filter(room => room.id !== roomId))
        
        // Clear active room if it was the deleted one
        if (activeRoom === roomId) {
          setActiveRoom('')
          setMessages([])
        }
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to delete chat room:', errorData.message)
        alert(`Failed to delete chat room: ${errorData.message}`)
      }
    } catch (error) {
      console.error('❌ Error deleting chat room:', error)
      alert('Error deleting chat room. Please try again.')
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      console.log('🔍 Starting to fetch available users...')
      
      // Get token from localStorage
      const token = localStorage.getItem('token')
      console.log('🔑 Token found:', token ? 'Yes' : 'No')
      
      if (!token) {
        console.error('❌ No authentication token found')
        setAvailableUsers([])
        return
      }

      console.log('📡 Making API request to /api/users...')
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📊 Response status:', response.status)
      
      if (response.ok) {
        const users = await response.json()
        console.log('✅ Fetched users from database:', users)
        console.log('📊 Total users:', users.length)
        
        // Filter out inactive users and only show PLAYER, STAFF, and COACH roles
        const activeUsers = users.filter((user: any) => 
          user.isActive && ['PLAYER', 'STAFF', 'COACH'].includes(user.role)
        )
        console.log('👥 Active users (PLAYER, STAFF, COACH):', activeUsers)
        console.log('📊 Active users count:', activeUsers.length)
        
        setAvailableUsers(activeUsers)
        console.log('✅ Available users state updated')
      } else {
        console.error('❌ Failed to fetch users:', response.status, response.statusText)
        setAvailableUsers([])
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      setAvailableUsers([])
    }
  }

  const addMembersToChat = async () => {
    if (selectedUsers.length > 0) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('No authentication token found')
          return
        }

        const response = await fetch(`/api/chat/rooms/${activeRoom}/participants`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userIds: selectedUsers
          })
        })

        if (response.ok) {
          const newMembers = await response.json()
          console.log('Added members to chat room:', newMembers)
          
          // Update the chat room with new members
          setChatRooms(prev => prev.map(room => 
            room.id === activeRoom 
              ? {
                  ...room,
                  participants: [...room.participants, ...newMembers]
                }
              : room
          ))

          setSelectedUsers([])
          setShowAddMembersModal(false)
        } else {
          console.error('Failed to add members to chat room:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error adding members to chat room:', error)
      }
    }
  }

  const removeMemberFromChat = (memberId: string) => {
    setChatRooms(prev => prev.map(room => 
      room.id === activeRoom 
        ? {
            ...room,
            participants: room.participants.filter(p => p.id !== memberId)
          }
        : room
    ))
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="h-3 w-3" style={{ color: colorScheme.primary }} />
      default:
        return null
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 1000 * 60) return 'Just now'
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m ago`
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h ago`
    return date.toLocaleDateString()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'COACH': return '#3B82F6'
      case 'ADMIN': return '#EF4444'
      case 'STAFF': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" 
         style={{ backgroundColor: colorScheme.surface }}>
      <div className="w-full h-full flex flex-col overflow-hidden"
           style={{ 
             backgroundColor: colorScheme.surface
           }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shadow-sm flex-shrink-0" 
             style={{ 
               backgroundColor: colorScheme.surface,
               borderColor: colorScheme.border 
             }}>
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6" style={{ color: colorScheme.primary }} />
            <h2 className="text-xl font-bold" style={{ color: colorScheme.text }}>
              Team Chat
            </h2>
          </div>
          <button onClick={onClose}
                  className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ color: colorScheme.textSecondary }}
                  title="Close Chat">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Chat Rooms - Hidden on mobile */}
          <div className="hidden sm:flex w-80 border-r flex-col" 
               style={{ borderColor: colorScheme.border }}>
            
            {/* Search and New Chat */}
            <div className="p-4 border-b" style={{ borderColor: colorScheme.border }}>
              {/* Only show New Chat button for admins */}
              {user && user.role === 'ADMIN' && (
                <div className="flex items-center space-x-2 mb-3">
                  <button
                    onClick={() => {
                      const newRoomName = prompt('Enter new chat room name:')
                      if (newRoomName && newRoomName.trim()) {
                        createNewChatRoom(newRoomName)
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg font-medium transition-colors hover:scale-105"
                    style={{ 
                      backgroundColor: colorScheme.primary,
                      color: colorScheme.primaryText || 'white'
                    }}
                    title="Create New Chat"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    New Chat
                  </button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                        style={{ color: colorScheme.textSecondary }} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: colorScheme.background,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`,
                    focusRingColor: colorScheme.primary
                  }}
                />
              </div>
            </div>

            {/* Chat Rooms List */}
            <div className="flex-1 overflow-y-auto">
              {chatRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-50" style={{ color: colorScheme.textSecondary }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: colorScheme.text }}>
                    You are not added to any chat
                  </h3>
                  <p className="text-sm opacity-75" style={{ color: colorScheme.textSecondary }}>
                    Contact administrator to add you to a chat room
                  </p>
                </div>
              ) : (
                chatRooms.map((room) => (
                <div
                  key={room.id}
                  className={`p-4 border-b cursor-pointer transition-colors group relative ${
                    activeRoom === room.id ? 'bg-opacity-50' : 'hover:bg-opacity-20'
                  }`}
                  style={{ 
                    borderColor: colorScheme.border,
                    backgroundColor: activeRoom === room.id ? colorScheme.primary : 'transparent'
                  }}
                >
                  <div 
                    className="flex items-center space-x-3"
                    onClick={() => setActiveRoom(room.id)}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white"
                           style={{ backgroundColor: colorScheme.primary }}>
                        {room.name.charAt(0)}
                      </div>
                      {room.participants.some(p => p.isOnline) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate" 
                            style={{ color: activeRoom === room.id ? (colorScheme.primaryText || 'white') : colorScheme.text }}>
                          {room.name}
                        </h3>
                        {room.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm truncate mt-1" 
                         style={{ color: activeRoom === room.id ? 'rgba(255,255,255,0.8)' : colorScheme.textSecondary }}>
                        {room.lastMessage?.content || 'No messages yet'}
                      </p>
                      <p className="text-xs mt-1" 
                         style={{ color: activeRoom === room.id ? 'rgba(255,255,255,0.6)' : colorScheme.textSecondary }}>
                        {room.lastMessage ? formatTime(room.lastMessage.timestamp) : ''}
                      </p>
                    </div>
                  </div>
                  
                  {/* Room Actions - Only show for non-default rooms */}
                  {room.id !== 'general' && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Are you sure you want to delete "${room.name}" chat room?`)) {
                            deleteChatRoom(room.id)
                          }
                        }}
                        className="p-1 rounded hover:bg-opacity-20 transition-colors"
                        style={{ color: colorScheme.error }}
                        title="Delete chat room"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col w-full sm:w-auto overflow-hidden">
            {/* Chat Header */}
            <div className="p-3 border-b shadow-sm flex-shrink-0" style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border 
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm sm:text-base"
                       style={{ backgroundColor: colorScheme.primary }}>
                    {chatRooms.find(r => r.id === activeRoom)?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base" style={{ color: colorScheme.text }}>
                      {chatRooms.find(r => r.id === activeRoom)?.name}
                    </h3>
                    <p className="text-xs sm:text-sm" style={{ color: colorScheme.textSecondary }}>
                      {chatRooms.find(r => r.id === activeRoom)?.participants.length} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {/* Only show Add Members button for admins */}
                  {user && user.role === 'ADMIN' && (
                    <button 
                      onClick={async () => {
                        await fetchAvailableUsers()
                        setShowAddMembersModal(true)
                      }}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ color: colorScheme.textSecondary }}
                      title="Add Members">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const newName = prompt('Enter new chat room name:', chatRooms.find(r => r.id === activeRoom)?.name)
                      if (newName && newName.trim()) {
                        console.log('Renaming room to:', newName)
                        // Add rename logic here
                      }
                    }}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                    style={{ color: colorScheme.textSecondary }}
                    title="Edit Chat Room">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={handleMoreOptions}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ color: colorScheme.textSecondary }}
                      title="More Options">
                      <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showMoreOptions && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50"
                           style={{ 
                             backgroundColor: colorScheme.surface,
                             borderColor: colorScheme.border 
                           }}>
                        <div className="py-1">
                          <button
                            onClick={handleClearChat}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-20 transition-colors"
                            style={{ color: colorScheme.text }}
                          >
                            Clear Chat
                          </button>
                          <button
                            onClick={handleLeaveChat}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-20 transition-colors"
                            style={{ color: colorScheme.error }}
                          >
                            Leave Chat
                          </button>
                        </div>
                      </div>
                    )}
                  <button 
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                    style={{ color: colorScheme.textSecondary }}
                    title="Close Chat">
                    <X className="h-5 w-5" />
                  </button>
                    {/* Dropdown menu would go here */}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ backgroundColor: colorScheme.background }}>
              {messages.map((message) => (
                <div key={message.id} 
                     className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 rounded-2xl relative shadow-sm ${
                    message.senderId === user?.id ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                       style={{
                         backgroundColor: message.senderId === user?.id 
                           ? colorScheme.primary 
                           : colorScheme.surface
                       }}>
                    {message.senderId !== user?.id && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium" 
                              style={{ color: getRoleColor(message.senderRole) }}>
                          {message.senderName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: `${getRoleColor(message.senderRole)}20`,
                                color: getRoleColor(message.senderRole)
                              }}>
                          {message.senderRole}
                        </span>
                      </div>
                    )}
                    
                    {editingMessage === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50"
                          style={{ 
                            backgroundColor: colorScheme.surface,
                            color: colorScheme.text,
                            border: `1px solid ${colorScheme.border}`,
                            focusRingColor: colorScheme.primary
                          }}
                          rows={2}
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={saveEditedMessage}
                            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ 
                              backgroundColor: colorScheme.primary,
                              color: 'white'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ 
                              backgroundColor: colorScheme.border,
                              color: colorScheme.text
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : message.type === 'file' ? (
                      <>
                        {renderFileMessage(message)}
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs" 
                                style={{ color: message.senderId === user?.id ? 'rgba(255,255,255,0.7)' : colorScheme.textSecondary }}>
                            {formatTime(message.timestamp)}
                          </span>
                          {message.senderId === user?.id && getMessageStatusIcon(message.status)}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm" 
                           style={{ color: message.senderId === user?.id ? (colorScheme.primaryText || 'white') : colorScheme.text }}>
                          {message.content}
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs" 
                                style={{ color: message.senderId === user?.id ? 'rgba(255,255,255,0.7)' : colorScheme.textSecondary }}>
                            {formatTime(message.timestamp)}
                          </span>
                          {message.senderId === user?.id && getMessageStatusIcon(message.status)}
                        </div>
                      </>
                    )}
                    
                    {/* Message Actions - Only show for user's own messages */}
                    {message.senderId === user?.id && editingMessage !== message.id && (
                      <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1"
                             style={{ borderColor: colorScheme.border }}>
                          <button
                            onClick={() => startEditingMessage(message.id, message.content)}
                            className="p-1 rounded hover:bg-opacity-20 transition-colors"
                            style={{ color: colorScheme.textSecondary }}
                            title="Edit message"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="p-1 rounded hover:bg-opacity-20 transition-colors"
                            style={{ color: colorScheme.error }}
                            title="Delete message"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t shadow-lg flex-shrink-0" style={{ 
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border 
            }}>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="p-3 rounded-full transition-colors disabled:opacity-50 shadow-lg"
                  style={{ 
                    backgroundColor: colorScheme.primary,
                    color: colorScheme.primaryText || 'white'
                  }}
                  title={uploadingFile ? "Uploading..." : "Upload file (PDF, images, documents) - Use this to share files with download links"}
                >
                  {uploadingFile ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf,.doc,.docx"
                />
                
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message"
                    className="w-full px-4 py-3 pr-12 rounded-2xl resize-none focus:outline-none focus:ring-2 text-base"
                    style={{ 
                      backgroundColor: 'white',
                      color: '#1f2937',
                      border: 'none',
                      focusRingColor: colorScheme.primary
                    }}
                    rows={1}
                  />
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors"
                    style={{ 
                      color: colorScheme.textSecondary,
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 rounded-full transition-colors disabled:opacity-50 shadow-lg"
                  style={{ 
                    backgroundColor: colorScheme.primary,
                    color: colorScheme.primaryText || 'white'
                  }}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Add Members to Chat
              </h2>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {console.log('🔍 Modal rendering - availableUsers:', availableUsers)}
                {availableUsers.length === 0 ? (
                  <div className="text-center py-8" style={{ color: colorScheme.textSecondary }}>
                    <p>No users available to add</p>
                    <p className="text-sm mt-2">Make sure you have PLAYER, STAFF, or COACH users in your system</p>
                  </div>
                ) : (
                  availableUsers
                  .filter(availableUser => availableUser.id !== user?.id) // Exclude current user
                  .filter(availableUser => !chatRooms.find(r => r.id === activeRoom)?.participants.some(p => p.id === availableUser.id)) // Exclude already added users
                  .map(availableUser => (
                    <div
                      key={availableUser.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.includes(availableUser.id) ? 'bg-opacity-20' : 'hover:bg-opacity-10'
                      }`}
                      style={{ 
                        backgroundColor: selectedUsers.includes(availableUser.id) ? colorScheme.primary : 'transparent'
                      }}
                      onClick={() => {
                        setSelectedUsers(prev => 
                          prev.includes(availableUser.id) 
                            ? prev.filter(id => id !== availableUser.id)
                            : [...prev, availableUser.id]
                        )
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                           style={{ backgroundColor: colorScheme.primary }}>
                        {availableUser.name?.charAt(0) || availableUser.email?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium" style={{ color: colorScheme.text }}>
                          {availableUser.name || availableUser.email}
                        </h3>
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          {availableUser.role}
                        </p>
                      </div>
                      {selectedUsers.includes(availableUser.id) && (
                        <Check className="h-5 w-5" style={{ color: colorScheme.primary }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end space-x-2" style={{ borderColor: colorScheme.border }}>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: colorScheme.border,
                  color: colorScheme.text
                }}
              >
                Cancel
              </button>
              <button
                onClick={addMembersToChat}
                disabled={selectedUsers.length === 0}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: colorScheme.primaryText || 'white'
                }}
              >
                Add {selectedUsers.length} Member{selectedUsers.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
