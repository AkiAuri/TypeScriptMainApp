"use client"

import { useState } from "react"
import { Menu, X, User, BookOpen, BarChart3, Clock, Mail, LogOut } from "lucide-react"
import { PresentLogoIcon } from "@/components/icons/present-logo"
import InstructorProfile from "./pages/profile-page"
import InstructorSubjects from "./pages/subjects-page"
import InstructorAttendance from "./pages/attendance-page"
import InstructorGrades from "./pages/grades-page"
import InstructorInbox from "./pages/inbox-page"
import InstructorSubjectDetail from "./pages/subject-detail-page"

interface UserData {
  id: number
  username: string
  email: string
  fullName: string
  firstName?: string
  lastName?: string
  role: string
}

interface InstructorLayoutProps {
  onLogout: () => void
  user?: UserData | null
  initialPage?: "profile" | "subjects" | "attendance" | "grades" | "inbox"
}

export default function InstructorLayout({
                                           onLogout,
                                           user,
                                           initialPage = "profile",
                                         }: InstructorLayoutProps) {
  const [currentPage, setCurrentPage] = useState<
      "profile" | "subjects" | "attendance" | "grades" | "inbox" | "subject-detail"
  >(initialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [activeSubjectTab, setActiveSubjectTab] = useState<"content" | "attendance" | "grades" | "members">("content")

  const displayName = user?.fullName || user?.firstName || user?.username || "Instructor"
  const teacherId = user?.id || null

  const navItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "grades", label: "Grades", icon: BarChart3 },
    { id: "inbox", label: "Inbox", icon: Mail },
  ]

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId as any)
    setSidebarOpen(false)
    if (pageId !== "subject-detail") {
      setActiveSubjectTab("content")
    }
  }

  const handleSubjectClick = (subject: any, tabType?: "attendance" | "grades" | "members") => {
    setSelectedSubject(subject)
    setCurrentPage("subject-detail")
    setActiveSubjectTab(tabType || "content")
  }

  const handleLogout = () => {
    setSidebarOpen(false)
    onLogout()
  }

  const renderPage = () => {
    switch (currentPage) {
      case "profile":
        return <InstructorProfile instructorName={displayName} userId={teacherId} />
      case "subjects":
        return <InstructorSubjects teacherId={teacherId} onSubjectClick={handleSubjectClick} />
      case "attendance":
        return <InstructorAttendance teacherId={teacherId} onSubjectClick={handleSubjectClick} />
      case "grades":
        return <InstructorGrades teacherId={teacherId} onSubjectClick={handleSubjectClick} />
      case "inbox":
        return <InstructorInbox teacherId={teacherId} onItemClick={handleSubjectClick} />
      case "subject-detail":
        return (
            <InstructorSubjectDetail
                subject={selectedSubject}
                initialTab={activeSubjectTab}
                onBack={() => setCurrentPage("subjects")}
            />
        )
      default:
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-background pt-24 px-4">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back, {displayName}!</h1>
                <p className="text-muted-foreground mb-12">Manage your courses and student progress.</p>
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
            } md:translate-x-0`}
        >
          <div className="bg-gradient-to-b from-primary to-primary/80 p-6 text-card-foreground">
            <div className="flex items-center gap-3 mb-2">
              <PresentLogoIcon className="h-10 w-10" />
              <h2 className="text-xl font-bold">PRESENT</h2>
            </div>
            <p className="text-sm opacity-90">Instructor Portal</p>
          </div>

          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm text-muted-foreground">Logged in as</p>
            <p className="font-medium text-foreground truncate">{displayName}</p>
            {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                  <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                              ? "bg-primary/20 text-primary border-l-2 border-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
              )
            })}
          </nav>

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
          <header className="sticky top-0 z-30 border-b border-border/50 bg-background/75 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 sm:px-6">
              <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex-1" />
            </div>
          </header>

          <div>{renderPage()}</div>
        </main>
      </div>
  )
}