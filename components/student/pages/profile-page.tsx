"use client"

import { useState, useEffect, useCallback } from "react"
import { Mail, User, Hash, Shield, Eye, EyeOff, RefreshCw, Loader2, BookOpen, Calendar, Clock } from "lucide-react"

interface StudentProfileProps {
  studentName?: string
  userId?: number | null
}

interface ProfileData {
  id: number
  username: string
  email: string
  role: string
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  studentNumber: string
  department: string
  phone: string
  address: string
  createdAt: string
}

interface ProfileStats {
  enrolledSubjects: number
  attendanceRate: number | null
}

export default function StudentProfile({ studentName, userId }: StudentProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ enrolledSubjects: 0, attendanceRate: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/student/profile?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setProfile(data.profile)
        setStats(data.stats)
      } else {
        setError(data.error || "Failed to fetch profile")
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handlePasswordChange = async () => {
    if (!userId) return
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    setIsUpdatingPassword(true)
    setPasswordError(null)

    try {
      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPasswordSuccess(true)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordSuccess(false)
        }, 2000)
      } else {
        setPasswordError(data.error || "Failed to update password")
      }
    } catch (err) {
      console.error("Failed to update password:", err)
      setPasswordError("Failed to connect to server")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordSuccess(false)
    setPasswordError(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setShowCurrentPassword(false)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // No user ID
  if (!userId) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400">Unable to load profile. Please log in again.</p>
          </div>
        </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
            <span className="ml-3 text-slate-400">Loading profile...</span>
          </div>
        </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <p className="text-red-400">{error || "Profile not found"}</p>
            <button
                onClick={fetchProfile}
                className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6 p-4 md:p-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 md:px-8 py-12 md:py-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <User size={48} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {profile.fullName || studentName || "Student"}
                  </h1>
                  <p className="text-green-100 text-lg mt-2">
                    {profile.department || "Student"}
                  </p>
                  <p className="text-green-100/80 text-sm">
                    Student ID: {profile.studentNumber || "N/A"}
                  </p>
                </div>
              </div>
              <button
                  onClick={fetchProfile}
                  className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <BookOpen size={24} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.enrolledSubjects}</p>
                <p className="text-sm text-slate-400">Enrolled Subjects</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Clock size={24} className="text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                    stats.attendanceRate === null
                        ? "text-slate-500"
                        : stats.attendanceRate >= 80
                            ? "text-green-400"
                            : stats.attendanceRate >= 60
                                ? "text-yellow-400"
                                : "text-red-400"
                }`}>
                  {stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "N/A"}
                </p>
                <p className="text-sm text-slate-400">Attendance Rate</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Calendar size={24} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{formatDate(profile.createdAt)}</p>
                <p className="text-sm text-slate-400">Member Since</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <User size={18} className="text-green-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.fullName || "Not set"}</p>
            </div>

            {/* First Name */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <User size={18} className="text-emerald-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">First Name</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.firstName || "Not set"}</p>
            </div>

            {/* Middle Name */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <User size={18} className="text-green-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Middle Name</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.middleName || "Not set"}</p>
            </div>

            {/* Last Name */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <User size={18} className="text-emerald-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Name</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.lastName || "Not set"}</p>
            </div>

            {/* Email */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Mail size={18} className="text-green-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Address</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11 truncate">{profile.email || "Not set"}</p>
            </div>

            {/* Student Number */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Hash size={18} className="text-emerald-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Student Number</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.studentNumber || "Not set"}</p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Security</h2>
          <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full md:w-auto flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            <Shield size={20} />
            Change Password
          </button>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield size={24} />
                    Change Password
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  {!passwordSuccess ? (
                      <>
                        {/* Current Password (Optional) */}
                        <div>
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">
                            Current Password <span className="text-slate-500">(optional)</span>
                          </label>
                          <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">New Password *</label>
                          <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Confirm Password *</label>
                          <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Error Messages */}
                        {passwordError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                              <p className="text-red-300 text-sm">{passwordError}</p>
                            </div>
                        )}

                        {newPassword && confirmPassword && newPassword !== confirmPassword && !passwordError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                              <p className="text-red-300 text-sm">Passwords do not match</p>
                            </div>
                        )}

                        {newPassword && newPassword.length < 6 && (
                            <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                              <p className="text-yellow-300 text-sm">Password must be at least 6 characters</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                          <button
                              onClick={closePasswordModal}
                              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                              onClick={handlePasswordChange}
                              disabled={
                                  isUpdatingPassword ||
                                  !newPassword ||
                                  !confirmPassword ||
                                  newPassword !== confirmPassword ||
                                  newPassword.length < 6
                              }
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                          >
                            {isUpdatingPassword ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                          </button>
                        </div>
                      </>
                  ) : (
                      <div className="py-8 text-center space-y-3">
                        <div className="w-16 h-16 mx-auto bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center">
                          <div className="text-2xl text-green-400">✓</div>
                        </div>
                        <p className="text-white font-semibold">Password Updated!</p>
                        <p className="text-slate-400 text-sm">Your password has been successfully changed.</p>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  )
}