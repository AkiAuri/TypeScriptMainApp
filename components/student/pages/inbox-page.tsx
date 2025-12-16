"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight, Loader2, AlertTriangle, Clock, Calendar, CheckCircle,
  XCircle, FileText, TrendingUp, RefreshCw
} from "lucide-react"

interface Task {
  id: number
  taskName: string
  description?: string
  dueDate: string | null
  dueTime: string | null
  subjectId: number
  subjectName: string
  subjectCode: string
  folderName?: string
  instructor: string
  studentSubmissionId?: number
  submittedAt?: string
  grade?: number | null
  category: 'overdue' | 'today' | 'upcoming' | 'recent'
  status: 'pending' | 'submitted' | 'graded' | 'overdue'
  daysUntilDue: number | null
}

interface AttendanceRecord {
  id: number
  subjectId: number
  subjectName: string
  subjectCode: string
  date: string
  time?: string
  status: string
  markedAt?: string
}

interface GradeRecord {
  id: number
  taskId: number
  taskName: string
  subjectId: number
  subjectName: string
  subjectCode: string
  grade: number
  feedback?: string
  gradedAt: string
  submittedAt: string
}

interface InboxStats {
  overdueTasks: number
  todayTasks: number
  upcomingTasks: number
  pendingGrades: number
  recentGradesCount: number
  attendanceThisWeek: number
}

interface InboxPageProps {
  user?: { id: number } | null
  onSubjectClick?: (subject: any) => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'bg-green-900/30 text-green-300 border-green-700/50'
    case 'late': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50'
    case 'absent': return 'bg-red-900/30 text-red-300 border-red-700/50'
    case 'excused': return 'bg-blue-900/30 text-blue-300 border-blue-700/50'
    default: return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'present': return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'late': return <Clock className="w-4 h-4 text-yellow-400" />
    case 'absent': return <XCircle className="w-4 h-4 text-red-400" />
    case 'excused': return <AlertTriangle className="w-4 h-4 text-blue-400" />
    default: return null
  }
}

const getDueDateLabel = (daysUntilDue: number | null, dueDate: string | null) => {
  if (daysUntilDue === null || dueDate === null) return { label: 'No due date', color: 'bg-slate-800 text-slate-400' }
  if (daysUntilDue < 0) return { label: 'Overdue', color: 'bg-red-900/30 text-red-300' }
  if (daysUntilDue === 0) return { label: 'Today', color: 'bg-amber-900/30 text-amber-300' }
  if (daysUntilDue === 1) return { label: 'Tomorrow', color: 'bg-yellow-900/30 text-yellow-300' }
  if (daysUntilDue <= 3) return { label: `${daysUntilDue} days left`, color: 'bg-orange-900/30 text-orange-300' }
  return { label: `${daysUntilDue} days left`, color: 'bg-blue-900/30 text-blue-300' }
}

const getGradeColor = (grade: number) => {
  if (grade >= 75) return 'text-green-400'
  if (grade >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export default function InboxPage({ user, onSubjectClick }: InboxPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [stats, setStats] = useState<InboxStats | null>(null)
  const [tasks, setTasks] = useState<{
    overdue: Task[]
    today: Task[]
    upcoming: Task[]
    recent: Task[]
  }>({ overdue: [], today: [], upcoming: [], recent: [] })
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
  const [recentGrades, setRecentGrades] = useState<GradeRecord[]>([])
  const [activeCategory, setActiveCategory] = useState<'overdue' | 'today' | 'upcoming' | 'recent'>('today')

  const fetchInbox = async (showRefresh = false) => {
    if (!user?.id) return
    try {
      showRefresh ? setIsRefreshing(true) : setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/student/inbox?studentId=${user.id}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setTasks(data.tasks)
        setRecentAttendance(data.recentAttendance)
        setRecentGrades(data.recentGrades)

        if (data.tasks.overdue.length > 0) setActiveCategory('overdue')
        else if (data.tasks.today.length > 0) setActiveCategory('today')
        else if (data.tasks.upcoming.length > 0) setActiveCategory('upcoming')
        else setActiveCategory('recent')
      } else {
        setError(data.error || 'Failed to load inbox')
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { fetchInbox() }, [user?.id])

  const handleSubjectClick = (subjectId: number, subjectName: string, subjectCode: string, activeTab?: string) => {
    if (onSubjectClick) {
      onSubjectClick({
        id: subjectId,
        name: subjectName,
        code: subjectCode,
        activeTab: activeTab || 'overview',
      })
    }
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
    )
  }

  return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inbox</h1>
            <p className="text-slate-400">View your tasks, attendance, and grades</p>
          </div>
          <button
              onClick={() => fetchInbox(true)}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['overdue', 'today', 'upcoming', 'recent'] as const).map((cat) => {
            const config = {
              overdue: { icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/50', label: 'Overdue', val: stats?.overdueTasks },
              today: { icon: Clock, color: 'text-amber-400', border: 'border-amber-500/50', label: 'Due Today', val: stats?.todayTasks },
              upcoming: { icon: Calendar, color: 'text-blue-400', border: 'border-blue-500/50', label: 'Upcoming', val: stats?.upcomingTasks },
              recent: { icon: CheckCircle, color: 'text-green-400', border: 'border-green-500/50', label: 'Submitted', val: stats?.pendingGrades },
            }[cat]
            return (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`bg-slate-900 border rounded-xl p-4 text-left transition-colors ${
                        activeCategory === cat ? config.border : 'border-slate-700/50 hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                    <p className="text-slate-400 text-sm">{config.label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${config.color}`}>{config.val || 0}</p>
                </button>
            )
          })}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" /> Tasks
          </h2>
          {tasks[activeCategory]?.length > 0 ? (
              tasks[activeCategory].map((task) => {
                const dueDateInfo = getDueDateLabel(task.daysUntilDue, task.dueDate)
                return (
                    <button
                        key={task.id}
                        onClick={() => handleSubjectClick(task.subjectId, task.subjectName, task.subjectCode, 'submissions')}
                        className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-white truncate">{task.taskName}</h3>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{task.subjectName}</p>
                          <div className="flex items-center gap-3 flex-wrap text-xs">
                            {task.dueDate && <span className="text-slate-500">Due: {task.dueDate}</span>}
                            <span className={`px-2 py-1 rounded ${dueDateInfo.color}`}>{dueDateInfo.label}</span>
                            {task.status === 'graded' && <span className={`px-2 py-1 rounded bg-slate-800 font-bold ${getGradeColor(task.grade || 0)}`}>Grade: {task.grade}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                )
              })
          ) : (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">No {activeCategory} tasks</p>
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Attendance
            </h2>
            {recentAttendance.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleSubjectClick(item.subjectId, item.subjectName, item.subjectCode, 'attendance')}
                    className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{item.subjectName}</p>
                    <p className="text-xs text-slate-400">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(item.status)}`}>{item.status}</span>
                  </div>
                </button>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Recent Grades
            </h2>
            {recentGrades.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleSubjectClick(item.subjectId, item.subjectName, item.subjectCode, 'grades')}
                    className="w-full text-left p-4 bg-slate-900 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{item.taskName}</p>
                    <p className="text-xs text-slate-400">{item.subjectName}</p>
                  </div>
                  <span className={`text-2xl font-bold ${getGradeColor(item.grade)}`}>{item.grade}</span>
                </button>
            ))}
          </div>
        </div>
      </div>
  )
}