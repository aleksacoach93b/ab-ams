'use client'

import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Save, AlertCircle, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface PlayerStatusNotesModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    id: string
    name: string
    availabilityStatus: string
  }
  onSave: (data: { reason: string; notes: string }) => void
  isLoading?: boolean
}

export default function PlayerStatusNotesModal({
  isOpen,
  onClose,
  player,
  onSave,
  isLoading = false
}: PlayerStatusNotesModalProps) {
  const { theme } = useTheme()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // Check if status is FULLY_AVAILABLE
  const isFullyAvailable = player.availabilityStatus === 'FULLY_AVAILABLE' || player.availabilityStatus === 'Fully Available'

  // Automatically clear fields when status is FULLY_AVAILABLE
  React.useEffect(() => {
    if (isFullyAvailable) {
      setReason('')
      setNotes('')
    }
  }, [isFullyAvailable, isOpen])

  const handleSave = () => {
    // If FULLY_AVAILABLE, always save with empty reason and notes
    if (isFullyAvailable) {
      onSave({ reason: '', notes: '' })
      return
    }

    // For other statuses, require reason
    if (!reason.trim()) {
      alert('Please provide a reason for the player\'s unavailability.')
      return
    }
    onSave({ reason: reason.trim(), notes: notes.trim() })
  }

  const handleClose = () => {
    setReason('')
    setNotes('')
    onClose()
  }

  const getStatusColor = (status: string) => {
    if (status === 'Fully Available') return 'text-green-600 bg-green-100'
    if (status.includes('Unavailable')) return 'text-red-600 bg-red-100'
    if (status.includes('Partially')) return 'text-yellow-600 bg-yellow-100'
    if (status.includes('Rehabilitation')) return 'text-blue-600 bg-blue-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-lg shadow-xl transition-all ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <User className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <Dialog.Title className={`text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Player Status Notes
                        </Dialog.Title>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Add reason for unavailability
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className={`p-2 rounded-md transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-gray-700 text-gray-300' 
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Player Info */}
                  <div className={`p-4 rounded-lg mb-6 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {player.name}
                        </h3>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Current Status
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        getStatusColor(player.availabilityStatus)
                      }`}>
                        {player.availabilityStatus}
                      </span>
                    </div>
                  </div>

                  {/* Reason Field - Hidden/Disabled for FULLY_AVAILABLE */}
                  {!isFullyAvailable && (
                    <>
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Reason for Unavailability *
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g., Injury - ankle sprain, Illness - flu symptoms, Personal reasons..."
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>

                      {/* Additional Notes */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any additional information about the player's condition, expected return date, treatment details..."
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                    </>
                  )}

                  {/* Info for FULLY_AVAILABLE */}
                  {isFullyAvailable && (
                    <div className={`p-4 rounded-lg mb-6 ${
                      theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <AlertCircle className={`h-5 w-5 mt-0.5 ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-green-300' : 'text-green-800'
                          }`}>
                            Fully Available Status
                          </p>
                          <p className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-700'
                          }`}>
                            No reason or notes needed. The system will automatically clear any previous notes when you save.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Box - Only show for non-FULLY_AVAILABLE status */}
                  {!isFullyAvailable && (
                    <div className={`p-4 rounded-lg mb-6 ${
                      theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <AlertCircle className={`h-5 w-5 mt-0.5 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                          }`}>
                            Daily Evidence
                          </p>
                          <p className={`text-sm mt-1 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                          }`}>
                            This information will be saved as daily evidence and included in player analytics reports.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleClose}
                      className={`flex-1 px-4 py-2 border rounded-md font-medium transition-colors ${
                        theme === 'dark'
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading || (!isFullyAvailable && !reason.trim())}
                      className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
                        isLoading || (!isFullyAvailable && !reason.trim())
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-blue-700'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
