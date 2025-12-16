"use client"

import { useState, useEffect } from "react"
import { Filter, Loader2, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface AttendancePageProps {
  user?: { id: number } | null
  onSubjectClick?: (subject: any) => void
}

interface SubjectAttendance {
  id: number
  name: string
  code: string
  sectionName: string
  gradeLevelName: string
  semesterName: string
  schoolYear: string
  instructor: string
  color: string
  attendance: number
  totalSessions: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  attendedCount: number
}

interface OverallStats {
  attendanceRate: number
  totalSessions: number
  classesAttended: number
  classesAbsent: number
  classesLate: number
  classesExcused: number
}

const getAttendanceColor = (attendance: number) => {
  if (attendance >= 80) return "text-green-400"
  if (attendance >= 60) return "text-yellow-400"
  return "text-red-400"
}

const getAttendanceBackgroundColor = (attendance: number) => {
  if (attendance >= 80) return "from-green-600 to-emerald-600"
  if (attendance >= 60) return "from-yellow-600 to-amber-600"
  return "from-red-600 to-rose-600"
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'present':
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'late':
      return <Clock className="w-4 h-4 text-yellow-400" />
    case 'absent':
      return <XCircle className="w-4 h-4 text-red-400" />
    case 'excused':
      return <AlertCircle className="w-4 h-4 text-blue-400" />
    default:
      return <XCircle className="w-4 h-4 text-slate-400" />
  }
}

export default function AttendancePage({ user, onSubjectClick }: AttendancePageProps) {
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([])
  const [overall, setOverall] = useState<OverallStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSemester, setFilterSemester] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          studentId: String(user.id),
        })
        if (filterSemester !== 'all') params.append('semester', filterSemester)
        if (filterYear !== 'all') params.append('year', filterYear)

        const response = await fetch(`/api/student/attendance?${params}`)
        const data = await response.json()

        if (data.success) {
          setSubjects(data.subjects)
          setOverall(data.overall)
          setAvailableSemesters(data.filters.semesters)
          setAvailableYears(data.filters.years)
        } else {
          setError(data.error || 'Failed to load attendance')
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err)
        setError('Failed to connect to server')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAttendance()
  }, [user?.id, filterSemester, filterYear])

  const handleSubjectClick = (subject: SubjectAttendance) => {
    if (onSubjectClick) {
      onSubjectClick({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        instructor: subject.instructor,
        color: `from-blue-500 to-blue-600`,
        activeTab: "attendance",
      })
    }
  }

  const overallChartData = overall ? [
    { name: 'Present', value: overall.classesAttended - (overall.classesLate || 0), color: '#10B981' },
    { name: 'Late', value: overall.classesLate || 0, color: '#F59E0B' },
    { name: 'Absent', value: overall.classesAbsent, color: '#EF4444' },
    { name: 'Excused', value: overall.classesExcused || 0, color: '#3B82F6' },
  ].filter(d => d.value > 0) : []

  if (isLoading) {
    return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
            <p className="text-slate-400">Track your attendance across all subjects</p>
          </div>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        </div>
    )
  }

  const overallAttendance = overall?.attendanceRate || 0
  const overallAttendanceColor = getAttendanceBackgroundColor(overallAttendance)

  return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
          <p className="text-slate-400">Track your attendance across all subjects</p>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter size={20} className="text-slate-400" />
            <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-100 outline-none hover:border-slate-600 transition-colors"
            >
              <option value="all">All Semesters</option>
              {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
            <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-100 outline-none hover:border-slate-600 transition-colors"
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`bg-gradient-to-r ${overallAttendanceColor} text-white rounded-xl p-8 shadow-lg`}>
          <h2 className="text-2xl font-bold mb-6">Overall Attendance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-white/80 text-sm mb-2">Average</p>
              <p className="text-4xl font-bold">{overallAttendance}%</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Total Sessions</p>
              <p className="text-4xl font-bold">{overall?.totalSessions || 0}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Present</p>
              <p className="text-4xl font-bold">{(overall?.classesAttended || 0) - (overall?.classesLate || 0)}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Late</p>
              <p className="text-4xl font-bold">{overall?.classesLate || 0}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Absent</p>
              <p className="text-4xl font-bold">{overall?.classesAbsent || 0}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Excused</p>
              <p className="text-4xl font-bold">{overall?.classesExcused || 0}</p>
            </div>
          </div>
        </div>

        {subjects.length === 0 ? (
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No attendance data found</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">Attendance Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                        data={overallChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                    >
                      {overallChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">By Subject</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {subjects.map((subject) => (
                      <button
                          key={subject.id}
                          onClick={() => handleSubjectClick(subject)}
                          className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700/50"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                          <div>
                            <span className="font-medium text-white block">{subject.name}</span>
                            <span className="text-xs text-slate-400">{subject.code} • {subject.totalSessions} sessions</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${getAttendanceColor(subject.attendance)}`}>{subject.attendance}%</span>
                        </div>
                      </button>
                  ))}
                </div>
              </div>
            </div>
        )}
      </div>
  )
}