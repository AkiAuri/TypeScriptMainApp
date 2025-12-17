"use client"

import { useState } from "react"
import { Menu, X, User, BookOpen, BarChart3, Clock, Mail, LogOut } from "lucide-react"
import { PresentLogoIcon } from "@/components/icons/present-logo"
import StudentProfile from "./pages/profile-page"
import SubjectsPage from "./pages/subjects-page"
import AttendancePage from "./pages/attendance-page"
import GradesPage from "./pages/grades-page"
import InboxPage from "./pages/inbox-page"
import SubjectDetail from "./pages/subject-detail-page"

interface UserData {
  id: number
  username:  string
  email: string
  fullName: string
  firstName?:  string
  lastName?: string
  role: string
}

interface StudentLayoutProps {
  onLogout: () => void
  user?: UserData | null
  studentName?: string
  initialPage?: "profile" | "subjects" | "attendance" | "grades" | "inbox"
  userId?: number
}

export default function StudentLayout({
                                        onLogout,
                                        user,
                                        studentName,
                                        initialPage = "profile",
                                        userId,
                                      }: StudentLayoutProps) {
  const [currentPage, setCurrentPage] = useState<
      "profile" | "subjects" | "attendance" | "grades" | "inbox" | "subject-detail"
  >(initialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<any>(null)

  // Get display name and student ID from user data (with fallbacks)
  const displayName = user?.fullName || user?.firstName || studentName || "Student"
  const studentId = user?.id || userId || null

  const navItems = [
    { id: "profile", label: "Profile", icon:  User },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "grades", label: "Grades", icon: BarChart3 },
    { id: "inbox", label: "Inbox", icon: Mail },
  ]

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId as any)
    setSidebarOpen(false)
  }

  const handleSubjectClick = (subject: any) => {
    setSelectedSubject(subject)
    setCurrentPage("subject-detail")
  }

  const handleLogout = () => {
    setSidebarOpen(false)
    onLogout()
  }

  const renderPage = () => {
    switch (currentPage) {
      case "profile":
        return <StudentProfile studentName={displayName} userId={studentId} />
      case "subjects":
        return <SubjectsPage studentId={studentId} onSubjectClick={handleSubjectClick} />
      case "attendance":
        return <AttendancePage user={user} onSubjectClick={handleSubjectClick} />
      case "grades":
        return <GradesPage user={user} onSubjectClick={handleSubjectClick} />
      case "inbox":
        return <InboxPage user={user} onSubjectClick={handleSubjectClick} />
      case "subject-detail":
        return (
            <SubjectDetail
                subject={selectedSubject}
                studentId={studentId}
                onBack={() => setCurrentPage("subjects")}
            />
        )
      default:
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-background pt-24 px-4">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back, {displayName}!</h1>
                <p className="text-muted-foreground mb-12">Here's what's happening in your courses today.</p>
              </div>
            </div>
        )
    }
  }

  return (
      <div className="min-h-screen bg-slate-950">
        {/* Mobile Overlay */}
        <div
            className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
                sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside
            className={`fixed left-0 top-0 h-screen w-64 bg-card border-r border-border/50 shadow-lg transition-transform duration-300 z-50 flex flex-col ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md: translate-x-0`}
        >
          {/* Logo Header */}
          <div className="bg-gradient-to-b from-green-600 to-green-700 p-6 text-card-foreground">
            <div className="flex items-center gap-3 mb-2">
              <PresentLogoIcon className="h-10 w-10" />
              <h2 className="text-xl font-bold">PRESENT</h2>
            </div>
            <p className="text-sm opacity-90">Student Portal</p>
          </div>

          {/* User Info */}
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm text-muted-foreground">Logged in as</p>
            <p className="font-medium text-foreground truncate">{displayName}</p>
            {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id || (currentPage === "subject-detail" && item.id === "subjects")
              return (
                  <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                              ? "bg-green-500/20 text-green-400 border-l-2 border-green-500"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-border/50">
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 transition-all duration-300">
          {/* Top Header */}
          <header className="sticky top-0 z-30 border-b border-border/50 bg-background/75 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 sm:px-6">
              <button
                  onClick={() => setSidebarOpen(! sidebarOpen)}
                  className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {sidebarOpen ?  <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex-1" />
            </div>
          </header>

          {/* Page Content */}
          <div>{renderPage()}</div>
        </main>
      </div>
  )
}