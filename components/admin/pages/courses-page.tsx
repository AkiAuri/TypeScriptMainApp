"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Plus,
  MoreVertical,
  ArrowLeft,
  BookMarked,
  Users,
  User,
  Layers,
  Search,
  RefreshCw,
  Power
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

// --- Types & Interfaces ---

interface SchoolYear {
  id: number
  year: string
  is_active: boolean
  semester_count: number
}

interface Semester {
  id: number
  name: string
  school_year_id: number
  is_active: boolean
  grade_level_count: number
}

interface GradeLevel {
  id: number
  name: string
  semester_id: number
  is_active: boolean
  section_count: number
}

interface Section {
  id: number
  name: string
  grade_level_id: number
  is_active: boolean
  subject_count: number
}

interface Subject {
  id: number
  name: string
  code: string | null
  section_id: number
  is_active: boolean
  instructor_count: number
  student_count: number
}

interface UserProfile {
  id: number
  username: string
  email: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  department: string | null
  employee_id: string | null
  student_number?: string | null
}

type ViewMode =
    | "years"
    | "semesters"
    | "gradeLevels"
    | "sections"
    | "subjects"
    | "assignInstructorList"
    | "assignStudentList"

interface StatusToggleProps {
  id: number
  isActive: boolean
  endpoint: string
  onToggle?: (id: number, newStatus: boolean) => void
  size?: "sm" | "md"
  disabled?: boolean
}

