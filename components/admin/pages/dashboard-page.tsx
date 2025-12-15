"use client"

import { useState, useEffect } from "react"

interface AdminDashboardPageProps {
  onNavigate?: (page: string, tab?: string) => void
}

interface Activity {
  id: number
  action_type: string
  description: string
  created_at:  string
  full_name?:  string
}

interface Stats {
  schoolYears: number
  sections: number
  subjects: number
  instructors: number
  students: number
}

export default function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const [stats, setStats] = useState<Stats>({
    schoolYears:  0,
    sections: 0,
    subjects: 0,
    instructors: 0,
    students: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/dashboard')
      const data = await response.json()

      if (data.success) {
        setStats(data.data. stats)
        setActivities(data.data.activities)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num. toLocaleString()
  }

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  // Get activity icon based on action type and description
  const getActivityIcon = (actionType: string, description?:  string): string => {
    const desc = description?.toLowerCase() || ''

    // First check by action type
    switch (actionType) {
      case 'login':
        return '🔑'
      case 'logout':
        return '🚪'
      case 'create':
        // Check what was created
        if (desc.includes('student')) return '👨‍🎓'
        if (desc. includes('teacher') || desc.includes('instructor')) return '🧑‍🏫'
        if (desc.includes('admin')) return '👤'
        if (desc.includes('school year')) return '📅'
        if (desc.includes('semester')) return '📆'
        if (desc. includes('grade')) return '📊'
        if (desc.includes('section')) return '🏫'
        if (desc. includes('subject')) return '📚'
        if (desc.includes('enrolled') || desc.includes('assignment')) return '✅'
        if (desc.includes('assigned')) return '🔗'
        return '➕'
      case 'update':
        // Check what was updated
        if (desc.includes('password')) return '🔐'
        if (desc.includes('profile')) return '📝'
        if (desc.includes('student')) return '👨‍🎓'
        if (desc.includes('teacher') || desc.includes('instructor')) return '🧑‍🏫'
        if (desc.includes('admin')) return '👤'
        if (desc.includes('school year')) return '📅'
        if (desc.includes('semester')) return '📆'
        if (desc.includes('grade')) return '📊'
        if (desc.includes('section')) return '🏫'
        if (desc.includes('subject')) return '📚'
        return '✏️'
      case 'delete':
        // Check what was deleted
        if (desc.includes('student')) return '👨‍🎓'
        if (desc.includes('teacher') || desc.includes('instructor')) return '🧑‍🏫'
        if (desc.includes('admin')) return '👤'
        if (desc.includes('removed')) return '❌'
        return '🗑️'
      case 'submission':
        return '📄'
      case 'upload':
        return '📤'
      default:
        // Fallback - check description for legacy action types
        if (desc.includes('student')) return '👨‍🎓'
        if (desc.includes('teacher') || desc.includes('instructor')) return '🧑‍🏫'
        if (desc.includes('enrollment')) return '📝'
        if (desc.includes('semester')) return '📅'
        return '📌'
    }
  }

  // Get action color class based on type
  const getActionColorClass = (actionType: string): string => {
    switch (actionType) {
      case 'login':
        return 'bg-green-500/10 border-green-500/30'
      case 'logout':
        return 'bg-slate-500/10 border-slate-500/30'
      case 'create':
        return 'bg-green-500/10 border-green-500/30'
      case 'update':
        return 'bg-blue-500/10 border-blue-500/30'
      case 'delete':
        return 'bg-red-500/10 border-red-500/30'
      default:
        return 'bg-slate-500/10 border-slate-500/30'
    }
  }

  const statsConfig = [
    { label: "School Years", value: formatNumber(stats.schoolYears), icon: "📅", key: 'schoolYears' },
    { label: "Sections", value: formatNumber(stats.sections), icon: "🏫", key: 'sections' },
    { label: "Subjects", value: formatNumber(stats.subjects), icon: "📚", key:  'subjects' },
    { label: "Instructors", value: formatNumber(stats.instructors), icon: "🧑‍🏫", key: 'instructors' },
    { label: "Students", value: formatNumber(stats.students), icon: "👨‍🎓", key: 'students' },
  ]

  const handleAddStudent = () => {
    onNavigate?. ("accounts", "students")
  }

  const handleAddInstructor = () => {
    onNavigate?.("accounts", "instructors")
  }

  const handleCreateSchoolYear = () => {
    onNavigate?.("courses")
  }

  const handleViewAllLogs = () => {
    onNavigate?.("logs")
  }

  if (isLoading) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Loading... </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-4 bg-slate-700 rounded w-20 mb-4"></div>
                  <div className="h-8 bg-slate-700 rounded w-16"></div>
                </div>
            ))}
          </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="space-y-6 p-4 md: p-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-red-400">{error}</p>
          </div>
          <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
    )
  }

  return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">System overview and quick stats</p>
          </div>
          <button
              onClick={fetchDashboardData}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statsConfig.map((stat, index) => (
              <div
                  key={index}
                  className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat. label}</p>
                    <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <div className="text-4xl opacity-50">{stat.icon}</div>
                </div>
              </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activities */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white">Recent Activities</h3>
                <p className="text-xs text-slate-400 mt-1">Latest system updates</p>
              </div>
              <button
                  onClick={handleViewAllLogs}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="p-6 space-y-2">
              {activities.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No recent activities</p>
              ) : (
                  activities. slice(0, 5).map((activity, index) => (
                      <div
                          key={activity.id}
                          className={`py-3 px-3 rounded-lg border ${getActionColorClass(activity.action_type)} flex justify-between items-start ${
                              index < Math.min(activities.length, 5) - 1 ? 'mb-2' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getActivityIcon(activity. action_type, activity.description)}</span>
                          <div>
                            <p className="font-medium text-white text-sm">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {activity.full_name && (
                                  <>
                                    <span className="text-xs text-slate-500">by {activity.full_name}</span>
                                    <span className="text-xs text-slate-600">•</span>
                                  </>
                              )}
                              <p className="text-xs text-slate-400">{formatRelativeTime(activity. created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-slate-700/50">
              <h3 className="font-bold text-white">Quick Actions</h3>
              <p className="text-xs text-slate-400 mt-1">Common administrative tasks</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                  onClick={handleAddStudent}
                  className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors text-sm font-medium border border-blue-500/30 flex items-center justify-center gap-2"
              >
                <span>👨‍🎓</span> Add New Student
              </button>
              <button
                  onClick={handleAddInstructor}
                  className="w-full px-4 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg transition-colors text-sm font-medium border border-cyan-500/30 flex items-center justify-center gap-2"
              >
                <span>🧑‍🏫</span> Add New Instructor
              </button>
              <button
                  onClick={handleCreateSchoolYear}
                  className="w-full px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors text-sm font-medium border border-purple-500/30 flex items-center justify-center gap-2"
              >
                <span>📅</span> Create School Year
              </button>
            </div>
          </div>
        </div>
      </div>
  )
}