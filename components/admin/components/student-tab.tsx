"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, EyeOff, MoreVertical, Search, ArrowLeft, RefreshCw } from "lucide-react"

interface Student {
  id: number
  username: string
  email: string
  first_name: string | null
  middle_name: string | null
  last_name:  string | null
  department: string | null
  employee_id: string | null
  fullName: string
  created_at: string
}

interface StudentFormData {
  id?:  number
  username: string
  email: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  employeeId: string
  department:  string
}

export default function StudentTab() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [searchTerm, setSearchTerm] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("all")

  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [studioMode, setStudioMode] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/users/by-role? role=student')
      const data = await response.json()
      if (data.success) {
        setStudents(data.users)
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
      setError('Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Get unique departments for filter
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))]

  const filteredStudents = students.filter((student) => {
    const matchesDepartment = filterDepartment === "all" || student.department === filterDepartment
    const matchesSearch =
        searchTerm === "" ||
        student.employee_id?. toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesDepartment && matchesSearch
  })

  const handleAddStudent = () => {
    setEditingStudent(null)
    setStudioMode(true)
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student)
    setStudioMode(true)
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteAlert(true)
  }

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/users/${studentToDelete. id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        setSuccessMessage('Student deleted successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchStudents()
      } else {
        setError(data.error || 'Failed to delete student')
      }
    } catch (err) {
      setError('Failed to delete student')
    } finally {
      setIsSubmitting(false)
      setShowDeleteAlert(false)
      setStudentToDelete(null)
    }
  }

  const handleSaveStudent = async (formData: StudentFormData) => {
    try {
      setIsSubmitting(true)
      setError("")

      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'student',
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        department: formData.department,
        employeeId: formData.employeeId,
      }

      let response
      if (editingStudent) {
        // Update existing
        response = await fetch(`/api/admin/users/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new
        response = await fetch('/api/admin/users/by-role', {
          method: 'POST',
          headers: { 'Content-Type':  'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage(editingStudent ? 'Student updated successfully' : 'Student created successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        setStudioMode(false)
        setEditingStudent(null)
        fetchStudents()
      } else {
        setError(data. error || 'Failed to save student')
      }
    } catch (err) {
      setError('Failed to save student')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (studioMode) {
    return (
        <StudentStudioPage
            initialData={editingStudent}
            onSave={handleSaveStudent}
            onCancel={() => {
              setStudioMode(false)
              setEditingStudent(null)
              setError("")
            }}
            isSubmitting={isSubmitting}
            error={error}
        />
    )
  }

  return (
      <div className="space-y-4">
        {/* Success/Error Messages */}
        {successMessage && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm">
              {successMessage}
            </div>
        )}
        {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Label className="text-xs">Department/Grade</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                      <SelectItem key={dept} value={dept! }>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search by number, name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                />
              </div>
            </div>
            <Button
                onClick={fetchStudents}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={handleAddStudent} className="bg-blue-600 hover:bg-blue-700 text-white">
              Add New Student
            </Button>
          </div>
        </div>

        {/* Students Table */}
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        ) : (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">Student ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">Username</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">Full Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-200">Department</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-200">Actions</th>
                </tr>
                </thead>
                <tbody>
                {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No students found
                      </td>
                    </tr>
                ) : (
                    filteredStudents.map((student) => (
                        <tr key={student.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-100">{student.employee_id || '-'}</td>
                          <td className="py-3 px-4 text-slate-100">{student.username}</td>
                          <td className="py-3 px-4 text-slate-100">{student. fullName}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{student.email}</td>
                          <td className="py-3 px-4 text-slate-100">{student.department || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-300">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                <DropdownMenuItem
                                    onClick={() => handleEditStudent(student)}
                                    className="text-slate-200 cursor-pointer hover:bg-slate-700"
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteClick(student)}
                                    className="text-red-400 cursor-pointer hover:bg-slate-700"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                    ))
                )}
                </tbody>
              </table>
            </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Student Account? </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to delete {studentToDelete?.fullName}'s account? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="bg-slate-700 text-slate-200 hover:bg-slate-600">Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}

function StudentStudioPage({
                             initialData,
                             onSave,
                             onCancel,
                             isSubmitting,
                             error,
                           }:  {
  initialData: Student | null
  onSave: (data: StudentFormData) => void
  onCancel: () => void
  isSubmitting: boolean
  error: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<StudentFormData>({
    username: initialData?.username || "",
    email: initialData?.email || "",
    password: "",
    firstName: initialData?.first_name || "",
    middleName: initialData?.middle_name || "",
    lastName: initialData?.last_name || "",
    employeeId: initialData?.employee_id || "",
    department:  initialData?.department || "",
  })

  const handleSave = () => {
    if (! formData.username || !formData.email) {
      return
    }
    if (! initialData && !formData.password) {
      return
    }
    onSave(formData)
  }

  return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
          <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {initialData ? "Edit Student" : "Create Student"}
            </h1>
            <p className="text-slate-400 text-sm">
              {initialData ? "Update student account information" : "Create a new student account"}
            </p>
          </div>
        </div>

        {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
        )}

        {/* Form Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="employeeId" className="text-slate-200">Student Number</Label>
            <Input
                id="employeeId"
                placeholder="STU001"
                value={formData. employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="username" className="text-slate-200">Username *</Label>
            <Input
                id="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ... formData, username: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                required
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-200">Email *</Label>
            <Input
                id="email"
                type="email"
                placeholder="student@school.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ... formData, email: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-200">
              Password {initialData ? "(leave blank to keep current)" : "*"}
            </Label>
            <div className="relative mt-2">
              <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e. target.value })}
                  className="bg-slate-900 border-slate-600 text-white placeholder-slate-500 pr-10"
              />
              <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
            <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target. value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="middleName" className="text-slate-200">Middle Name</Label>
            <Input
                id="middleName"
                placeholder="David"
                value={formData. middleName}
                onChange={(e) => setFormData({ ... formData, middleName: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
            <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="department" className="text-slate-200">Grade/Department</Label>
            <Input
                id="department"
                placeholder="Grade 10"
                value={formData. department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-2 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-6 border-t border-slate-700">
          <Button
              onClick={onCancel}
              variant="outline"
              className="border-slate-600 text-slate-300 hover: bg-slate-700 bg-transparent"
              disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : initialData ? "Update Student" : "Create Student"}
          </Button>
        </div>
      </div>
  )
}