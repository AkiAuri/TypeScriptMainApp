"use client"

import { useState, useEffect } from "react"
import LandingPage from "@/components/landing-page"
import LoginPage from "@/components/login-page"
import TeacherDashboard from "@/components/teacher-dashboard"
import StudentLayout from "@/components/student/student-layout"
import InstructorLayout from "@/components/instructor/instructor-layout"
import AdminLayout from "@/components/admin/admin-layout"

// User type for storing logged-in user info
interface CurrentUser {
  id: number
  username:  string
  email: string
  fullName: string
  firstName?:  string
  lastName?: string
  role: "teacher" | "admin" | "student" | "instructor"
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"landing" | "login" | "teacher" | "admin" | "student" | "instructor">(
      "landing"
  )
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as CurrentUser
        setCurrentUser(user)

        // Navigate to appropriate dashboard
        if (user.role === "teacher" || user.role === "instructor") {
          setCurrentPage("instructor")
        } else if (user.role === "admin") {
          setCurrentPage("admin")
        } else if (user.role === "student") {
          setCurrentPage("student")
        }
      } catch (e) {
        localStorage.removeItem("user")
      }
    }
    setIsInitialized(true)
  }, [])

  const handleLogin = (
      role: "teacher" | "admin" | "student" | "instructor",
      username?: string,
      userId?: number,
      email?: string,
      fullName?: string,
      firstName?: string,
      lastName?:  string
  ) => {
    // Create user object
    const user:  CurrentUser = {
      id:  userId || 0,
      username: username || "",
      email:  email || "",
      fullName:  fullName || username || "",
      firstName: firstName,
      lastName:  lastName,
      role: role,
    }

    // Store user data in state
    setCurrentUser(user)

    // Store in localStorage for persistence (needed for QR attendance)
    localStorage.setItem("user", JSON.stringify(user))

    // Navigate to appropriate dashboard
    if (role === "teacher" || role === "instructor") {
      setCurrentPage("instructor")
    } else if (role === "admin") {
      setCurrentPage("admin")
    } else if (role === "student") {
      setCurrentPage("student")
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem("user")
    setCurrentPage("landing")
  }

  // Show loading state while checking for existing session
  if (!isInitialized) {
    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading... </p>
          </div>
        </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage onNavigate={(page) => setCurrentPage(page)} />
      case "login":
        return <LoginPage onLogin={handleLogin} onBack={() => setCurrentPage("landing")} />
      case "teacher":
        return <TeacherDashboard onLogout={handleLogout} />
      case "admin":
        return (
            <AdminLayout
                onLogout={handleLogout}
                userId={currentUser?.id}
                userName={currentUser?.fullName || currentUser?.username}
            />
        )
      case "student":
        return (
            <StudentLayout
                onLogout={handleLogout}
                user={currentUser}
                initialPage="subjects"
            />
        )
      case "instructor":
        return (
            <InstructorLayout
                onLogout={handleLogout}
                user={currentUser}
                initialPage="subjects"
            />
        )
      default:
        return <LandingPage onNavigate={(page) => setCurrentPage(page)} />
    }
  }

  return <div className="min-h-screen w-full bg-background overflow-x-hidden">{renderPage()}</div>
}