function StatusToggle({
                        id,
                        isActive,
                        endpoint,
                        onToggle,
                        size = "md",
                        disabled = false
                      }: StatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isActive);

  // Sync internal state with external prop changes
  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        setActive(data.is_active);
        onToggle?.(id, data.is_active);
      }
    } catch (error) {
      console.error('Toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === "sm" ? "w-9 h-5" : "w-11 h-6";
  const dotSizeClasses = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  // Standardized translation math for smooth CSS transitions
  const translateClasses = size === "sm"
      ? (active ? "translate-x-4" : "translate-x-0.5")
      : (active ? "translate-x-5" : "translate-x-0.5");

  return (
      <button
          onClick={handleToggle}
          disabled={loading || disabled}
          className={`
                relative inline-flex items-center rounded-full transition-colors duration-200
                ${sizeClasses}
                ${active ? 'bg-green-500' : 'bg-slate-600'}
                ${loading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
            `}
          title={active ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
      >
            <span
                className={`
                    inline-block rounded-full bg-white shadow transform transition-transform duration-200
                    ${dotSizeClasses}
                    ${translateClasses}
                `}
            />
      </button>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
      <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${isActive
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-slate-700 text-slate-400 border border-slate-600'
      }
        `}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-slate-500'}`} />
        {isActive ? 'Active' : 'Inactive'}
        </span>
  );
}

export default function CoursesPage() {
  // --- Data States ---
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignedInstructors, setAssignedInstructors] = useState<UserProfile[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<UserProfile[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<UserProfile[]>([]);
  const [availableStudents, setAvailableStudents] = useState<UserProfile[]>([]);

  // --- Loading & Submission States ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- View & Selection States ---
  const [viewMode, setViewMode] = useState<ViewMode>("years");
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // --- Form States ---
  const [newSchoolYear, setNewSchoolYear] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSubject, setNewSubject] = useState("");

  // --- Dialog & UI States ---
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ type: string; id: number; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  // --- Assignment View States ---
  const [assignInstructorMode, setAssignInstructorMode] = useState<"list" | "assign">("list");
  const [assignStudentMode, setAssignStudentMode] = useState<"list" | "assign">("list");
  const [deleteInstructorAlert, setDeleteInstructorAlert] = useState(false);
  const [deleteStudentAlert, setDeleteStudentAlert] = useState(false);
  const [instructorToDelete, setInstructorToDelete] = useState<number | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);

  // --- Create Dialog Open States ---
  const [createYearOpen, setCreateYearOpen] = useState(false);
  const [createSemesterOpen, setCreateSemesterOpen] = useState(false);
  const [createGradeLevelOpen, setCreateGradeLevelOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);

  // --- Fetch Logic ---

  const fetchSchoolYears = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/courses/school-years');
      const data = await response.json();
      if (data.success) {
        setSchoolYears(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch school years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSemesters = async (schoolYearId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/semesters?schoolYearId=${schoolYearId}`);
      const data = await response.json();
      if (data.success) {
        setSemesters(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGradeLevels = async (semesterId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/grade-levels?semesterId=${semesterId}`);
      const data = await response.json();
      if (data.success) {
        setGradeLevels(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch grade levels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async (gradeLevelId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/sections?gradeLevelId=${gradeLevelId}`);
      const data = await response.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async (sectionId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/subjects?sectionId=${sectionId}`);
      const data = await response.json();
      if (data.success) {
        setSubjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignedInstructors = async (subjectId: number) => {
    try {
      const response = await fetch(`/api/courses/subjects/${subjectId}/instructors`);
      const data = await response.json();
      if (data.success) {
        setAssignedInstructors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch assigned instructors:', error);
    }
  };

  const fetchAssignedStudents = async (subjectId: number) => {
    try {
      const response = await fetch(`/api/courses/subjects/${subjectId}/students`);
      const data = await response.json();
      if (data.success) {
        setAssignedStudents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch assigned students:', error);
    }
  };

  const fetchAvailableInstructors = async () => {
    try {
      const response = await fetch('/api/courses/available-users?role=teacher');
      const data = await response.json();
      if (data.success) {
        setAvailableInstructors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch available instructors:', error);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await fetch('/api/courses/available-users?role=student');
      const data = await response.json();
      if (data.success) {
        setAvailableStudents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch available students:', error);
    }
  };

  // --- Initial Load ---
  useEffect(() => {
    fetchSchoolYears();
  }, []);

  // --- Handle Toggle Callbacks (Local State Optimization) ---

  const handleYearToggle = (id: number, newStatus: boolean) => {
    setSchoolYears(prev => prev.map(y => y.id === id ? { ...y, is_active: newStatus } : y));
  };

  const handleSemesterToggle = (id: number, newStatus: boolean) => {
    setSemesters(prev => prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s));
  };

  const handleGradeLevelToggle = (id: number, newStatus: boolean) => {
    setGradeLevels(prev => prev.map(g => g.id === id ? { ...g, is_active: newStatus } : g));
  };

  const handleSectionToggle = (id: number, newStatus: boolean) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s));
  };

  const handleSubjectToggle = (id: number, newStatus: boolean) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s));
  };

  // --- CRUD Operations: Create ---

  const handleAddSchoolYear = async () => {
    if (!newSchoolYear.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/courses/school-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newSchoolYear.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setNewSchoolYear("");
        setCreateYearOpen(false);
        fetchSchoolYears();
      }
    } catch (error) {
      console.error('Failed to create school year:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSemester = async () => {
    if (!newSemester.trim() || !selectedYear) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/courses/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSemester.trim(), schoolYearId: selectedYear.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewSemester("");
        setCreateSemesterOpen(false);
        fetchSemesters(selectedYear.id);
      }
    } catch (error) {
      console.error('Failed to create semester:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGradeLevel = async () => {
    if (!newGradeLevel.trim() || !selectedSemester) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/courses/grade-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGradeLevel.trim(), semesterId: selectedSemester.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewGradeLevel("");
        setCreateGradeLevelOpen(false);
        fetchGradeLevels(selectedSemester.id);
      }
    } catch (error) {
      console.error('Failed to create grade level:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSection.trim() || !selectedGradeLevel) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/courses/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSection.trim(), gradeLevelId: selectedGradeLevel.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewSection("");
        setCreateSectionOpen(false);
        fetchSections(selectedGradeLevel.id);
      }
    } catch (error) {
      console.error('Failed to create section:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !selectedSection) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/courses/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubject.trim(), sectionId: selectedSection.id }),
      });
      const data = await response.json();
      if (data.success) {
        setNewSubject("");
        setCreateSubjectOpen(false);
        fetchSubjects(selectedSection.id);
      }
    } catch (error) {
      console.error('Failed to create subject:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!renameDialog || !renameValue.trim()) return;
    setIsSubmitting(true);

    const endpoints: { [key: string]: string } = {
      year: `/api/courses/school-years/${renameDialog.id}`,
      semester: `/api/courses/semesters/${renameDialog.id}`,
      gradeLevel: `/api/courses/grade-levels/${renameDialog.id}`,
      section: `/api/courses/sections/${renameDialog.id}`,
      subject: `/api/courses/subjects/${renameDialog.id}`,
    };

    try {
      const response = await fetch(endpoints[renameDialog.type], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
            renameDialog.type === 'year'
                ? { year: renameValue.trim() }
                : { name: renameValue.trim() }
        ),
      });
      const data = await response.json();
      if (data.success) {
        setRenameDialog(null);
        setRenameValue("");
        // Refresh data based on current hierarchy
        if (renameDialog.type === 'year') fetchSchoolYears();
        else if (renameDialog.type === 'semester' && selectedYear) fetchSemesters(selectedYear.id);
        else if (renameDialog.type === 'gradeLevel' && selectedSemester) fetchGradeLevels(selectedSemester.id);
        else if (renameDialog.type === 'section' && selectedGradeLevel) fetchSections(selectedGradeLevel.id);
        else if (renameDialog.type === 'subject' && selectedSection) fetchSubjects(selectedSection.id);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Logic ---

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);

    const endpoints: { [key: string]: string } = {
      year: `/api/courses/school-years/${deleteTarget.id}`,
      semester: `/api/courses/semesters/${deleteTarget.id}`,
      gradeLevel: `/api/courses/grade-levels/${deleteTarget.id}`,
      section: `/api/courses/sections/${deleteTarget.id}`,
      subject: `/api/courses/subjects/${deleteTarget.id}`,
    };

    try {
      const response = await fetch(endpoints[deleteTarget.type], {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setDeleteTarget(null);
        // Refresh data based on current hierarchy
        if (deleteTarget.type === 'year') fetchSchoolYears();
        else if (deleteTarget.type === 'semester' && selectedYear) fetchSemesters(selectedYear.id);
        else if (deleteTarget.type === 'gradeLevel' && selectedSemester) fetchGradeLevels(selectedSemester.id);
        else if (deleteTarget.type === 'section' && selectedGradeLevel) fetchSections(selectedGradeLevel.id);
        else if (deleteTarget.type === 'subject' && selectedSection) fetchSubjects(selectedSection.id);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Instructor Assignment Handlers ---

  const handleAssignInstructor = async (instructorId: number) => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/courses/subjects/${selectedSubject.id}/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId }),
      });
      const data = await response.json();
      if (data.success) {
        setAssignmentMessage("✓ Instructor assigned successfully!");
        setTimeout(() => setAssignmentMessage(""), 3000);
        fetchAssignedInstructors(selectedSubject.id);
        setAssignInstructorMode("list");
      }
    } catch (error) {
      console.error('Failed to assign instructor:', error);
    }
  };

  const handleRemoveInstructor = async () => {
    if (!selectedSubject || !instructorToDelete) return;
    try {
      const response = await fetch(
          `/api/courses/subjects/${selectedSubject.id}/instructors?instructorId=${instructorToDelete}`,
          { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        setAssignmentMessage("✓ Instructor removed successfully!");
        setTimeout(() => setAssignmentMessage(""), 3000);
        fetchAssignedInstructors(selectedSubject.id);
        setDeleteInstructorAlert(false);
        setInstructorToDelete(null);
      }
    } catch (error) {
      console.error('Failed to remove instructor:', error);
    }
  };

  // --- Student Assignment Handlers ---

  const handleAssignStudent = async (studentId: number) => {
    if (!selectedSubject) return;
    try {
      const response = await fetch(`/api/courses/subjects/${selectedSubject.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await response.json();
      if (data.success) {
        setAssignmentMessage("✓ Student assigned successfully!");
        setTimeout(() => setAssignmentMessage(""), 3000);
        fetchAssignedStudents(selectedSubject.id);
        setAssignStudentMode("list");
      }
    } catch (error) {
      console.error('Failed to assign student:', error);
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedSubject || !studentToDelete) return;
    try {
      const response = await fetch(
          `/api/courses/subjects/${selectedSubject.id}/students?studentId=${studentToDelete}`,
          { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        setAssignmentMessage("✓ Student removed successfully!");
        setTimeout(() => setAssignmentMessage(""), 3000);
        fetchAssignedStudents(selectedSubject.id);
        setDeleteStudentAlert(false);
        setStudentToDelete(null);
      }
    } catch (error) {
      console.error('Failed to remove student:', error);
    }
  };

  // --- Helper Functions ---

  const getFullName = (user: UserProfile) => {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.username;
  };

  // --- Search Filter Functions ---

  const filteredInstructors = availableInstructors.filter((inst) => {
    const fullName = getFullName(inst).toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
        fullName.includes(search) ||
        inst.email.toLowerCase().includes(search) ||
        inst.department?.toLowerCase().includes(search) ||
        inst.employee_id?.toLowerCase().includes(search)
    );
  });

  const filteredStudents = availableStudents.filter((student) => {
    const fullName = getFullName(student).toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
        fullName.includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.employee_id?.toLowerCase().includes(search)
    );
  });

  // --- Filter logic for active status toggle ---
  const filteredSchoolYears = showInactive ? schoolYears : schoolYears.filter(y => y.is_active);
  const filteredSemesters = showInactive ? semesters : semesters.filter(s => s.is_active);
  const filteredGradeLevels = showInactive ? gradeLevels : gradeLevels.filter(g => g.is_active);
  const filteredSections = showInactive ? sections : sections.filter(s => s.is_active);
  const filteredSubjects = showInactive ? subjects : subjects.filter(s => s.is_active);

  // --- Helper UI Handlers ---
  const handleOpenRenameDialog = (type: string, id: number, currentName: string) => {
    setRenameDialog({ type, id, currentName });
    setRenameValue(currentName);
  };

  // --- Sub-components for current view ---
  const LoadingSpinner = () => (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
  );

  const ShowInactiveToggle = () => (
      <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
        <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
        />
        Show inactive
      </label>
  );

  // --- SCHOOL YEARS VIEW (Main Landing) ---
  if (viewMode === "years") {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Courses Management</h1>
              <p className="text-slate-400">Manage school years, semesters, grade levels, sections, and subjects</p>
            </div>
            <div className="flex items-center gap-3">
              <ShowInactiveToggle />
              <button
                  onClick={fetchSchoolYears}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <Dialog open={createYearOpen} onOpenChange={setCreateYearOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create School Year
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New School Year</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new school year to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schoolYear" className="text-slate-300">School Year</Label>
                  <Input
                      id="schoolYear"
                      placeholder="e.g., 2024-2025"
                      value={newSchoolYear}
                      onChange={(e) => setNewSchoolYear(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                      onClick={handleAddSchoolYear}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
              <LoadingSpinner />
          ) : (
              <div className="grid gap-4">
                {filteredSchoolYears.map((year) => (
                    <div
                        key={year.id}
                        className={`group bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg ${
                            year.is_active
                                ? 'border-slate-700/50 hover:border-blue-500/50 hover:shadow-blue-500/10'
                                : 'border-slate-700/30 opacity-60 hover:opacity-80'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedYear(year)
                              fetchSemesters(year.id)
                              setViewMode("semesters")
                            }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 rounded-lg ${year.is_active ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                              <BookMarked className={`w-6 h-6 ${year. is_active ? 'text-blue-400' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className={`text-xl font-bold transition-colors ${
                                    year.is_active
                                        ? 'text-white group-hover:text-blue-300'
                                        : 'text-slate-400'
                                }`}>
                                  {year.year}
                                </h3>
                                <StatusBadge isActive={year.is_active} />
                              </div>
                              <p className="text-sm text-slate-400">{year.semester_count} semesters</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusToggle
                              id={year.id}
                              isActive={year.is_active}
                              endpoint="/api/courses/school-years"
                              onToggle={handleYearToggle}
                              size="sm"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                  onClick={() => handleOpenRenameDialog("year", year.id, year. year)}
                                  className="text-slate-300 cursor-pointer hover:bg-slate-700"
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ type: "year", id: year.id, name: year.year })}
                                  className="text-red-400 cursor-pointer hover: bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {! isLoading && filteredSchoolYears.length === 0 && (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">
                  {schoolYears.length === 0
                      ? "No school years yet.  Create one to get started."
                      : "No active school years.  Toggle 'Show inactive' to see all. "}
                </p>
              </div>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteTarget?.type === "year"} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete School Year</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete "{deleteTarget?.name}"? This will also delete all semesters, grade levels, sections, and subjects within it. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialog?.type === "year"} onOpenChange={(open) => !open && setRenameDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Edit School Year</DialogTitle>
                <DialogDescription className="text-slate-400">Enter the new name for this school year</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renameSchoolYear" className="text-slate-300">School Year Name</Label>
                  <Input
                      id="renameSchoolYear"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                      variant="outline"
                      onClick={() => setRenameDialog(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                      onClick={handleRename}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    )
  }

  // --- SEMESTERS VIEW ---
  if (viewMode === "semesters" && selectedYear) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          {/* Navigation Header & Breadcrumbs */}
          <div className="flex items-center gap-4 mb-4">
            <button
                onClick={() => setViewMode("years")}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{selectedYear.year}</h1>
                <StatusBadge isActive={selectedYear.is_active} />
              </div>
              <p className="text-slate-400">Manage semesters</p>
            </div>
            <div className="flex items-center gap-3">
              <ShowInactiveToggle />
              <button
                  onClick={() => fetchSemesters(selectedYear.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Semester Action */}
          <Dialog open={createSemesterOpen} onOpenChange={setCreateSemesterOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Semester
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Semester for {selectedYear.year}</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new semester to this school year</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="semesterName" className="text-slate-300">Semester Name</Label>
                  <Input
                      id="semesterName"
                      placeholder="e.g., First Semester"
                      value={newSemester}
                      onChange={(e) => setNewSemester(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                      onClick={handleAddSemester}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
              <LoadingSpinner />
          ) : (
              <div className="grid gap-4">
                {filteredSemesters.map((semester) => (
                    <div
                        key={semester.id}
                        className={`group bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg cursor-pointer ${
                            semester.is_active
                                ? 'border-slate-700/50 hover:border-cyan-500/50 hover:shadow-cyan-500/10'
                                : 'border-slate-700/30 opacity-60 hover:opacity-80'
                        }`}
                        onClick={() => {
                          setSelectedSemester(semester);
                          fetchGradeLevels(semester.id);
                          setViewMode("gradeLevels");
                        }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${semester.is_active ? 'bg-cyan-500/20' : 'bg-slate-700/50'}`}>
                            <BookMarked className={`w-6 h-6 ${semester.is_active ? 'text-cyan-400' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={`text-lg font-bold transition-colors ${
                                  semester.is_active
                                      ? 'text-white group-hover:text-cyan-300'
                                      : 'text-slate-400'
                              }`}>
                                {semester.name}
                              </h3>
                              <StatusBadge isActive={semester.is_active} />
                            </div>
                            <p className="text-sm text-slate-400">{semester.grade_level_count} grade levels</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <StatusToggle
                              id={semester.id}
                              isActive={semester.is_active}
                              endpoint="/api/courses/semesters"
                              onToggle={handleSemesterToggle}
                              size="sm"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameDialog("semester", semester.id, semester.name);
                                  }}
                                  className="text-slate-300 cursor-pointer hover:bg-slate-700"
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: "semester", id: semester.id, name: semester.name });
                                  }}
                                  className="text-red-400 cursor-pointer hover:bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {!isLoading && filteredSemesters.length === 0 && (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">
                  {semesters.length === 0
                      ? "No semesters yet. Add one to get started."
                      : "No active semesters. Toggle 'Show inactive' to see all."}
                </p>
              </div>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteTarget?.type === "semester"} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Semester</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialog?.type === "semester"} onOpenChange={(open) => !open && setRenameDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Semester</DialogTitle>
                <DialogDescription className="text-slate-400">Enter the new name for this semester</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renameSemester" className="text-slate-300">Semester Name</Label>
                  <Input
                      id="renameSemester"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                      variant="outline"
                      onClick={() => setRenameDialog(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                      onClick={handleRename}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    )
  }

  // --- GRADE LEVELS VIEW ---
  if (viewMode === "gradeLevels" && selectedYear && selectedSemester) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          {/* Navigation Header with Contextual Breadcrumbs */}
          <div className="flex items-center gap-4 mb-4">
            <button
                onClick={() => setViewMode("semesters")}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{selectedSemester.name}</h1>
                <StatusBadge isActive={selectedSemester.is_active} />
              </div>
              <p className="text-slate-400">{selectedYear.year} • Manage grade levels</p>
            </div>
            <div className="flex items-center gap-3">
              <ShowInactiveToggle />
              <button
                  onClick={() => fetchGradeLevels(selectedSemester.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Grade Level Dialog */}
          <Dialog open={createGradeLevelOpen} onOpenChange={setCreateGradeLevelOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Grade Level
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Grade Level for {selectedSemester.name}</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new grade level to this semester</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="gradeLevelName" className="text-slate-300">Grade Level Name</Label>
                  <Input
                      id="gradeLevelName"
                      placeholder="e.g., Grade 1"
                      value={newGradeLevel}
                      onChange={(e) => setNewGradeLevel(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                      onClick={handleAddGradeLevel}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
              <LoadingSpinner />
          ) : (
              <div className="grid gap-4">
                {filteredGradeLevels.map((grade) => (
                    <div
                        key={grade.id}
                        className={`group bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg cursor-pointer ${
                            grade.is_active
                                ? 'border-slate-700/50 hover:border-purple-500/50 hover:shadow-purple-500/10'
                                : 'border-slate-700/30 opacity-60 hover:opacity-80'
                        }`}
                        onClick={() => {
                          setSelectedGradeLevel(grade);
                          fetchSections(grade.id);
                          setViewMode("sections");
                        }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${grade.is_active ? 'bg-purple-500/20' : 'bg-slate-700/50'}`}>
                            <Layers className={`w-6 h-6 ${grade.is_active ? 'text-purple-400' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={`text-lg font-bold transition-colors ${
                                  grade.is_active
                                      ? 'text-white group-hover:text-purple-300'
                                      : 'text-slate-400'
                              }`}>
                                {grade.name}
                              </h3>
                              <StatusBadge isActive={grade.is_active} />
                            </div>
                            <p className="text-sm text-slate-400">{grade.section_count} sections</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <StatusToggle
                              id={grade.id}
                              isActive={grade.is_active}
                              endpoint="/api/courses/grade-levels"
                              onToggle={handleGradeLevelToggle}
                              size="sm"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameDialog("gradeLevel", grade.id, grade.name);
                                  }}
                                  className="text-slate-300 cursor-pointer hover:bg-slate-700"
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: "gradeLevel", id: grade.id, name: grade.name });
                                  }}
                                  className="text-red-400 cursor-pointer hover:bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {!isLoading && filteredGradeLevels.length === 0 && (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">
                  {gradeLevels.length === 0
                      ? "No grade levels yet. Add one to get started."
                      : "No active grade levels. Toggle 'Show inactive' to see all."}
                </p>
              </div>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteTarget?.type === "gradeLevel"} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Grade Level</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialog?.type === "gradeLevel"} onOpenChange={(open) => !open && setRenameDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Grade Level</DialogTitle>
                <DialogDescription className="text-slate-400">Enter the new name for this grade level</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renameGradeLevel" className="text-slate-300">Grade Level Name</Label>
                  <Input
                      id="renameGradeLevel"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                      variant="outline"
                      onClick={() => setRenameDialog(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                      onClick={handleRename}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    )
  }

  // --- SECTIONS VIEW ---
  if (viewMode === "sections" && selectedYear && selectedSemester && selectedGradeLevel) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          {/* Drill-up Navigation & Page Context */}
          <div className="flex items-center gap-4 mb-4">
            <button
                onClick={() => setViewMode("gradeLevels")}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{selectedGradeLevel.name}</h1>
                <StatusBadge isActive={selectedGradeLevel.is_active} />
              </div>
              <p className="text-slate-400">
                {selectedYear.year} • {selectedSemester.name} • Sections
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ShowInactiveToggle />
              <button
                  onClick={() => fetchSections(selectedGradeLevel.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Section Dialog */}
          <Dialog open={createSectionOpen} onOpenChange={setCreateSectionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Section for {selectedGradeLevel.name}</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new section to this grade level</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sectionName" className="text-slate-300">Section Name</Label>
                  <Input
                      id="sectionName"
                      placeholder="e.g., Section A"
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                      onClick={handleAddSection}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
              <LoadingSpinner />
          ) : (
              <div className="grid gap-4">
                {filteredSections.map((section) => (
                    <div
                        key={section.id}
                        className={`group bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg cursor-pointer ${
                            section.is_active
                                ? 'border-slate-700/50 hover:border-pink-500/50 hover:shadow-pink-500/10'
                                : 'border-slate-700/30 opacity-60 hover:opacity-80'
                        }`}
                        onClick={() => {
                          setSelectedSection(section);
                          fetchSubjects(section.id);
                          setViewMode("subjects");
                        }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${section.is_active ? 'bg-pink-500/20' : 'bg-slate-700/50'}`}>
                            <Users className={`w-6 h-6 ${section.is_active ? 'text-pink-400' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={`text-lg font-bold transition-colors ${
                                  section.is_active
                                      ? 'text-white group-hover:text-pink-300'
                                      : 'text-slate-400'
                              }`}>
                                {section.name}
                              </h3>
                              <StatusBadge isActive={section.is_active} />
                            </div>
                            <p className="text-sm text-slate-400">{section.subject_count} subjects</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <StatusToggle
                              id={section.id}
                              isActive={section.is_active}
                              endpoint="/api/courses/sections"
                              onToggle={handleSectionToggle}
                              size="sm"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameDialog("section", section.id, section.name);
                                  }}
                                  className="text-slate-300 cursor-pointer hover:bg-slate-700"
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: "section", id: section.id, name: section.name });
                                  }}
                                  className="text-red-400 cursor-pointer hover:bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {!isLoading && filteredSections.length === 0 && (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">
                  {sections.length === 0
                      ? "No sections yet. Add one to get started."
                      : "No active sections. Toggle 'Show inactive' to see all."}
                </p>
              </div>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteTarget?.type === "section"} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Section</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialog?.type === "section"} onOpenChange={(open) => !open && setRenameDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Section</DialogTitle>
                <DialogDescription className="text-slate-400">Enter the new name for this section</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renameSection" className="text-slate-300">Section Name</Label>
                  <Input
                      id="renameSection"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                      variant="outline"
                      onClick={() => setRenameDialog(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                      onClick={handleRename}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    )
  }

  // --- SUBJECTS VIEW ---
  if (viewMode === "subjects" && selectedYear && selectedSemester && selectedGradeLevel && selectedSection) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          {/* Navigation & Context Header */}
          <div className="flex items-center gap-4 mb-4">
            <button
                onClick={() => setViewMode("sections")}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{selectedSection.name}</h1>
                <StatusBadge isActive={selectedSection.is_active} />
              </div>
              <p className="text-slate-400">
                {selectedYear.year} • {selectedSemester.name} • {selectedGradeLevel.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ShowInactiveToggle />
              <button
                  onClick={() => fetchSubjects(selectedSection.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Temporary Success Feedback */}
          {assignmentMessage && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 animate-in fade-in duration-300">
                {assignmentMessage}
              </div>
          )}

          {/* Create Subject Action */}
          <Dialog open={createSubjectOpen} onOpenChange={setCreateSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Subject for {selectedSection.name}</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new subject to this section</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subjectName" className="text-slate-300">Subject Name</Label>
                  <Input
                      id="subjectName"
                      placeholder="e.g., Mathematics"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                      onClick={handleAddSubject}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
              <LoadingSpinner />
          ) : (
              <div className="grid gap-4">
                {filteredSubjects.map((subject) => (
                    <div
                        key={subject.id}
                        className={`group bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg ${
                            subject.is_active
                                ? 'border-slate-700/50 hover:border-yellow-500/50 hover:shadow-yellow-500/10'
                                : 'border-slate-700/30 opacity-60 hover:opacity-80'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className={`text-lg font-bold transition-colors ${
                                subject.is_active
                                    ? 'text-white group-hover:text-yellow-300'
                                    : 'text-slate-400'
                            }`}>
                              {subject.name}
                              {subject.code && <span className="text-sm text-slate-400 ml-2">({subject.code})</span>}
                            </h3>
                            <StatusBadge isActive={subject.is_active} />
                          </div>

                          {/* Assignment Navigation Buttons */}
                          <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  fetchAssignedInstructors(subject.id);
                                  fetchAvailableInstructors();
                                  setSearchTerm("");
                                  setAssignInstructorMode("list");
                                  setViewMode("assignInstructorList");
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                                    subject.is_active
                                        ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                                        : 'bg-slate-700/50 text-slate-400'
                                }`}
                            >
                              <User className="w-4 h-4" />
                              <span>Instructors ({subject.instructor_count})</span>
                            </button>

                            <button
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  fetchAssignedStudents(subject.id);
                                  fetchAvailableStudents();
                                  setSearchTerm("");
                                  setAssignStudentMode("list");
                                  setViewMode("assignStudentList");
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                                    subject.is_active
                                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                                        : 'bg-slate-700/50 text-slate-400'
                                }`}
                            >
                              <Users className="w-4 h-4" />
                              <span>Students ({subject.student_count})</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusToggle
                              id={subject.id}
                              isActive={subject.is_active}
                              endpoint="/api/courses/subjects"
                              onToggle={handleSubjectToggle}
                              size="sm"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                  onClick={() => handleOpenRenameDialog("subject", subject.id, subject.name)}
                                  className="text-slate-300 cursor-pointer hover:bg-slate-700"
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ type: "subject", id: subject.id, name: subject.name })}
                                  className="text-red-400 cursor-pointer hover:bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {!isLoading && filteredSubjects.length === 0 && (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                <p className="text-slate-400">
                  {subjects.length === 0
                      ? "No subjects yet. Add one to get started."
                      : "No active subjects. Toggle 'Show inactive' to see all."}
                </p>
              </div>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteTarget?.type === "subject"} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Subject</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialog?.type === "subject"} onOpenChange={(open) => !open && setRenameDialog(null)}>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Subject</DialogTitle>
                <DialogDescription className="text-slate-400">Enter the new name for this subject</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="renameSubject" className="text-slate-300">Subject Name</Label>
                  <Input
                      id="renameSubject"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="mt-1.5 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                      variant="outline"
                      onClick={() => setRenameDialog(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                      onClick={handleRename}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    )
  }

