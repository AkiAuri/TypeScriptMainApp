"use client"

import { useState, useEffect } from "react"
import { Filter, TrendingUp, Loader2, BookOpen } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface GradesPageProps {
  user?: { id: number } | null
  onSubjectClick?: (subject: any) => void
}

interface SubjectGrade {
  id: number
  name: string
  code: string
  sectionName: string
  gradeLevelName: string
  semesterName: string
  schoolYear: string
  instructor: string
  color: string
  totalTasks: number
  submittedCount: number
  gradedCount: number
  averageGrade: number | null
  totalPoints: number
  highestGrade: number | null
  lowestGrade: number | null
  possiblePoints: number
}

interface OverallStats {
  averageGrade: number | null
  totalTasks: number
  submittedCount: number
  gradedCount: number
  pendingCount: number
  subjectsWithGrades: number
  totalSubjects: number
}

const getGradeColor = (grade: number | null) => {
  if (grade === null) return "text-slate-400"
  if (grade >= 75) return "text-green-400"
  if (grade >= 60) return "text-yellow-400"
  return "text-red-400"
}

const getGradeBackgroundColor = (grade: number | null) => {
  if (grade === null) return "from-slate-600 to-slate-700"
  if (grade >= 75) return "from-green-600 to-emerald-600"
  if (grade >= 60) return "from-yellow-600 to-amber-600"
  return "from-red-600 to-rose-600"
}

const getGradeLabel = (grade: number | null) => {
  if (grade === null) return "N/A"
  if (grade >= 90) return "Excellent"
  if (grade >= 80) return "Very Good"
  if (grade >= 75) return "Good"
  if (grade >= 60) return "Passing"
  return "Needs Improvement"
}

export default function GradesPage({ user, onSubjectClick }: GradesPageProps) {
  const [subjects, setSubjects] = useState<SubjectGrade[]>([])
  const [overall, setOverall] = useState<OverallStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSemester, setFilterSemester] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          studentId: String(user.id),
        })
        if (filterSemester !== 'all') params.append('semester', filterSemester)
        if (filterYear !== 'all') params.append('year', filterYear)

        const response = await fetch(`/api/student/grades?${params}`)
        const data = await response.json()

        if (data.success) {
          setSubjects(data.subjects)
          setOverall(data.overall)
          setAvailableSemesters(data.filters.semesters)
          setAvailableYears(data.filters.years)
        } else {
          setError(data.error || 'Failed to load grades')
        }
      } catch (err) {
        console.error('Failed to fetch grades:', err)
        setError('Failed to connect to server')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGrades()
  }, [user?.id, filterSemester, filterYear])

  const handleSubjectClick = (subject: SubjectGrade) => {
    if (onSubjectClick) {
      onSubjectClick({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        instructor: subject.instructor,
        color: `from-green-500 to-green-600`,
        activeTab: "grades",
      })
    }
  }

  const barChartData = subjects
      .filter(s => s.averageGrade !== null)
      .map(sub => ({
        name: sub.code,
        grade: sub.averageGrade,
        possible: 100,
        fullName: sub.name,
      }))

  const submissionStatusData = overall ? [
    { name: 'Graded', value: overall.gradedCount, color: '#10B981' },
    { name: 'Pending', value: overall.pendingCount, color: '#F59E0B' },
    { name: 'Not Submitted', value: overall.totalTasks - overall.submittedCount, color: '#EF4444' },
  ].filter(d => d.value > 0) : []

  if (isLoading) {
    return (
        <div className="space-y-6 p-6 text-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        </div>
    )
  }

  const overallGrade = overall?.averageGrade || null
  const overallGradeColor = getGradeBackgroundColor(overallGrade)

  return (
      <div className="space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-bold text-white mb-2">Grades</h1>
          <p className="text-slate-400">Review your academic performance</p>
        </header>

        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <Filter size={20} className="text-slate-400" />
          <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 outline-none"
          >
            <option value="all">All Semesters</option>
            {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
          <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 outline-none"
          >
            <option value="all">All Years</option>
            {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <section className={`bg-gradient-to-r ${overallGradeColor} text-white rounded-xl p-8 shadow-lg`}>
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-white/80 text-sm mb-2">Overall Grade Average</p>
              <p className="text-5xl font-bold">
                {overallGrade !== null ? overallGrade.toFixed(1) : 'N/A'}
              </p>
              <p className="text-white/70 text-sm mt-2">{getGradeLabel(overallGrade)}</p>
            </div>
            <TrendingUp size={64} className="text-white/30" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-white/70 text-xs">Total Tasks</p>
              <p className="text-2xl font-bold">{overall?.totalTasks || 0}</p>
            </div>
            <div>
              <p className="text-white/70 text-xs">Submitted</p>
              <p className="text-2xl font-bold">{overall?.submittedCount || 0}</p>
            </div>
            <div>
              <p className="text-white/70 text-xs">Graded</p>
              <p className="text-2xl font-bold">{overall?.gradedCount || 0}</p>
            </div>
            <div>
              <p className="text-white/70 text-xs">Pending</p>
              <p className="text-2xl font-bold">{overall?.pendingCount || 0}</p>
            </div>
          </div>
        </section>

        {subjects.length === 0 ? (
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No grade data found</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">Grades by Subject</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                    <YAxis tick={{ fill: "#cbd5e1" }} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                        labelFormatter={(label) => barChartData.find(d => d.name === label)?.fullName || label}
                    />
                    <Legend />
                    <Bar dataKey="grade" fill="#10B981" name="Your Grade" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="possible" fill="#475569" name="Possible" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">Submission Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                        data={submissionStatusData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
                        paddingAngle={2} dataKey="value"
                    >
                      {submissionStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
        )}
      </div>
  )
}