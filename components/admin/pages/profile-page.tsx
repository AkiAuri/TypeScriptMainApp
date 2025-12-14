"use client"

import { useState, useEffect } from "react"
import { Mail, User, Briefcase, Shield, Eye, EyeOff, RefreshCw } from "lucide-react"

interface AdminProfilePageProps {
  userId?:  number
}

interface UserProfile {
  id: number
  username: string
  email: string
  firstName: string
  middleName: string
  lastName:  string
  fullName: string
  department: string
  employeeId: string
  role: string
}

export default function AdminProfilePage({ userId }: AdminProfilePageProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch profile data
  const fetchProfile = async () => {
    if (!userId) {
      setError("No user ID provided")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/auth/profile?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setProfile(data.user)
        setError("")
      } else {
        setError(data.error || "Failed to load profile")
      }
    } catch (err) {
      console.error("Profile fetch error:", err)
      setError("Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const handlePasswordChange = async () => {
    // Validate
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields")
      return
    }

    if (newPassword. length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    setIsChangingPassword(true)
    setPasswordError("")

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPassword,
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
        setPasswordError(data.error || "Failed to change password")
      }
    } catch (err) {
      console.error("Password change error:", err)
      setPasswordError("Failed to connect to server")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setPasswordSuccess(false)
  }

  // Loading state
  if (isLoading) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl shadow-xl overflow-hidden animate-pulse">
            <div className="px-6 md:px-8 py-12 md:py-16">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-2xl"></div>
                <div className="space-y-3">
                  <div className="h-8 bg-white/20 rounded w-48"></div>
                  <div className="h-4 bg-white/20 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-slate-400">Loading profile...</div>
        </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-300">{error || "Failed to load profile"}</p>
            <button
                onClick={fetchProfile}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    )
  }

  // Get role display text
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "teacher":
        return "Instructor"
      case "student":
        return "Student"
      default:
        return role
    }
  }

  return (
      <div className="space-y-6 p-4 md:p-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 md:px-8 py-12 md:py-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <User size={48} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{profile.fullName}</h1>
                  <p className="text-blue-100 text-lg mt-2">{profile.department || getRoleDisplay(profile.role)}</p>
                  <p className="text-blue-100/80 text-sm">
                    {profile.employeeId ?  `ID: ${profile.employeeId}` : `@${profile.username}`}
                  </p>
                </div>
              </div>
              <button
                  onClick={fetchProfile}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Refresh profile"
              >
                <RefreshCw size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User size={18} className="text-blue-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Username</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.username}</p>
            </div>

            {/* Full Name */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <User size={18} className="text-cyan-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{profile.fullName}</p>
            </div>

            {/* First Name */}
            {profile.firstName && (
                <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover: border-blue-500/50 rounded-xl p-5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <User size={18} className="text-blue-400" />
                    </div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">First Name</label>
                  </div>
                  <p className="text-white text-lg font-semibold ml-11">{profile. firstName}</p>
                </div>
            )}

            {/* Middle Name */}
            {profile.middleName && (
                <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <User size={18} className="text-cyan-400" />
                    </div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Middle Name</label>
                  </div>
                  <p className="text-white text-lg font-semibold ml-11">{profile.middleName}</p>
                </div>
            )}

            {/* Last Name */}
            {profile.lastName && (
                <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <User size={18} className="text-blue-400" />
                    </div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Name</label>
                  </div>
                  <p className="text-white text-lg font-semibold ml-11">{profile.lastName}</p>
                </div>
            )}

            {/* Email */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Mail size={18} className="text-cyan-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Address</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11 truncate">{profile.email}</p>
            </div>

            {/* Department */}
            {profile.department && (
                <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover: border-blue-500/50 rounded-xl p-5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Briefcase size={18} className="text-blue-400" />
                    </div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Department</label>
                  </div>
                  <p className="text-white text-lg font-semibold ml-11">{profile.department}</p>
                </div>
            )}

            {/* Role */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Shield size={18} className="text-cyan-400" />
                </div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</label>
              </div>
              <p className="text-white text-lg font-semibold ml-11">{getRoleDisplay(profile.role)}</p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Security</h2>
          <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full md:w-auto flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            <Shield size={20} />
            Change Password
          </button>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield size={24} />
                    Change Password
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  {! passwordSuccess ? (
                      <>
                        {/* Error Message */}
                        {passwordError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                              <p className="text-red-300 text-sm">{passwordError}</p>
                            </div>
                        )}

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
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus: border-blue-500 focus: ring-1 focus:ring-blue-500"
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
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">New Password</label>
                          <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target. value)}
                                placeholder="Enter new password"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Confirm Password</label>
                          <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

                        {/* Password mismatch warning */}
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                              <p className="text-yellow-300 text-sm">Passwords do not match</p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                          <button
                              onClick={closePasswordModal}
                              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                              disabled={isChangingPassword}
                          >
                            Cancel
                          </button>
                          <button
                              onClick={handlePasswordChange}
                              disabled={! newPassword || !confirmPassword || newPassword !== confirmPassword || isChangingPassword}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                          >
                            {isChangingPassword ? "Updating..." : "Update Password"}
                          </button>
                        </div>
                      </>
                  ) : (
                      <div className="py-8 text-center space-y-3">
                        <div className="w-16 h-16 mx-auto bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center">
                          <div className="text-2xl text-green-400">✓</div>
                        </div>
                        <p className="text-white font-semibold">Password Updated! </p>
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