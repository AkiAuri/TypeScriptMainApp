"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

interface LoginPageProps {
  onLogin: (role: "teacher" | "admin" | "student", username?:  string) => void
  onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "newPassword">("email")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username. trim()) {
      setError("Please enter your username or email")
      return
    }
    if (!password) {
      setError("Please enter your password")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data. error || 'Invalid credentials.  Please check your username and password.')
        return
      }

      // Successfully authenticated
      onLogin(data.user. role, data.user.username)
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPasswordEmail = () => {
    if (!forgotEmail.trim()) {
      setError("Please enter your email")
      return
    }
    setError("")
    setForgotStep("code")
  }

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code")
      return
    }
    // Simulate code verification (in real app, would verify with Gmail)
    if (verificationCode === "123456") {
      setError("")
      setForgotStep("newPassword")
    } else {
      setError("Invalid verification code.")
    }
  }

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setError("")
    // In real app, would update password in database
    setTimeout(() => {
      setShowForgotPassword(false)
      setForgotStep("email")
      setForgotEmail("")
      setVerificationCode("")
      setNewPassword("")
      setConfirmPassword("")
      setError("")
    }, 1500)
  }

  return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <svg
                  className="h-12 w-12 text-primary"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
              >
                <path
                    d="M 60 80 Q 50 80 50 90 L 50 160 Q 50 170 60 170 L 80 170 Q 90 170 90 160 L 90 110 M 90 110 L 110 60 Q 115 45 125 45 Q 135 45 140 55 L 140 160 Q 140 170 150 170 L 160 170 Q 170 170 170 160 L 170 90 M 90 110 L 100 70 Q 105 50 115 50 Q 125 50 130 60 L 130 160 Q 130 170 140 170 L 150 170 Q 160 170 160 160 L 160 100"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <rect x="65" y="95" width="8" height="50" fill="#6366f1" rx="4" />
                <rect x="80" y="85" width="8" height="60" fill="#f59e0b" rx="4" />
                <rect x="95" y="90" width="8" height="55" fill="#ef4444" rx="4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to PRESENT</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </div>

          {! showForgotPassword ? (
              <Card className="border border-border/50 bg-card shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-foreground">Login</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter your credentials to access the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                          {error}
                        </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-foreground">
                        Username or Email
                      </Label>
                      <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                          className="bg-input border-border/50 focus:border-primary transition-colors"
                          autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target. value)}
                            disabled={isLoading}
                            className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                            disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all"
                        disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <button
                          onClick={() => setShowForgotPassword(true)}
                          className="text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ) : (
              <Card className="border border-border/50 bg-card shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-foreground">Recover Your Account</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {forgotStep === "email" && "Enter your email address"}
                    {forgotStep === "code" && "Enter the verification code from your email"}
                    {forgotStep === "newPassword" && "Create a new password"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                          {error}
                        </div>
                    )}

                    {forgotStep === "email" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                              <Mail size={16} /> Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                className="bg-input border-border/50 focus:border-primary transition-colors"
                            />
                          </div>
                          <Button onClick={handleForgotPasswordEmail} className="w-full bg-primary hover:bg-primary/90">
                            Send Verification Code
                          </Button>
                        </>
                    )}

                    {forgotStep === "code" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="code" className="text-foreground">
                              Verification Code
                            </Label>
                            <Input
                                id="code"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                                className="bg-input border-border/50 focus:border-primary transition-colors"
                            />
                          </div>
                          <Button onClick={handleVerifyCode} className="w-full bg-primary hover:bg-primary/90">
                            Verify Code
                          </Button>
                        </>
                    )}

                    {forgotStep === "newPassword" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="newPass" className="text-foreground flex items-center gap-2">
                              <Lock size={16} /> New Password
                            </Label>
                            <div className="relative">
                              <Input
                                  id="newPass"
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Enter new password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e. target.value)}
                                  className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowNewPassword(! showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPass" className="text-foreground">
                              Confirm Password
                            </Label>
                            <div className="relative">
                              <Input
                                  id="confirmPass"
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target. value)}
                                  className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(! showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <Button onClick={handleResetPassword} className="w-full bg-primary hover:bg-primary/90">
                            Update Password
                          </Button>
                        </>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => {
                          setShowForgotPassword(false)
                          setForgotStep("email")
                          setError("")
                        }}
                        className="w-full border-border/50"
                    >
                      Back to Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Back Button */}
          <Button
              variant="outline"
              className="w-full border-border/50 hover:bg-muted/30 text-foreground transition-colors bg-transparent"
              onClick={onBack}
          >
            Back to Home
          </Button>
        </div>
      </div>
  )
}