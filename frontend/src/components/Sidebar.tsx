'use client'

import { Link, useLocation } from 'react-router-dom'
import {
  X,
  Home,
  Ticket,
  Users,
  HelpCircle,
  Bell,
  User,
  Bot,
  BarChart3,
  Plus,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const { unreadCount } = useNotifications()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    {
      name: 'All Tickets',
      href: '/tickets',
      icon: Ticket,
      roles: ['AGENT', 'ADMIN'],
    },
    { name: 'My Tickets', href: '/tickets/my', icon: Ticket },
    {
      name: 'Assigned Tickets',
      href: '/tickets/assigned',
      icon: Ticket,
      roles: ['AGENT', 'ADMIN'],
    },
    {
      name: 'Departments',
      href: '/departments',
      icon: Users,
      roles: ['AGENT', 'ADMIN'],
    },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadCount,
    },
    {
      name: 'Document Management',
      href: '/admin/documents',
      icon: FileText,
      roles: ['ADMIN'],
    },
    { name: 'AI Assistant', href: '/ai/assistant', icon: Bot },
    {
      name: 'AI Insights',
      href: '/ai/insights',
      icon: BarChart3,
      roles: ['ADMIN'],
    },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user?.role || 'EMPLOYEE')
  )

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          'flex flex-col h-screen',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b flex-shrink-0">
          <h1 className="text-xl font-bold">Helpdesk</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b flex-shrink-0">
          <Link to="/tickets/new">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        </div>

        <nav className="flex-grow overflow-y-auto min-h-0 px-4 py-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' &&
                location.pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                onClick={() => onOpenChange(false)}
              >
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white border-red-500">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t bg-card flex-shrink-0">
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
