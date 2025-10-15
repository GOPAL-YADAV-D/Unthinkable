"use client"

import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/topbar"
import { Calendar } from "@/components/calendar"
import { GoalCard } from "@/components/goal-card"
import { NewTaskComposer } from "@/components/new-task-composer"
import { useGoals } from "@/hooks/use-goals"
import { useAuth } from "@/hooks/use-auth"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogIn, UserPlus, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { isAuthenticated, loading, user } = useAuth()
  const { goalsByDate, toggleSubtask, add, dayKey, isLoading } = useGoals()
  const [selected, setSelected] = useState<Date>(new Date())
  const selectedKey = useMemo(() => dayKey(selected), [selected, dayKey])
  const todaysGoals = goalsByDate[selectedKey] || []

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="max-w-md w-full mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Welcome to Productivity Dashboard</h1>
              <p className="text-muted-foreground">
                Track your goals, manage tasks, and boost productivity with AI-powered assistance.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login">
                  <Button className="w-full" variant="default">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="w-full" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
              
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  className="text-sm text-muted-foreground"
                  onClick={() => window.location.reload()}
                >
                  Continue in Offline Mode
                </Button>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-sm">🚀 Features:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AI-powered task generation</li>
                <li>• Smart goal tracking</li>
                <li>• Calendar integration</li>
                <li>• Team collaboration</li>
                <li>• Progress analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <section className="md:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-pretty">
                  Goals for {selected.toLocaleDateString()}
                  {user && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({user.email})
                    </span>
                  )}
                </h2>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {todaysGoals.length === 0 ? (
                <div className="rounded-lg border bg-card text-card-foreground p-6">
                  <p className="text-sm text-muted-foreground">
                    No goals yet for this date. Click "+" to add one with AI assistance!
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {todaysGoals.map((g) => (
                    <GoalCard 
                      key={g.id} 
                      goal={g} 
                      onToggleSubtask={(sid) => toggleSubtask(selectedKey, g.id, sid)} 
                    />
                  ))}
                </div>
              )}
            </section>
            <aside className="md:col-span-4">
              <Calendar 
                selected={selected} 
                onSelect={setSelected} 
                goalsByDate={goalsByDate} 
                dayKey={dayKey} 
              />
            </aside>
          </div>
        </main>
      </div>
      <NewTaskComposer defaultDateISO={selectedKey} onSave={(goal) => add(selectedKey, goal)} />
    </div>
  )
}
