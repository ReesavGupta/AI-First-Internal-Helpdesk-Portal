"use client"

import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationDropdown } from "./NotificationDropdown"
import { UserDropdown } from "./UserDropdown"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative w-96 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets, FAQs..." className="pl-10" />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </header>
  )
}
