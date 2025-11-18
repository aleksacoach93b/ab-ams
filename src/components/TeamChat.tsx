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
  Eye,
  Trash2
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
  const [showCreateChatModal, setShowCreateChatModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [newChatParticipants, setNewChatParticipants] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [showMobileChatList, setShowMobileChatList] = useState(false)

  useEffect(() => {
    // Load messages for active room only when a valid DB room id is selected
    if (!activeRoom || activeRoom.trim() === '') {
      console.log('⚠️ No active room selected')
      return
    }
    
    if (chatRooms.length === 0) {
      console.log('⚠️ Chat rooms not loaded yet, waiting...')
      return
    }
    
    const roomExists = chatRooms.some(r => r.id === activeRoom)
    if (!roomExists) {
      console.warn('⚠️ Active room does not exist in chatRooms:', activeRoom, 'Available rooms:', chatRooms.map(r => r.id))
      return
    }
    
    console.log('✅ Loading messages for active room:', activeRoom)
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
      if (showMobileChatList) {
        const target = event.target as HTMLElement
        if (!target.closest('.mobile-chat-dropdown')) {
          setShowMobileChatList(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOptions, showMobileChatList])

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
          const firstRoomId = rooms[0].id
          console.log('✅ Setting first room as active:', firstRoomId)
          setActiveRoom(firstRoomId)
          // Also load messages for the first room
          setTimeout(() => {
            loadMessages(firstRoomId)
          }, 100)
        } else {
          console.log('⚠️ No chat rooms available')
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
    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      console.warn('⚠️ loadMessages called with invalid roomId:', roomId)
      setMessages([])
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      console.log('📥 Loading messages for room:', roomId)

      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const messages = await response.json()
        console.log('✅ Loaded messages:', messages.length)
        
        // Parse messages and add file info
        const parsedMessages = messages.map((message: any) => {
          // If message has fileUrl, it's a file message
          if (message.fileUrl || message.type === 'file') {
            return {
              ...message,
              type: 'file' as const,
              fileInfo: {
                fileName: message.fileName || message.fileInfo?.fileName || 'Unknown file',
                fileSize: message.fileSize || message.fileInfo?.fileSize || 0,
                fileType: message.fileType || message.fileInfo?.fileType || 'application/octet-stream',
                fileUrl: message.fileUrl || message.fileInfo?.fileUrl
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
                fileType: pdfInfo.fileType,
                fileUrl: message.fileUrl // Preserve existing fileUrl if present
              }
            }
          }
          
          return message
        })
        
        setMessages(parsedMessages)
      } else {
        const errorText = await response.text()
        let errorMessage = 'Unknown error'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        
        if (response.status === 404) {
          console.warn(`⚠️ Chat room not found (404): ${roomId}`, errorMessage)
          // Don't show error for 404, just set empty messages
          setMessages([])
        } else {
          console.error(`❌ Failed to fetch messages (${response.status}):`, errorMessage)
          setMessages([])
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      setMessages([])
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    // If no active room, try to set first available room
    let roomIdToUse = activeRoom
    if (!roomIdToUse) {
      if (chatRooms.length > 0) {
        console.log('🔄 No active room, auto-selecting first available room:', chatRooms[0].id)
        roomIdToUse = chatRooms[0].id
        setActiveRoom(roomIdToUse)
      } else {
        console.error('❌ No active room selected and no rooms available')
        alert('Please select a chat room first')
        return
      }
    }

    // Check if user has access to the room
    const hasAccess = chatRooms.some(room => room.id === roomIdToUse)
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

      const response = await fetch(`/api/chat/rooms/${roomIdToUse}/messages`, {
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
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    if (!activeRoom) {
      console.error('❌ No active room selected')
      alert('Please select a chat room first')
      return
    }

    console.log('📤 Starting file upload...', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      chatRoomId: activeRoom 
    })
    console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing')

    setUploadingFile(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chatRoomId', activeRoom)
      
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      console.log('📥 Upload response status:', response.status)
      console.log('📥 Upload response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Upload failed:', errorText)
        try {
          const errorData = JSON.parse(errorText)
          alert(`Upload failed: ${errorData.message || 'Unknown error'}`)
        } catch {
          alert(`Upload failed: ${response.statusText}`)
        }
        setUploadingFile(false)
        return
      }

      const uploadResult = await response.json()
      console.log('✅ Upload result:', uploadResult)
      
      // Send file message to API to save in database/local storage
      const token = localStorage.getItem('token')
      if (token) {
        try {
          console.log('💾 Saving file message to chat room...')
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
              fileName: uploadResult.fileName || file.name,
              fileType: uploadResult.fileType || file.type,
              fileSize: uploadResult.fileSize || file.size
            })
          })

          if (messageResponse.ok) {
            const savedMessage = await messageResponse.json()
            console.log('✅ File message saved successfully:', savedMessage)
            
            // Ensure fileInfo is properly set
            const messageWithFileInfo = {
              ...savedMessage,
              type: 'file' as const,
              fileInfo: {
                fileName: savedMessage.fileName || file.name,
                fileSize: savedMessage.fileSize || file.size,
                fileType: savedMessage.fileType || file.type,
                fileUrl: savedMessage.fileUrl || uploadResult.fileUrl
              }
            }
            
            // Add message to UI immediately
            setMessages(prev => [...prev, messageWithFileInfo])
            
            // Refresh messages after a short delay to ensure consistency
            setTimeout(async () => {
              await loadMessages(activeRoom)
            }, 500)
          } else {
            const errorData = await messageResponse.json().catch(() => ({ message: 'Unknown error' }))
            console.error('❌ Failed to save file message:', errorData)
            alert(`File uploaded but failed to save message: ${errorData.message || 'Unknown error'}`)
            
            // Fallback: add message to UI without saving
            const fileMessage: Message = {
              id: `temp_${Date.now()}`,
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
        } catch (error) {
          console.error('❌ Error saving file message:', error)
          alert('File uploaded but failed to save message. Please try again.')
          
          // Fallback: add message to UI without saving
          const fileMessage: Message = {
            id: `temp_${Date.now()}`,
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
        console.error('❌ No authentication token found')
        alert('Authentication required. Please refresh and try again.')
      }
      
      console.log('✅ File upload completed:', file.name, 'URL:', uploadResult.fileUrl)
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
    // Prevent players from leaving chat rooms
    if (user?.role === 'PLAYER') {
      alert('Players cannot leave chat rooms they were added to by admin')
      return
    }

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
    // Prevent players from editing messages
    if (user?.role === 'PLAYER') {
      return
    }
    setEditingMessage(messageId)
    setEditText(currentText)
  }

  const saveEditedMessage = () => {
    // Prevent players from saving edited messages
    if (user?.role === 'PLAYER') {
      return
    }
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
    // Prevent players from deleting messages
    if (user?.role === 'PLAYER') {
      alert('Players cannot delete messages')
      return
    }

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
        console.log('✅ Message deleted successfully')
        
        // Remove from frontend state (soft delete - filter by deletedAt)
        setMessages(prev => prev.filter(m => m.id !== messageId))
        
        // Refresh messages to ensure consistency
        setTimeout(async () => {
          if (activeRoom) {
            await loadMessages(activeRoom)
          }
        }, 300)
      } else {
        const errorText = await response.text()
        let errorMessage = 'Unknown error'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        console.error('❌ Failed to delete message:', errorMessage)
        alert(`Failed to delete message: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error deleting message: ${errorMessage}`)
    }
  }

  const createNewChatRoom = async () => {
    if (!newChatName.trim()) {
      alert('Please enter a chat room name')
      return
    }

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
          name: newChatName.trim(),
          type: 'group',
          participantIds: newChatParticipants // Include selected participants
        })
      })

      if (response.ok) {
        const newRoom = await response.json()
        console.log('Created new chat room:', newRoom)
        setChatRooms(prev => [...prev, newRoom])
        setActiveRoom(newRoom.id)
        setShowCreateChatModal(false)
        setNewChatName('')
        setNewChatParticipants([])
        // Refresh chat rooms list
        await loadRealUsersAndCreateChatRooms()
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('Failed to create chat room:', response.status, response.statusText)
        alert(`Failed to create chat room: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating chat room:', error)
      alert('Error creating chat room. Please try again.')
    }
  }

  const editChatRoom = async (roomId: string, newName: string, description?: string) => {
    if (!roomId || !newName || !newName.trim()) return

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      console.log('✏️ Editing chat room:', roomId, 'New name:', newName)

      // Call API to update chat room
      const response = await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: description || null
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Chat room updated successfully:', result)
        
        // Update frontend state
        setChatRooms(prev => prev.map(room => 
          room.id === roomId 
            ? { ...room, name: result.name, description: result.description }
            : room
        ))
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to update chat room:', errorData.message || errorData.error)
        alert(`Failed to update chat room: ${errorData.message || errorData.error}`)
      }
    } catch (error) {
      console.error('❌ Error updating chat room:', error)
      alert('Error updating chat room. Please try again.')
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

      // Fetch players and staff separately
      console.log('📡 Making API requests to /api/players and /api/staff...')
      const [playersResponse, staffResponse] = await Promise.all([
        fetch('/api/players', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/staff', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ])
      
      console.log('📊 Players response status:', playersResponse.status)
      console.log('📊 Staff response status:', staffResponse.status)
      
      const allUsers: any[] = []
      
      // Process players
      if (playersResponse.ok) {
        const players = await playersResponse.json()
        console.log('✅ Fetched players:', players)
        
        // Handle both array and object with players property
        const playersList = Array.isArray(players) ? players : (players.players || [])
        
        playersList.forEach((player: any) => {
          allUsers.push({
            id: player.id,
            name: player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            email: player.email,
            role: 'PLAYER',
            isActive: true,
            firstName: player.firstName,
            lastName: player.lastName
          })
        })
      } else {
        console.error('❌ Failed to fetch players:', playersResponse.status)
      }
      
      // Process staff
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        console.log('✅ Fetched staff:', staffData)
        
        // Handle both array and object with staff property
        const staffList = Array.isArray(staffData) ? staffData : (staffData.staff || [])
        
        staffList.forEach((staffMember: any) => {
          allUsers.push({
            id: staffMember.user?.id || staffMember.id,
            name: staffMember.name || `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim(),
            email: staffMember.email || staffMember.user?.email,
            role: 'STAFF',
            isActive: true,
            firstName: staffMember.firstName,
            lastName: staffMember.lastName
          })
        })
      } else {
        console.error('❌ Failed to fetch staff:', staffResponse.status)
      }
      
      console.log('👥 Total available users (PLAYER, STAFF):', allUsers)
      console.log('📊 Total users count:', allUsers.length)
      
      setAvailableUsers(allUsers)
      console.log('✅ Available users state updated')
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      setAvailableUsers([])
    }
  }

  const addMembersToChat = async () => {
    if (selectedUsers.length === 0) {
      console.warn('⚠️ No users selected to add')
      return
    }

    if (!activeRoom || activeRoom.trim() === '') {
      console.error('❌ No active room selected')
      alert('Please select a chat room first')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      console.log('➕ Adding members to chat room:', activeRoom, 'Users:', selectedUsers)

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
          
          // Refresh chat rooms from server to get accurate participant list (avoid duplicates)
          await loadRealUsersAndCreateChatRooms()

          setSelectedUsers([])
          setShowAddMembersModal(false)
        } else {
          const errorText = await response.text()
          let errorMessage = 'Unknown error'
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch {
            errorMessage = response.statusText || errorMessage
          }
          console.error('Failed to add members to chat room:', response.status, errorMessage)
          alert(`Failed to add members: ${errorMessage}`)
        }
      } catch (error) {
        console.error('Error adding members to chat room:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        alert(`Error adding members: ${errorMessage}`)
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
          <div className="flex items-center space-x-3 flex-1">
            {/* Mobile: Chat Groups Dropdown Button */}
            <div className="relative sm:hidden mobile-chat-dropdown">
              <button
                onClick={() => setShowMobileChatList(!showMobileChatList)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ 
                  backgroundColor: showMobileChatList ? colorScheme.primary : 'transparent',
                  color: showMobileChatList ? (colorScheme.primaryText || 'white') : colorScheme.text
                }}
                title="Select Chat Group"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {chatRooms.find(r => r.id === activeRoom)?.name || 'Select Chat'}
                </span>
                <X className={`h-4 w-4 transform transition-transform ${showMobileChatList ? 'rotate-45' : ''}`} />
              </button>
              
              {/* Mobile Chat List Dropdown */}
              {showMobileChatList && (
                <div 
                  className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto rounded-lg shadow-lg z-50 border mobile-chat-dropdown"
                  style={{ 
                    backgroundColor: colorScheme.surface,
                    borderColor: colorScheme.border
                  }}
                >
                  {/* Search in mobile dropdown */}
                  <div className="p-3 border-b sticky top-0" style={{ backgroundColor: colorScheme.surface, borderColor: colorScheme.border }}>
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
                  <div className="max-h-80 overflow-y-auto">
                    {chatRooms.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          No chat rooms available
                        </p>
                      </div>
                    ) : (
                      chatRooms
                        .filter(room => 
                          room.name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((room) => (
                          <div
                            key={room.id}
                            onClick={() => {
                              setActiveRoom(room.id)
                              setShowMobileChatList(false)
                            }}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              activeRoom === room.id ? 'bg-opacity-50' : 'hover:bg-opacity-20'
                            }`}
                            style={{ 
                              borderColor: colorScheme.border,
                              backgroundColor: activeRoom === room.id ? colorScheme.primary : 'transparent'
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                                     style={{ backgroundColor: colorScheme.primary }}>
                                  {room.name.charAt(0)}
                                </div>
                                {room.participants.some(p => p.isOnline) && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium truncate text-sm" 
                                      style={{ color: activeRoom === room.id ? (colorScheme.primaryText || 'white') : colorScheme.text }}>
                                    {room.name}
                                  </h3>
                                  {room.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[18px] text-center">
                                      {room.unreadCount}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs truncate mt-0.5" 
                                   style={{ color: activeRoom === room.id ? 'rgba(255,255,255,0.8)' : colorScheme.textSecondary }}>
                                  {room.lastMessage?.content || 'No messages yet'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  
                  {/* New Chat Button for Admin - Mobile */}
                  {user && user.role === 'ADMIN' && (
                    <div className="p-3 border-t" style={{ borderColor: colorScheme.border }}>
                      <button
                        onClick={async () => {
                          await fetchAvailableUsers()
                          setShowCreateChatModal(true)
                          setShowMobileChatList(false)
                        }}
                        className="w-full flex items-center justify-center px-3 py-2 rounded-lg font-medium transition-colors"
                        style={{ 
                          backgroundColor: colorScheme.primary,
                          color: colorScheme.primaryText || 'white'
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Desktop: Team Chat Title */}
            <div className="hidden sm:flex items-center space-x-3">
              <MessageCircle className="h-6 w-6" style={{ color: colorScheme.primary }} />
              <h2 className="text-xl font-bold" style={{ color: colorScheme.text }}>
                Team Chat
              </h2>
            </div>
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
                    onClick={async () => {
                      await fetchAvailableUsers()
                      setShowCreateChatModal(true)
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
                  
                  {/* Room Actions - Only show for admins and non-default rooms */}
                  {user && user.role === 'ADMIN' && room.id !== 'general' && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Are you sure you want to delete "${room.name}" chat room? This action cannot be undone.`)) {
                            deleteChatRoom(room.id)
                          }
                        }}
                        className="p-1 rounded hover:bg-opacity-20 transition-colors"
                        style={{ color: colorScheme.error }}
                        title="Delete chat room (Admin only)"
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

          {/* Main Chat Area - Only show if user has chat rooms and one is active */}
          {chatRooms.length > 0 && activeRoom ? (
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
                      <button
                        onClick={() => setShowMembersModal(true)}
                        className="text-xs sm:text-sm hover:underline"
                        style={{ color: colorScheme.textSecondary }}
                      >
                        {chatRooms.find(r => r.id === activeRoom)?.participants.length || 0} members
                      </button>
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
                  {/* Only show Delete button for admins */}
                  {user && user.role === 'ADMIN' && activeRoom && activeRoom !== 'general' && (
                    <button 
                      onClick={() => {
                        const room = chatRooms.find(r => r.id === activeRoom)
                        if (room && confirm(`Are you sure you want to delete "${room.name}" chat room? This action cannot be undone.`)) {
                          deleteChatRoom(activeRoom)
                        }
                      }}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ color: colorScheme.error }}
                      title="Delete Chat Room (Admin only)">
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                  {/* Only show Edit Chat Room button for non-players */}
                  {user && user.role !== 'PLAYER' && (
                    <button 
                      onClick={() => {
                        const currentRoom = chatRooms.find(r => r.id === activeRoom)
                        const newName = prompt('Enter new chat room name:', currentRoom?.name)
                        if (newName && newName.trim() && newName !== currentRoom?.name) {
                          editChatRoom(activeRoom, newName)
                        }
                      }}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                      style={{ color: colorScheme.textSecondary }}
                      title="Edit Chat Room">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
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
                          {/* Only show Clear Chat for non-players */}
                          {user && user.role !== 'PLAYER' && (
                            <button
                              onClick={handleClearChat}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-20 transition-colors"
                              style={{ color: colorScheme.text }}
                            >
                              Clear Chat
                            </button>
                          )}
                          {/* Hide Leave Chat for players */}
                          {user && user.role !== 'PLAYER' && (
                            <button
                              onClick={handleLeaveChat}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-20 transition-colors"
                              style={{ color: colorScheme.error }}
                            >
                              Leave Chat
                            </button>
                          )}
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
                    
                    {/* Message Actions - Only show for user's own messages and not for players */}
                    {message.senderId === user?.id && editingMessage !== message.id && user?.role !== 'PLAYER' && (
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

            {/* Message Input - Only show if active room exists */}
            {activeRoom && (
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
            )}
            </div>
          ) : (
            /* Empty state when no chat rooms */
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colorScheme.textSecondary }} />
                <p className="text-lg font-medium" style={{ color: colorScheme.textSecondary }}>
                  You are not added to any chat
                </p>
                <p className="text-sm mt-2" style={{ color: colorScheme.textSecondary }}>
                  Contact administrator to add you to a chat room
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Modal */}
      {showCreateChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-xl font-semibold" style={{ color: colorScheme.text }}>
                Create New Chat Room
              </h2>
              <button
                onClick={() => {
                  setShowCreateChatModal(false)
                  setNewChatName('')
                  setNewChatParticipants([])
                }}
                className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Chat Name Input */}
              <div>
                <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                  Chat Room Name *
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Enter chat room name"
                  style={{
                    backgroundColor: colorScheme.background,
                    color: colorScheme.text,
                    border: `1px solid ${colorScheme.border}`
                  }}
                />
              </div>

              {/* Participants Selection */}
              <div>
                <label style={{ color: colorScheme.text }} className="block text-sm font-medium mb-2">
                  Select Participants (Staff & Players)
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2" style={{ borderColor: colorScheme.border }}>
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-4" style={{ color: colorScheme.textSecondary }}>
                      <p>No users available</p>
                      <p className="text-xs mt-1">Make sure you have STAFF or PLAYER users in your system</p>
                    </div>
                  ) : (
                    availableUsers
                      .filter(availableUser => availableUser.id !== user?.id) // Exclude current user (admin)
                      .filter(availableUser => ['STAFF', 'PLAYER'].includes(availableUser.role)) // Only STAFF and PLAYER
                      .map(availableUser => (
                        <div
                          key={availableUser.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            newChatParticipants.includes(availableUser.id) ? 'bg-opacity-20' : 'hover:bg-opacity-10'
                          }`}
                          style={{ 
                            backgroundColor: newChatParticipants.includes(availableUser.id) ? colorScheme.primary : 'transparent'
                          }}
                          onClick={() => {
                            setNewChatParticipants(prev => 
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
                          {newChatParticipants.includes(availableUser.id) && (
                            <Check className="h-5 w-5" style={{ color: colorScheme.primary }} />
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end space-x-2" style={{ borderColor: colorScheme.border }}>
              <button
                onClick={() => {
                  setShowCreateChatModal(false)
                  setNewChatName('')
                  setNewChatParticipants([])
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: colorScheme.border,
                  color: colorScheme.text
                }}
              >
                Cancel
              </button>
              <button
                onClick={createNewChatRoom}
                disabled={!newChatName.trim()}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: colorScheme.primaryText || 'white'
                }}
              >
                Create Chat
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div 
            className="w-full max-w-md rounded-lg shadow-xl"
            style={{ backgroundColor: colorScheme.surface }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colorScheme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: colorScheme.text }}>
                Members ({chatRooms.find(r => r.id === activeRoom)?.participants.length || 0})
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ color: colorScheme.textSecondary }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {chatRooms.find(r => r.id === activeRoom)?.participants.length === 0 ? (
                <div className="text-center py-8" style={{ color: colorScheme.textSecondary }}>
                  <p>No members in this chat room</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatRooms.find(r => r.id === activeRoom)?.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-3 p-3 rounded-lg"
                      style={{ backgroundColor: colorScheme.background }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                           style={{ backgroundColor: colorScheme.primary }}>
                        {participant.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium" style={{ color: colorScheme.text }}>
                          {participant.name}
                        </h3>
                        <p className="text-sm" style={{ color: colorScheme.textSecondary }}>
                          {participant.role}
                        </p>
                      </div>
                      {participant.isOnline && (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t" style={{ borderColor: colorScheme.border }}>
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: colorScheme.primary,
                  color: colorScheme.primaryText || 'white'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
