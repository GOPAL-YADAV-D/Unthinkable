export type Priority = "High" | "Medium" | "Low"

export type Subtask = {
  id: string
  title: string
  done: boolean
  description?: string
  estimatedHours?: number
  category?: string
  skills?: string[]
  dependencies?: string[]
  completed?: boolean // for API compatibility
}

export type Goal = {
  id: string
  title: string
  project?: string
  priority: Priority
  platformTags?: string[]
  dueDate: string // ISO date
  team?: string[] // initials
  subtasks: Subtask[]
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
}

export type GoalsByDate = Record<string, Goal[]>

// API types for backend integration
export type ApiGoal = {
  id: string
  title: string
  description?: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate: string
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  project?: string
  platformTags?: string[]
  team?: string[]
  userId: string
  subtasks: ApiSubtask[]
  createdAt: string
  updatedAt: string
}

export type ApiSubtask = {
  id: string
  title: string
  description?: string
  completed: boolean
  goalId: string
  estimatedHours?: number
  category?: string
  skills?: string[]
  dependencies?: string[]
  createdAt: string
  updatedAt: string
}
