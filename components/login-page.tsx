"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { PresentLogoIcon } from "@/components/icons/present-logo"

interface LoginPageProps {
  onLogin: (
      role: "teacher" | "admin" | "student" | "instructor",
      username?: string,
      userId?: number,
      email?: string,
      fullName?: string
  ) => void
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

    if (!username.trim()) {
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

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        setError('Server error. Please try again later.')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid credentials. Please check your username and password.')
        return
      }

      if (!data.success) {
        setError(data.error || 'Login failed')
        return
      }

      const role = data.user.role === 'teacher' ? 'instructor' : data.user.role

      onLogin(
          role,
          data.user.username,
          data.user.id,
          data.user.email,
          data.user.fullName
      )
    } catch (err) {
      console.error('Login error:', err)
      setError('Connection error. Please check your internet and try again.')
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
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <PresentLogoIcon className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to PRESENT</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </div>

          {!showForgotPassword ? (
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
                      <Label htmlFor="username">Username or Email</Label>
                      <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username or email"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                          className="bg-input border-border/50 focus:border-primary transition-colors"
                          autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                    <button
                        onClick={() => setShowForgotPassword(true)}
                        className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Forgot Password?
                    </button>
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
                            <Label htmlFor="code">Verification Code</Label>
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
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPass">Confirm Password</Label>
                            <div className="relative">
                              <Input
                                  id="confirmPass"
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  className="bg-input border-border/50 focus:border-primary transition-colors pr-10"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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