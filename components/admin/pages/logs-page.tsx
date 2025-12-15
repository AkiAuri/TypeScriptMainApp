"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock,
  User,
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  LogIn,
  LogOut,
  Upload,
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle
} from "lucide-react"

interface LogEntry {
  id: number
  user_id: number | null
  action_type: "login" | "logout" | "submission" | "upload" | "create" | "update" | "delete"
  description: string | null
  created_at: string
  username:  string | null
  full_name: string
}

const getActionIcon = (type: string) => {
  switch (type) {
    case "login":
      return <LogIn className="w-4 h-4" />
    case "logout":
      return <LogOut className="w-4 h-4" />
    case "create":
      return <Plus className="w-4 h-4" />
    case "update":
      return <Edit2 className="w-4 h-4" />
    case "delete":
      return <Trash2 className="w-4 h-4" />
    case "submission":
      return <FileText className="w-4 h-4" />
    case "upload":
      return <Upload className="w-4 h-4" />
    default:
      return <CheckCircle className="w-4 h-4" />
  }
}

const getActionColor = (type: string) => {
  switch (type) {
    case "login":
      return "bg-green-500/20 text-green-400"
    case "logout":
      return "bg-slate-500/20 text-slate-400"
    case "create":
      return "bg-green-500/20 text-green-400"
    case "update":
      return "bg-blue-500/20 text-blue-400"
    case "delete":
      return "bg-red-500/20 text-red-400"
    case "submission":
      return "bg-blue-500/20 text-blue-400"
    case "upload":
      return "bg-green-500/20 text-green-400"
    default:
      return "bg-slate-500/20 text-slate-400"
  }
}

const getActionLabel = (type: string) => {
  switch (type) {
    case "login":
      return "Login"
    case "logout":
      return "Logout"
    case "create":
      return "Created"
    case "update":
      return "Updated"
    case "delete":
      return "Deleted"
    case "submission":
      return "Submission"
    case "upload":
      return "Upload"
    default:
      return type. charAt(0).toUpperCase() + type.slice(1)
  }
}

const getTargetFromDescription = (description: string | null, actionType: string): string => {
  if (!description) return actionType. charAt(0).toUpperCase() + actionType.slice(1)

  // Try to extract target from description
  if (description. toLowerCase().includes("student")) return "Student"
  if (description.toLowerCase().includes("teacher") || description.toLowerCase().includes("instructor")) return "Instructor"
  if (description.toLowerCase().includes("admin")) return "Admin"
  if (description.toLowerCase().includes("school year")) return "School Year"
  if (description.toLowerCase().includes("semester")) return "Semester"
  if (description.toLowerCase().includes("grade")) return "Grade Level"
  if (description.toLowerCase().includes("section")) return "Section"
  if (description.toLowerCase().includes("subject")) return "Subject"
  if (description.toLowerCase().includes("logged in") || description.toLowerCase().includes("login")) return "Session"
  if (description.toLowerCase().includes("logged out") || description.toLowerCase().includes("logout")) return "Session"

  return actionType.charAt(0).toUpperCase() + actionType.slice(1)
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now. getTime() - date.getTime()
  const hours = Math. floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (hours > 24) return date.toLocaleDateString()
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "Just now"
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/logs? limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch logs")
      }
      const data = await response. json()
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
      <>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/75 backdrop-blur-md px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-400" />
                Activity Logs
              </h1>
              <p className="text-slate-400 mt-1">Track all changes and activities performed by administrators</p>
            </div>
            <Button
                onClick={fetchLogs}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                disabled={isLoading}
            >
              {isLoading ?  (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-4 md:p-8">
          {/* Error State */}
          {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
                <Button
                    onClick={fetchLogs}
                    variant="outline"
                    size="sm"
                    className="ml-auto border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  Retry
                </Button>
              </div>
          )}

          {/* Loading State */}
          {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="ml-3 text-slate-400">Loading activity logs...</span>
              </div>
          )}

          {/* Logs List */}
          {! isLoading && !error && (
              <div className="space-y-4">
                {logs.map((log) => {
                  const timestamp = new Date(log.created_at)
                  return (
                      <div
                          key={log.id}
                          className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-lg p-5 hover:border-slate-600/80 transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-2. 5 rounded-lg ${getActionColor(log.action_type)} flex-shrink-0`}>
                            {getActionIcon(log. action_type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-white font-semibold">{getActionLabel(log.action_type)}</h3>
                              <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-slate-300 text-xs">
                                {getTargetFromDescription(log.description, log.action_type)}
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-sm">{log.description || "No description"}</p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                              <User className="w-3 h-3" />
                              <span>{log.full_name}</span>
                              <span>•</span>
                              <span>{formatTime(log.created_at)}</span>
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-slate-400 text-sm">
                              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-slate-500 text-xs">{timestamp.toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                  )
                })}
              </div>
          )}

          {/* Empty State */}
          {!isLoading && ! error && logs.length === 0 && (
              <Card className="border-slate-700 bg-slate-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No activities logged yet</p>
                    <p className="text-slate-500 text-sm mt-1">Activity logs will appear here when actions are performed</p>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>
      </>
  )
}