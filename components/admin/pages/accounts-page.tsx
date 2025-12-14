"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StudentTab from "../components/student-tab"
import InstructorTab from "../components/instructor-tab"
import AdminTab from "../components/admin-tab"

interface AccountsPageProps {
  initialTab?: "students" | "instructors" | "admins"
}

export default function AccountsPage({ initialTab = "students" }: AccountsPageProps) {
  const [activeTab, setActiveTab] = useState<"students" | "instructors" | "admins">(initialTab)

  // Wrapper to ensure type safety
  const handleTabChange = (value: string) => {
    if (value === "students" || value === "instructors" || value === "admins") {
      setActiveTab(value)
    }
  }

  return (
      <div className="space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Accounts</h1>
          <p className="text-slate-400">Manage all system accounts</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b border-slate-700/50 px-6">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-0 bg-transparent border-b-0">
                <TabsTrigger
                    value="students"
                    className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                >
                  Students
                </TabsTrigger>
                <TabsTrigger
                    value="instructors"
                    className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                >
                  Instructors
                </TabsTrigger>
                <TabsTrigger
                    value="admins"
                    className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                >
                  Admins
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="students" className="space-y-4">
                <StudentTab />
              </TabsContent>

              <TabsContent value="instructors" className="space-y-4">
                <InstructorTab />
              </TabsContent>

              <TabsContent value="admins" className="space-y-4">
                <AdminTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
  )
}