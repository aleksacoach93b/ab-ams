'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Quote, 
  Link, 
  List, 
  ListOrdered, 
  Code, 
  Minus,
  Save,
  X
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface RichTextEditorProps {
  initialContent?: string
  placeholder?: string
  onSave: (content: string) => void
  onCancel: () => void
  isVisible?: boolean
  isPinned?: boolean
  onToggleVisible?: (visible: boolean) => void
  onTogglePinned?: (pinned: boolean) => void
  isEditing?: boolean
}

export default function RichTextEditor({
  initialContent = '',
  placeholder = 'Enter a note about this player...',
  onSave,
  onCancel,
  isVisible = false,
  isPinned = false,
  onToggleVisible,
  onTogglePinned,
  isEditing = false
}: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [showPlaceholder, setShowPlaceholder] = useState(!initialContent)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const { colorScheme, theme } = useTheme()

  useEffect(() => {
    if (editorRef.current) {
      if (initialContent) {
        editorRef.current.innerHTML = initialContent
        setShowPlaceholder(false)
      } else {
        editorRef.current.innerHTML = ''
        setShowPlaceholder(true)
      }
    }
  }, [initialContent])

  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      // Ensure the editor is focused
      editorRef.current.focus()
      
      // Execute the command
      document.execCommand(command, false, value)
      
      // Trigger content change to update state
      handleContentChange()
    }
  }

  const insertLink = () => {
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${linkText}</a>`
      execCommand('insertHTML', linkHtml)
      setIsLinkModalOpen(false)
      setLinkUrl('')
      setLinkText('')
    }
  }

  const handleSave = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML
      const textContent = editorRef.current.textContent || ''
      
      // Only save if there's actual content
      if (textContent.trim()) {
        console.log('Saving note content:', htmlContent)
        onSave(htmlContent)
      } else {
        console.log('No content to save')
        // You might want to show an error message here
      }
    }
  }

  const handleContentChange = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML
      const textContent = editorRef.current.textContent || ''
      
      // Update content state
      setContent(htmlContent)
      
      // Show/hide placeholder based on content
      setShowPlaceholder(textContent.trim() === '')
    }
  }

  const handleFocus = () => {
    if (showPlaceholder && editorRef.current) {
      editorRef.current.innerHTML = ''
      setShowPlaceholder(false)
    }
  }

  const handleBlur = () => {
    if (editorRef.current && editorRef.current.textContent?.trim() === '') {
      setShowPlaceholder(true)
    }
  }

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold', key: 'bold' },
    { icon: Italic, command: 'italic', title: 'Italic', key: 'italic' },
    { icon: Underline, command: 'underline', title: 'Underline', key: 'underline' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough', key: 'strikethrough' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote', key: 'quote' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List', key: 'bullet-list' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List', key: 'numbered-list' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block', key: 'code-block' },
    { icon: Minus, command: 'insertHorizontalRule', title: 'Horizontal Rule', key: 'horizontal-rule' }
  ]

  return (
    <div 
      className="rounded-lg border"
      style={{ 
        backgroundColor: colorScheme.surface,
        borderColor: colorScheme.border
      }}
    >
      {/* Toolbar */}
      <div 
        className="flex items-center gap-1 p-2 border-b"
        style={{ 
          borderColor: colorScheme.border,
          backgroundColor: colorScheme.background
        }}
      >
        {toolbarButtons.map(({ icon: Icon, command, value, title, key }) => (
          <button
            key={key}
            onClick={() => execCommand(command, value)}
            className="p-2 rounded transition-colors hover:opacity-70"
            style={{ color: colorScheme.textSecondary }}
            title={title}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          onClick={() => setIsLinkModalOpen(true)}
          className="p-2 rounded transition-colors hover:opacity-70"
          style={{ color: colorScheme.textSecondary }}
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="min-h-[120px] p-3 focus:outline-none"
          style={{ 
            color: colorScheme.text,
            minHeight: '120px',
            direction: 'ltr',
            textAlign: 'left'
          }}
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
        />
        {showPlaceholder && (
          <div 
            className="absolute top-3 left-3 pointer-events-none select-none"
            style={{ 
              color: colorScheme.textSecondary,
              fontStyle: 'italic'
            }}
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Toggle Options */}
      {onToggleVisible && onTogglePinned && (
        <div 
          className="flex items-center justify-between p-3 border-t"
          style={{ borderColor: colorScheme.border }}
        >
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => onToggleVisible(e.target.checked)}
                className="mr-2"
              />
              <span 
                className="text-sm"
                style={{ color: colorScheme.text }}
              >
                Visible to player
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => onTogglePinned(e.target.checked)}
                className="mr-2"
              />
              <span 
                className="text-sm"
                style={{ color: colorScheme.text }}
              >
                Pinned
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`flex justify-end space-x-3 p-3 border-t ${
        theme === 'dark' 
          ? 'border-gray-700' 
          : 'border-gray-200'
      }`}>
        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <X className="h-4 w-4 inline mr-2" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Save className="h-4 w-4 inline mr-2" />
          {isEditing ? 'Update' : 'Save'}
        </button>
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-lg shadow-xl p-6 w-full max-w-md ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-medium mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Link text"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={insertLink}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
