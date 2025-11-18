'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Menu,
  Search,
  Bell,
  User,
  Plus,
  ChevronDown,
  Shield,
  MoreVertical,
  LogOut,
  MessageCircle,
  Heart,
  HeartPulse,
  Activity
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import ThemeSelector from '@/components/ThemeSelector'
import RealTimeNotifications from '@/components/RealTimeNotifications'
import ChatNotifications from '@/components/ChatNotifications'
import TeamChat from '@/components/TeamChat'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const [showTeamChat, setShowTeamChat] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { colorScheme, theme } = useTheme()
  const { user, logout, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // If user is staff, fetch permissions
    if (user?.role === 'STAFF' && user?.staff) {
      setUserPermissions(user.staff)
    }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.add-dropdown-container')) {
        setAddDropdownOpen(false)
      }
    }

    if (addDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [addDropdownOpen])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorScheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2" style={{ color: colorScheme.textSecondary }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  const fetchStaffPermissions = async () => {
    try {
      if (typeof window === 'undefined') return
      
      const staffId = localStorage.getItem('staffId')
      if (staffId) {
        const response = await fetch(`/api/staff/${staffId}`)
        if (response.ok) {
          const staffData = await response.json()
          setUserPermissions(staffData)
        }
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error)
    }
  }

  // Role-based navigation
  const getNavigation = () => {
    const baseNavigation = [
      {
        name: 'Main Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        current: pathname === '/dashboard',
        show: true // Always show dashboard
      },
    ]

    // Calendar - show if user can view calendar
    if (user?.role === 'ADMIN' || user?.role === 'COACH' || (user?.role === 'STAFF' && userPermissions?.canViewCalendar)) {
      baseNavigation.push({
        name: 'Calendar',
        href: '/dashboard/calendar',
        icon: Calendar,
        current: pathname === '/dashboard/calendar',
        show: true
      })
    }

    // Players section
    if (user?.role === 'ADMIN' || user?.role === 'COACH' || (user?.role === 'STAFF' && userPermissions?.canViewAllPlayers)) {
      const playerSubItems = [
        { name: 'All Players', href: '/dashboard/players' }
      ]

      // Add Teams if admin/coach
      if (user?.role === 'ADMIN' || user?.role === 'COACH') {
        playerSubItems.push({ name: 'Teams', href: '/dashboard/teams' })
      }

      // Add Staff management if admin or staff with manage permission
      if (user?.role === 'ADMIN' || (user?.role === 'STAFF' && userPermissions?.canManageStaff)) {
        playerSubItems.push({ name: 'Staff', href: '/dashboard/staff' })
      }

      // Add Locations if admin/coach
      if (user?.role === 'ADMIN' || user?.role === 'COACH') {
        playerSubItems.push({ name: 'Locations', href: '/dashboard/locations' })
      }

      baseNavigation.push({
        name: 'Players',
        href: '/dashboard/players',
        icon: Users,
        current: pathname.startsWith('/dashboard/players'),
        subItems: playerSubItems,
        show: true
      })
    }

    // Wellness - show for admin and coach
    if (user?.role === 'ADMIN' || user?.role === 'COACH') {
      baseNavigation.push({
        name: 'Wellness',
        href: '/dashboard/wellness',
        icon: Heart,
        current: pathname === '/dashboard/wellness',
        show: true
      })
    }
    
    // Daily Wellness - show for admin, coach, and staff
    if (user?.role === 'ADMIN' || user?.role === 'COACH' || user?.role === 'STAFF') {
      baseNavigation.push({
        name: 'Daily Wellness',
        href: '/dashboard/daily-wellness',
        icon: Calendar,
        current: pathname === '/dashboard/daily-wellness',
        show: true
      })
    }
    
    // RPE Analysis - show for admin, coach, and staff
    if (user?.role === 'ADMIN' || user?.role === 'COACH' || user?.role === 'STAFF') {
      baseNavigation.push({
        name: 'RPE Analysis',
        href: '/dashboard/rpe-analysis',
        icon: Activity,
        current: pathname === '/dashboard/rpe-analysis',
        show: true
      })
    }

    // Admin Area - only for admin
    if (user?.role === 'ADMIN') {
      baseNavigation.push({
        name: 'Admin Area',
        href: '/dashboard/admin',
        icon: Settings,
        current: pathname.startsWith('/dashboard/admin'),
        subItems: [
          { name: 'Users', href: '/dashboard/admin/users' },
          { name: 'Settings', href: '/dashboard/admin/settings' },
        ],
        show: true
      })
    }

    return baseNavigation.filter(item => item.show)
  }

  const navigation = getNavigation()

  // Quick Access Buttons - no duplicates, only unique buttons
  const quickAccessButtons = [
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: 'Main Dashboard',
      onClick: () => router.push('/dashboard'),
      show: true // Always show for all users
    },
    {
      key: 'calendar',
      icon: Calendar,
      label: 'Calendar',
      onClick: () => router.push('/dashboard/calendar'),
      show:
        user?.role === 'ADMIN' ||
        user?.role === 'COACH' ||
        (user?.role === 'STAFF' && userPermissions?.canViewCalendar)
    },
    {
      key: 'players',
      icon: Users,
      label: 'Players',
      onClick: () => router.push('/dashboard/players'),
      show:
        user?.role === 'ADMIN' ||
        user?.role === 'COACH' ||
        (user?.role === 'STAFF' && userPermissions?.canViewAllPlayers)
    },
    {
      key: 'dailyWellness',
      icon: HeartPulse,
      label: 'Daily Wellness',
      onClick: () => router.push('/dashboard/daily-wellness'),
      show: user?.role === 'ADMIN' || user?.role === 'COACH' || user?.role === 'STAFF'
    },
    {
      key: 'rpeAnalysis',
      icon: Activity,
      label: 'RPE Analysis',
      onClick: () => router.push('/dashboard/rpe-analysis'),
      show: user?.role === 'ADMIN' || user?.role === 'COACH' || user?.role === 'STAFF'
    }
  ].filter((btn, index, self) => 
    // Remove duplicates by checking if this is the first occurrence of this key
    index === self.findIndex(b => b.key === btn.key)
  )

  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        backgroundColor: colorScheme.background,
        background: colorScheme.background,
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        margin: 0,
        padding: 0
      }}
    >
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className="absolute inset-0 opacity-75"
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#4B5563' }}
          ></div>
        </div>
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: colorScheme.surface }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div 
            className="flex items-center justify-between h-16 px-4 border-b"
            style={{ borderColor: colorScheme.border }}
          >
            <Link href="/dashboard" className="text-xl font-bold text-red-600">
              AB
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <button
              className="w-full flex items-center justify-start p-2 hover:opacity-70 transition-colors"
              style={{ color: colorScheme.textSecondary }}
              onClick={() => setSidebarOpen(false)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {navigation.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: item.current ? colorScheme.primary : 'transparent',
                    color: item.current ? 'white' : colorScheme.text
                  }}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.subItems && (
                    <ChevronDown className="ml-auto h-4 w-4" />
                  )}
                </Link>

                {/* Sub-items */}
                {item.subItems && item.current && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-3 py-2 text-sm rounded-md transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: pathname === subItem.href ? colorScheme.primaryLight : 'transparent',
                          color: pathname === subItem.href ? colorScheme.primary : colorScheme.textSecondary
                        }}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Team selector */}
          <div 
            className="p-4 border-t"
            style={{ borderColor: colorScheme.border }}
          >
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium"
              style={{ color: colorScheme.text }}
            >
              <Shield className="mr-3 h-5 w-5 text-red-600" />
              Sepsi OSK
              <ChevronDown className="ml-auto h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Top header */}
        <header 
          className="shadow-sm"
          style={{ backgroundColor: colorScheme.background }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Mobile: First Row - Menu, Quick Access Buttons (first 3), Theme, Chat, Notifications */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 sm:justify-start">
              {/* Mobile: First Row */}
              <div className="flex items-center justify-between gap-2 sm:gap-2">
                {/* 3 Dots Menu Button */}
                <button
                  className="p-2 rounded-md transition-colors"
                  style={{ 
                    backgroundColor: colorScheme.surface,
                    color: colorScheme.text,
                  }}
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  title="Toggle Navigation Menu"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {/* Quick Access Buttons - First 3 for mobile ONLY */}
                <div className="flex items-center gap-2 sm:hidden">
                  {quickAccessButtons.filter(btn => btn.show).slice(0, 3).map((btn) => (
                    <button
                      key={btn.key}
                      onClick={btn.onClick}
                      className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:opacity-90 shadow-sm"
                      style={{
                        backgroundColor: colorScheme.surface,
                        color: colorScheme.text,
                        border: `1px solid ${colorScheme.border}`
                      }}
                      title={btn.label}
                    >
                      <btn.icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>

                {/* Mobile: Theme, Chat, Notifications on first row */}
                <div className="flex items-center gap-2 sm:hidden">
                  {!showTeamChat && <ThemeSelector />}
                  <ChatNotifications onOpenChat={() => setShowTeamChat(true)} />
                  <RealTimeNotifications userId={user?.id} userRole={user?.role} />
                </div>
              </div>

              {/* Mobile: Second Row - Remaining Quick Access Buttons, Add new, Logout */}
              <div className="flex items-center gap-2 sm:hidden">
                {quickAccessButtons.filter(btn => btn.show).slice(3).map((btn) => (
                  <button
                    key={btn.key}
                    onClick={btn.onClick}
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:opacity-90 shadow-sm"
                    style={{
                      backgroundColor: colorScheme.surface,
                      color: colorScheme.text,
                      border: `1px solid ${colorScheme.border}`
                    }}
                    title={btn.label}
                  >
                    <btn.icon className="h-5 w-5" />
                  </button>
                ))}
                
                {/* Role-based Add new dropdown - Mobile */}
                {((user?.role === 'ADMIN' || user?.role === 'COACH') || 
                  (user?.role === 'STAFF' && (userPermissions?.canCreateEvents || userPermissions?.canEditPlayers))) && (
                  <div className="relative add-dropdown-container">
                    <button 
                      onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:opacity-90 shadow-sm"
                      style={{ 
                        backgroundColor: colorScheme.primary,
                        color: 'white',
                        border: `1px solid ${colorScheme.primary}`
                      }}
                      title="Add new"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <div 
                      className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg transition-all duration-200 z-50 ${
                        addDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                      }`}
                      style={{ backgroundColor: colorScheme.surface, border: `1px solid ${colorScheme.border}` }}
                    >
                      <div className="py-1">
                        {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
                          <>
                            <button
                              onClick={() => {
                                router.push('/dashboard/players/new')
                                setAddDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                              style={{ color: colorScheme.text }}
                            >
                              Add Player
                            </button>
                            <button
                              onClick={() => {
                                router.push('/dashboard/staff/new')
                                setAddDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                              style={{ color: colorScheme.text }}
                            >
                              Add Staff
                            </button>
                            <button
                              onClick={() => {
                                router.push('/dashboard/events/new')
                                setAddDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                              style={{ color: colorScheme.text }}
                            >
                              Add Event
                            </button>
                          </>
                        )}
                        {user?.role === 'STAFF' && userPermissions?.canCreateEvents && (
                          <button
                            onClick={() => {
                              router.push('/dashboard/events/new')
                              setAddDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                            style={{ color: colorScheme.text }}
                          >
                            Add Event
                          </button>
                        )}
                        {user?.role === 'STAFF' && userPermissions?.canEditPlayers && (
                          <button
                            onClick={() => {
                              router.push('/dashboard/players/new')
                              setAddDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                            style={{ color: colorScheme.text }}
                          >
                            Add Player
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* User Info and Logout - Mobile */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-medium whitespace-nowrap" style={{ color: colorScheme.text }}>
                      {user?.firstName} {user?.lastName ? `${user.lastName.charAt(0)}.` : ''} • {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:opacity-90 shadow-sm"
                    style={{ 
                      backgroundColor: colorScheme.errorLight,
                      color: colorScheme.error,
                      border: `1px solid ${colorScheme.error}`
                    }}
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Desktop: All Quick Access Buttons in one row */}
              <div className="hidden sm:flex items-center gap-2">
                {quickAccessButtons.filter(btn => btn.show).map((btn) => (
                  <button
                    key={btn.key}
                    onClick={btn.onClick}
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:opacity-90 shadow-sm"
                    style={{
                      backgroundColor: colorScheme.surface,
                      color: colorScheme.text,
                      border: `1px solid ${colorScheme.border}`
                    }}
                    title={btn.label}
                  >
                    <btn.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              {/* Search bar (desktop only) */}
              <div className="hidden md:block md:ml-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colorScheme.textSecondary }} />
                  <input
                    type="text"
                    placeholder="Search players"
                    className="w-64 pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{ 
                      backgroundColor: colorScheme.surface,
                      color: colorScheme.text,
                      border: `1px solid ${colorScheme.border}`,
                      focusRingColor: colorScheme.primary
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Desktop: Right side - Theme, Chat, Notifications, User Info, Add new */}
            <div className="hidden sm:flex items-center justify-end gap-4">
              {/* Hide ThemeSelector when chat is open */}
              {!showTeamChat && <ThemeSelector />}
              
              {/* Team Chat Button with Notifications */}
              <ChatNotifications onOpenChat={() => setShowTeamChat(true)} />

              {/* Real-time Notifications */}
              <RealTimeNotifications userId={user?.id} userRole={user?.role} />
              
              {/* Role-based Add new dropdown - Desktop */}
              {((user?.role === 'ADMIN' || user?.role === 'COACH') || 
                (user?.role === 'STAFF' && (userPermissions?.canCreateEvents || userPermissions?.canEditPlayers))) && (
                <div className="relative add-dropdown-container">
                  <button 
                    onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                    className="flex items-center justify-center w-9 h-9 rounded-md transition-colors font-medium hover:opacity-90"
                    style={{ 
                      backgroundColor: colorScheme.primary,
                      color: 'white'
                    }}
                    title="Add new"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <div 
                    className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg transition-all duration-200 z-50 ${
                      addDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
                    style={{ backgroundColor: colorScheme.surface }}
                  >
                    <div className="py-1">
                      {/* Add Player - Admin, Coach, or Staff with edit permission */}
                      {(user?.role === 'ADMIN' || user?.role === 'COACH' || (user?.role === 'STAFF' && userPermissions?.canEditPlayers)) && (
                        <Link 
                          href="/dashboard/players/new" 
                          className="block px-4 py-2 text-sm transition-colors hover:bg-opacity-80"
                          style={{ 
                            color: colorScheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colorScheme.background
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          onClick={() => setAddDropdownOpen(false)}
                        >
                          Add Player
                        </Link>
                      )}
                      
                      {/* Add Event - Admin, Coach, or Staff with create permission */}
                      {(user?.role === 'ADMIN' || user?.role === 'COACH' || (user?.role === 'STAFF' && userPermissions?.canCreateEvents)) && (
                        <Link 
                          href="/dashboard/events/new" 
                          className="block px-4 py-2 text-sm transition-colors hover:bg-opacity-80"
                          style={{ 
                            color: colorScheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colorScheme.background
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          onClick={() => setAddDropdownOpen(false)}
                        >
                          Add Event
                        </Link>
                      )}
                      
                      {/* Add Team - Only Admin and Coach */}
                      {(user?.role === 'ADMIN' || user?.role === 'COACH') && (
                        <Link 
                          href="/dashboard/teams/new" 
                          className="block px-4 py-2 text-sm transition-colors hover:bg-opacity-80"
                          style={{ 
                            color: colorScheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colorScheme.background
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          onClick={() => setAddDropdownOpen(false)}
                        >
                          Add Team
                        </Link>
                      )}
                      
                      {/* Add Staff - Only Admin */}
                      {user?.role === 'ADMIN' && (
                        <Link 
                          href="/dashboard/staff/new" 
                          className="block px-4 py-2 text-sm transition-colors hover:bg-opacity-80"
                          style={{ 
                            color: colorScheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colorScheme.background
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          onClick={() => setAddDropdownOpen(false)}
                        >
                          Add Staff
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* User Info and Logout */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: colorScheme.text }}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs" style={{ color: colorScheme.textSecondary }}>
                    {user?.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-md transition-colors hover:bg-opacity-80"
                  style={{ 
                    backgroundColor: colorScheme.errorLight,
                    color: colorScheme.error,
                  }}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-0 sm:p-6">
          {children}
        </main>
      </div>

      {/* Team Chat Modal */}
      <TeamChat 
        isOpen={showTeamChat} 
        onClose={() => {
          setShowTeamChat(false)
          // Trigger notification refresh after closing chat
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('chat-closed'))
          }
        }} 
      />
    </div>
  )
}
