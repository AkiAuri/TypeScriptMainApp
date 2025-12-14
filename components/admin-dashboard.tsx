"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface AdminDashboardProps {
  onLogout: () => void
}

interface User {
  id: number
  username: string
  email:  string
  role: 'admin' | 'teacher' | 'student'
  created_at: string
  updated_at: string
}

type ActiveView = 'dashboard' | 'accounts' | 'security'

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    userDistribution: [] as any[],
    activityData:  [] as any[],
  })

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchUsers()
  }, [])

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (! response.ok) {
        setError(data.error)
        return
      }

      setSuccess('User created successfully!')
      setShowAddUser(false)
      setFormData({ username: '', email:  '', password: '', role: 'student' })
      fetchUsers()
      fetchStats()
    } catch (err) {
      setError('Failed to create user')
    }
  }

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setSuccess('User updated successfully!')
      setShowEditUser(false)
      setSelectedUser(null)
      setFormData({ username: '', email: '', password: '', role:  'student' })
      fetchUsers()
    } catch (err) {
      setError('Failed to update user')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    if (! confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        fetchUsers()
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
    })
    setShowEditUser(true)
  }

  // User distribution for pie chart
  const userDistributionData = [
    { name: "Students", value: users.filter(u => u.role === 'student').length, fill: "var(--color-primary)" },
    { name: "Teachers", value: users.filter(u => u.role === 'teacher').length, fill: "var(--color-secondary)" },
    { name: "Admins", value: users.filter(u => u.role === 'admin').length, fill: "var(--color-accent)" },
  ]

  // Placeholder activity data (replace with real data from stats)
  const activityData = stats.activityData.length > 0 ? stats.activityData : [
    { name: "Mon", logins: 0, submissions: 0, uploads:  0 },
    { name: "Tue", logins:  0, submissions: 0, uploads: 0 },
    { name: "Wed", logins: 0, submissions: 0, uploads: 0 },
    { name: "Thu", logins: 0, submissions: 0, uploads: 0 },
    { name: "Fri", logins: 0, submissions: 0, uploads: 0 },
    { name: "Sat", logins: 0, submissions: 0, uploads:  0 },
    { name: "Sun", logins: 0, submissions: 0, uploads: 0 },
  ]

  const systemStatsData = [
    { label: "Total Users", value: users.length. toString(), icon: "👥", color: "bg-primary/10" },
    { label: "Teachers", value: users.filter(u => u.role === 'teacher').length.toString(), icon: "👨‍🏫", color: "bg-secondary/10" },
    { label: "Students", value:  users.filter(u => u. role === 'student').length.toString(), icon: "🎓", color: "bg-chart-1/10" },
  ]

  const navItems = [
    { icon: "📊", label: "Dashboard", view: 'dashboard' as ActiveView },
    { icon:  "👥", label: "Accounts", view: 'accounts' as ActiveView },
    { icon: "🔒", label: "Security", view:  'security' as ActiveView },
  ]

  return (
      <div className="flex h-screen bg-slate-950">
        {/* Sidebar */}
        <aside
            className={`${sidebarOpen ? "w-64" : "w-20"} bg-slate-900 border-r border-slate-700/50 transition-all duration-300 flex flex-col shadow-lg`}
        >
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            {sidebarOpen && <span className="font-bold text-foreground text-lg">PRESENT</span>}
            <button
                onClick={() => setSidebarOpen(! sidebarOpen)}
                className="text-foreground hover:bg-muted/30 p-2 rounded transition-colors"
                aria-label="Toggle sidebar"
            >
              ☰
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item, index) => (
                <button
                    key={index}
                    onClick={() => setActiveView(item.view)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                        activeView === item.view
                            ?  "bg-primary/20 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-700/50">
            <Button
                onClick={onLogout}
                className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
            >
              {sidebarOpen ? "Logout" : "↪"}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-background/75 backdrop-blur-md px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {activeView === 'dashboard' && 'Admin Dashboard'}
                  {activeView === 'accounts' && 'Account Management'}
                  {activeView === 'security' && 'Security Settings'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeView === 'dashboard' && 'System overview and management'}
                  {activeView === 'accounts' && 'Manage user accounts'}
                  {activeView === 'security' && 'Security and access control'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">Admin User</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  AU
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6 bg-slate-950">
            {/* DASHBOARD VIEW */}
            {activeView === 'dashboard' && (
                <>
                  {/* System Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {systemStatsData.map((stat, index) => (
                        <Card
                            key={index}
                            className="border border-slate-700/50 bg-slate-800 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                              </div>
                              <div className={`${stat.color} p-3 rounded-lg text-2xl`}>{stat.icon}</div>
                            </div>
                          </CardContent>
                        </Card>
                    ))}
                  </div>

                  {/* Charts Grid */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* User Distribution */}
                    <Card className="border border-slate-700/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>User Distribution</CardTitle>
                        <CardDescription>Breakdown of system users by role</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                                data={userDistributionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                              {userDistributionData. map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                  backgroundColor: "var(--color-card)",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "8px",
                                }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* System Activity */}
                    <Card className="border border-slate-700/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>System Activity</CardTitle>
                        <CardDescription>Weekly activity metrics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                            <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                            <YAxis stroke="var(--color-muted-foreground)" />
                            <Tooltip
                                contentStyle={{
                                  backgroundColor: "var(--color-card)",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "8px",
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="logins" stroke="var(--color-primary)" strokeWidth={2} name="Logins" />
                            <Line type="monotone" dataKey="submissions" stroke="var(--color-secondary)" strokeWidth={2} name="Submissions" />
                            <Line type="monotone" dataKey="uploads" stroke="var(--color-accent)" strokeWidth={2} name="Uploads" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Users Table */}
                  <Card className="border border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Recent Users</CardTitle>
                      <CardDescription>Latest registered users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Username</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Joined</th>
                          </tr>
                          </thead>
                          <tbody>
                          {users.slice(0, 5).map((user) => (
                              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 text-foreground font-medium">{user.username}</td>
                                <td className="py-3 px-4">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                  user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                      user.role === 'teacher' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-green-500/20 text-green-400'
                              }`}>
                                {user.role}
                              </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-xs">{user.email}</td>
                                <td className="py-3 px-4 text-muted-foreground text-xs">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
            )}

            {/* ACCOUNTS VIEW */}
            {activeView === 'accounts' && (
                <>
                  {/* Add User Button */}
                  <div className="flex justify-end">
                    <Button
                        onClick={() => {
                          setFormData({ username: '', email: '', password: '', role: 'student' })
                          setError('')
                          setSuccess('')
                          setShowAddUser(true)
                        }}
                        className="bg-primary hover:bg-primary/90"
                    >
                      + Add New User
                    </Button>
                  </div>

                  {/* Success/Error Messages */}
                  {success && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-400">
                        {success}
                      </div>
                  )}

                  {/* Users Table */}
                  <Card className="border border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>All Users</CardTitle>
                      <CardDescription>Manage all user accounts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Username</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Joined</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                          </tr>
                          </thead>
                          <tbody>
                          {users.map((user) => (
                              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 text-muted-foreground">{user. id}</td>
                                <td className="py-3 px-4 text-foreground font-medium">{user.username}</td>
                                <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                                <td className="py-3 px-4">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                  user.role === 'admin' ?  'bg-red-500/20 text-red-400' :
                                      user.role === 'teacher' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-green-500/20 text-green-400'
                              }`}>
                                {user.role}
                              </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-xs">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditModal(user)}
                                        className="text-xs"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-xs"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
            )}

            {/* SECURITY VIEW */}
            {activeView === 'security' && (
                <>
                  <Card className="border border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Security Overview</CardTitle>
                      <CardDescription>Monitor and manage system security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700/50">
                          <h3 className="font-semibold text-foreground mb-2">🔐 Password Policy</h3>
                          <p className="text-sm text-muted-foreground">Passwords are hashed using bcrypt with 10 salt rounds</p>
                        </div>
                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700/50">
                          <h3 className="font-semibold text-foreground mb-2">👥 Active Sessions</h3>
                          <p className="text-sm text-muted-foreground">Session management coming soon</p>
                        </div>
                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700/50">
                          <h3 className="font-semibold text-foreground mb-2">📝 Audit Logs</h3>
                          <p className="text-sm text-muted-foreground">Activity logging enabled</p>
                        </div>
                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700/50">
                          <h3 className="font-semibold text-foreground mb-2">🛡️ Access Control</h3>
                          <p className="text-sm text-muted-foreground">Role-based access control active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
            )}
          </div>
        </main>

        {/* Add User Modal */}
        {showAddUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md border border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle>Add New User</CardTitle>
                  <CardDescription>Create a new user account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                          {error}
                        </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'teacher' | 'student' })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-foreground"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">Create User</Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddUser(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Edit User Modal */}
        {showEditUser && selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md border border-slate-700/50 bg-slate-900">
                <CardHeader>
                  <CardTitle>Edit User</CardTitle>
                  <CardDescription>Update user account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                          {error}
                        </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="edit-username">Username</Label>
                      <Input
                          id="edit-username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e. target.value })}
                          required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                          id="edit-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                      <Input
                          id="edit-password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Leave blank to keep current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <select
                          id="edit-role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'teacher' | 'student' })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-foreground"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">Update User</Button>
                      <Button type="button" variant="outline" onClick={() => setShowEditUser(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
        )}
      </div>
  )
}