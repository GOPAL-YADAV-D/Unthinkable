"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { toast } from "sonner"
import type { GoalsByDate, Goal } from "@/types"
import { goalsApi } from "@/lib/api"
import { apiGoalToGoal, goalToApiGoal, subtaskToApiSubtask, groupGoalsByDate, dayKey, frontendToBackendPriority } from "@/lib/goal-utils"
import { useAuth } from "@/hooks/use-auth"

const STORAGE_KEY = "v0_goals_by_date"

function seedData(): GoalsByDate {
  const today = new Date()
  const k = dayKey(today)
  return {
    [k]: [
      {
        id: "g-1",
        title: "Launch a Product",
        project: "Acme Inc.",
        priority: "High",
        platformTags: ["Web", "Mobile"],
        dueDate: k,
        team: ["AL", "BK", "CS"],
        subtasks: [
          { id: "s-1", title: "Finalize landing page", done: true },
          { id: "s-2", title: "QA test checkout flow", done: false },
          { id: "s-3", title: "Record demo video", done: false },
        ],
      },
      {
        id: "g-2",
        title: "Marketing Push",
        project: "Acme Inc.",
        priority: "Medium",
        platformTags: ["Web"],
        dueDate: k,
        team: ["DJ", "EM"],
        subtasks: [
          { id: "s-4", title: "Draft announcement", done: false },
          { id: "s-5", title: "Plan social posts", done: false },
        ],
      },
    ],
  }
}

// Fallback to localStorage when offline or backend unavailable
const localFetcher = async (): Promise<GoalsByDate> => {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedData()
  try {
    return JSON.parse(raw)
  } catch {
    return seedData()
  }
}

// Fetch goals from backend API
const apiFetcher = async (): Promise<GoalsByDate> => {
  try {
    const response = await goalsApi.getGoals(1, 100) // Get first 100 goals
    const goals = response.data.goals.map(apiGoalToGoal)
    return groupGoalsByDate(goals)
  } catch (error) {
    console.error('Failed to fetch goals from API:', error)
    // Fallback to localStorage
    return localFetcher()
  }
}

function persist(data: GoalsByDate) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useGoals() {
  const { isAuthenticated } = useAuth()
  
  // Use API fetcher if authenticated, otherwise use local storage
  const fetcher = isAuthenticated ? apiFetcher : localFetcher
  
  const { data, error, isLoading, mutate } = useSWR<GoalsByDate>("goals", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: isAuthenticated, // Only revalidate on reconnect if using API
    refreshInterval: isAuthenticated ? 30000 : 0, // Refresh every 30s if using API
  })

  const goalsByDate = data || {}

  async function upsert(dateKey: string, goal: Goal) {
    if (isAuthenticated) {
      try {
        const apiGoalData = goalToApiGoal(goal)
        
        if (goal.id.startsWith('g-')) {
          // Create new goal
          const response = await goalsApi.createGoal({
            title: apiGoalData.title!,
            description: apiGoalData.description,
            priority: apiGoalData.priority!,
            dueDate: apiGoalData.dueDate!,
            project: apiGoalData.project,
            platformTags: apiGoalData.platformTags,
            team: apiGoalData.team,
          })
          
          // Convert the API response back to frontend format
          const createdGoal = apiGoalToGoal(response.data.goal)
          
          // Add subtasks if any
          for (const subtask of goal.subtasks) {
            if (subtask.title.trim()) {
              await goalsApi.addSubtask(createdGoal.id, {
                title: subtask.title,
                description: subtask.description,
              })
            }
          }
          
          toast.success("Goal created successfully!")
        } else {
          // Update existing goal
          await goalsApi.updateGoal(goal.id, apiGoalData)
          toast.success("Goal updated successfully!")
        }
        
        // Force refresh data from server
        await mutate()
        globalMutate("goals")
      } catch (error) {
        console.error('Failed to save goal:', error)
        toast.error("Failed to save goal. Saved locally instead.")
        // Fallback to local storage
        upsertLocal(dateKey, goal)
      }
    } else {
      upsertLocal(dateKey, goal)
    }
  }

  function upsertLocal(dateKey: string, goal: Goal) {
    const next = { ...goalsByDate }
    const list = next[dateKey] ? [...next[dateKey]] : []
    const existingIdx = list.findIndex((g) => g.id === goal.id)
    if (existingIdx >= 0) {
      list[existingIdx] = goal
    } else {
      list.unshift(goal)
    }
    next[dateKey] = list
    persist(next)
    mutate(next, false)
    globalMutate("goals", next, false)
  }

  function add(dateKey: string, goal: Goal) {
    // Generate a temporary ID for optimistic updates
    const tempGoal = { ...goal, id: `g-${Date.now()}` }
    upsert(dateKey, tempGoal)
  }

  async function remove(dateKey: string, goalId: string) {
    if (isAuthenticated && !goalId.startsWith('g-')) {
      try {
        await goalsApi.deleteGoal(goalId)
        toast.success("Goal deleted successfully!")
        mutate()
      } catch (error) {
        console.error('Failed to delete goal:', error)
        toast.error("Failed to delete goal")
        return
      }
    } else {
      // Local deletion
      const next = { ...goalsByDate }
      next[dateKey] = (next[dateKey] || []).filter((g) => g.id !== goalId)
      persist(next)
      mutate(next, false)
      if (!isAuthenticated) {
        toast.success("Goal deleted locally!")
      }
    }
  }

  async function toggleSubtask(dateKey: string, goalId: string, subtaskId: string) {
    if (isAuthenticated && !goalId.startsWith('g-') && !subtaskId.startsWith('s-')) {
      try {
        // Find the current subtask to toggle its completed state
        const currentGoal = goalsByDate[dateKey]?.find(g => g.id === goalId)
        const currentSubtask = currentGoal?.subtasks.find(s => s.id === subtaskId)
        
        if (currentSubtask) {
          await goalsApi.updateSubtask(goalId, subtaskId, {
            completed: !currentSubtask.done
          })
          mutate()
        }
      } catch (error) {
        console.error('Failed to toggle subtask:', error)
        toast.error("Failed to update subtask")
        return
      }
    } else {
      // Local toggle
      const next = { ...goalsByDate }
      const updated = (next[dateKey] || []).map((g) => {
        if (g.id !== goalId) return g
        return {
          ...g,
          subtasks: g.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
        }
      })
      next[dateKey] = updated
      persist(next)
      mutate(next, false)
    }
  }

  return {
    goalsByDate,
    isLoading,
    error,
    add,
    upsert,
    remove,
    toggleSubtask,
    dayKey,
  }
}