// --- ASSIGN INSTRUCTORS VIEW ---

  if (viewMode === "assignInstructorList" && selectedSubject) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
            <button
                onClick={() => {
                  setViewMode("subjects")
                  setSelectedSubject(null)
                  setAssignInstructorMode("list")
                }}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Instructors</h1>
                <StatusBadge isActive={selectedSubject.is_active} />
              </div>
              <p className="text-slate-400 text-sm">
                {selectedYear?.year} • {selectedSemester?.name} • {selectedGradeLevel?.name} • {selectedSection?.name} • {selectedSubject.name}
              </p>
            </div>
          </div>

          {assignmentMessage && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 animate-in fade-in duration-300">
                {assignmentMessage}
              </div>
          )}

          {assignInstructorMode === "list" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Assigned Instructors</h2>
                  <Button
                      onClick={() => setAssignInstructorMode("assign")}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      disabled={!selectedSubject.is_active}
                  >
                    + Assign Instructor
                  </Button>
                </div>

                {!selectedSubject.is_active && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-yellow-400 text-sm">
                      This subject is inactive. Activate it to manage instructor assignments.
                    </div>
                )}

                {assignedInstructors.length > 0 ? (
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Employee ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Full Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Department</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-200">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {assignedInstructors.map((instructor) => (
                            <tr key={instructor.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 text-slate-100">{instructor.employee_id || '-'}</td>
                              <td className="py-3 px-4 text-slate-100">{getFullName(instructor)}</td>
                              <td className="py-3 px-4 text-slate-400 text-xs">{instructor.email}</td>
                              <td className="py-3 px-4 text-slate-100">{instructor.department || '-'}</td>
                              <td className="py-3 px-4 text-center">
                                <button
                                    onClick={() => {
                                      setInstructorToDelete(instructor.id);
                                      setDeleteInstructorAlert(true);
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors text-xs"
                                    disabled={!selectedSubject.is_active}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      No instructors assigned yet
                    </div>
                )}
              </div>
          ) : (
              <div className="space-y-4">
                {/* Assign New Instructor Mode */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Available Instructors</h2>
                </div>

                {/* Unified Search Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                      placeholder="Search by name, email, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>

                {/* Availability Table with Exclusion Logic */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Full Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Department</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-200">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredInstructors
                        .filter((i) => !assignedInstructors.some((ai) => ai.id === i.id))
                        .map((instructor) => (
                            <tr key={instructor.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 text-slate-100">{instructor.employee_id || '-'}</td>
                              <td className="py-3 px-4 text-slate-100">{getFullName(instructor)}</td>
                              <td className="py-3 px-4 text-slate-400 text-xs">{instructor.email}</td>
                              <td className="py-3 px-4 text-slate-100">{instructor.department || '-'}</td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                    onClick={() => handleAssignInstructor(instructor.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                                >
                                  Assign
                                </Button>
                              </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {filteredInstructors.filter((i) => !assignedInstructors.some((ai) => ai.id === i.id)).length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No available instructors found
                    </div>
                )}

                <Button
                    onClick={() => setAssignInstructorMode("list")}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  Back to Assigned List
                </Button>
              </div>
          )}

          {/* Delete Instructor Confirmation */}
          <AlertDialog open={deleteInstructorAlert} onOpenChange={setDeleteInstructorAlert}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Remove Instructor?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to remove this instructor from the subject? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel className="bg-slate-700 text-slate-200 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleRemoveInstructor}
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    );
  }

  // --- ASSIGN STUDENTS VIEW ---
  if (viewMode === "assignStudentList" && selectedSubject) {
    return (
        <div className="space-y-6 p-4 md:p-8">
          {/* Navigation Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
            <button
                onClick={() => {
                  setViewMode("subjects");
                  setSelectedSubject(null);
                  setAssignStudentMode("list");
                }}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Students</h1>
                <StatusBadge isActive={selectedSubject.is_active} />
              </div>
              <p className="text-slate-400 text-sm">
                {selectedYear?.year} • {selectedSemester?.name} • {selectedGradeLevel?.name} • {selectedSection?.name} • {selectedSubject.name}
              </p>
            </div>
          </div>

          {/* Success Feedback */}
          {assignmentMessage && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400 animate-in fade-in duration-300">
                {assignmentMessage}
              </div>
          )}

          {assignStudentMode === "list" ? (
              <div className="space-y-4">
                {/* Assigned List Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Assigned Students</h2>
                  <Button
                      onClick={() => setAssignStudentMode("assign")}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                      disabled={!selectedSubject.is_active}
                  >
                    + Assign Student
                  </Button>
                </div>

                {/* Inactive Subject Warning */}
                {!selectedSubject.is_active && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-yellow-400 text-sm">
                      This subject is inactive. Activate it to manage student assignments.
                    </div>
                )}

                {/* Assigned Students Table */}
                {assignedStudents.length > 0 ? (
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Student Number</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Full Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-200">Email</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-200">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {assignedStudents.map((student) => (
                            <tr key={student.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 text-slate-100">{student.student_number || student.employee_id || '-'}</td>
                              <td className="py-3 px-4 text-slate-100">{getFullName(student)}</td>
                              <td className="py-3 px-4 text-slate-400 text-xs">{student.email}</td>
                              <td className="py-3 px-4 text-center">
                                <button
                                    onClick={() => {
                                      setStudentToDelete(student.id);
                                      setDeleteStudentAlert(true);
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors text-xs"
                                    disabled={!selectedSubject.is_active}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      No students assigned yet
                    </div>
                )}
              </div>
          ) : (
              <div className="space-y-4">
                {/* Assign Mode UI - Start available list */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Available Students</h2>
                </div>

                {/* Search & Filter Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                      placeholder="Search by name, email, or student number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-600 text-white placeholder-slate-500"
                  />
                </div>

                {/* Available Students Table */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Student Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Full Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-200">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredStudents
                        .filter((s) => !assignedStudents.some((as) => as.id === s.id))
                        .map((student) => (
                            <tr key={student.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 text-slate-100">{student.employee_id || '-'}</td>
                              <td className="py-3 px-4 text-slate-100">{getFullName(student)}</td>
                              <td className="py-3 px-4 text-slate-400 text-xs">{student.email}</td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                    onClick={() => handleAssignStudent(student.id)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3"
                                >
                                  Assign
                                </Button>
                              </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty Search Result State */}
                {filteredStudents.filter((s) => !assignedStudents.some((as) => as.id === s.id)).length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No available students found
                    </div>
                )}

                <Button
                    onClick={() => setAssignStudentMode("list")}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  Back to Assigned List
                </Button>
              </div>
          )}

          {/* Delete Student Confirmation Dialog */}
          <AlertDialog open={deleteStudentAlert} onOpenChange={setDeleteStudentAlert}>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Remove Student?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to remove this student from the subject? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel className="bg-slate-700 text-slate-200 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleRemoveStudent}
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    );
  }

  // Safety fallback for unexpected state
  return null;
}