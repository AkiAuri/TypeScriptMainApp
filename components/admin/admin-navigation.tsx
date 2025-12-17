"use client"

import { Button } from "@/components/ui/button"
import { PresentLogoIcon } from "@/components/icons/present-logo"

interface AdminNavigationProps {
  currentPage: "dashboard" | "profile" | "accounts" | "courses" | "inbox"
  onPageChange: (page: "dashboard" | "profile" | "accounts" | "courses" | "inbox") => void
  onLogout: () => void
  sidebarOpen: boolean
  onSidebarToggle: (open: boolean) => void
}

export default function AdminNavigation({
                                          currentPage,
                                          onPageChange,
                                          onLogout,
                                          sidebarOpen,
                                          onSidebarToggle,
                                        }: AdminNavigationProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "accounts", label: "Accounts", icon: "👥" },
    { id: "courses", label: "Courses", icon: "📚" },
    { id: "inbox", label: "Inbox", icon: "📧" },
  ]

  return (
      <aside
          className={`${sidebarOpen ? "w-64" : "w-20"} bg-card border-r border-border transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PresentLogoIcon className={sidebarOpen ? "h-8 w-8" : "h-6 w-6"} />
            {sidebarOpen && <span className="font-bold text-foreground text-lg">PRESENT</span>}
          </div>
          <button
              onClick={() => onSidebarToggle(!sidebarOpen)}
              className="text-foreground hover:bg-muted p-2 rounded transition-colors"
              aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
              <button
                  key={item.id}
                  onClick={() => onPageChange(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      currentPage === item.id
                          ? "bg-primary/20 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive justify-start"
          >
            <span className="text-xl mr-3">↪</span>
            {sidebarOpen && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>
  )
}