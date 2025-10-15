import type { Goal, Subtask, ApiGoal, ApiSubtask } from '@/types'

// Status conversion functions
export function frontendToBackendStatus(status: 'pending' | 'in_progress' | 'completed'): 'ACTIVE' | 'COMPLETED' | 'PAUSED' {
  const mapping = {
    'pending': 'ACTIVE' as const,
    'in_progress': 'ACTIVE' as const,
    'completed': 'COMPLETED' as const,
  }
  return mapping[status]
}

export function backendToFrontendStatus(status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'): 'pending' | 'in_progress' | 'completed' {
  const mapping = {
    'ACTIVE': 'in_progress' as const,
    'COMPLETED': 'completed' as const,
    'PAUSED': 'pending' as const,
    'CANCELLED': 'pending' as const,
  }
  return mapping[status]
}

// Priority conversion functions
export function frontendToBackendPriority(priority: 'High' | 'Medium' | 'Low'): 'HIGH' | 'MEDIUM' | 'LOW' {
  const mapping = {
    'High': 'HIGH' as const,
    'Medium': 'MEDIUM' as const,
    'Low': 'LOW' as const,
  }
  return mapping[priority]
}

export function backendToFrontendPriority(priority: 'HIGH' | 'MEDIUM' | 'LOW'): 'High' | 'Medium' | 'Low' {
  const mapping = {
    'HIGH': 'High' as const,
    'MEDIUM': 'Medium' as const,
    'LOW': 'Low' as const,
  }
  return mapping[priority]
}

// Convert API goal to frontend goal format
export function apiGoalToGoal(apiGoal: ApiGoal): Goal {
  return {
    id: apiGoal.id,
    title: apiGoal.title,
    project: apiGoal.project,
    priority: backendToFrontendPriority(apiGoal.priority),
    platformTags: apiGoal.platformTags || [],
    dueDate: apiGoal.dueDate,
    team: apiGoal.team || [],
    subtasks: apiGoal.subtasks.map(apiSubtaskToSubtask),
    description: apiGoal.description,
    status: backendToFrontendStatus(apiGoal.status),
  }
}

// Convert API subtask to frontend subtask format
export function apiSubtaskToSubtask(apiSubtask: ApiSubtask): Subtask {
  return {
    id: apiSubtask.id,
    title: apiSubtask.title,
    done: apiSubtask.completed,
    description: apiSubtask.description,
    estimatedHours: apiSubtask.estimatedHours,
    category: apiSubtask.category,
    skills: apiSubtask.skills,
    dependencies: apiSubtask.dependencies,
    completed: apiSubtask.completed,
  }
}

// Convert frontend goal to API goal format (for creation/updates)
export function goalToApiGoal(goal: Goal): Partial<ApiGoal> {
  return {
    title: goal.title,
    description: goal.description,
    priority: frontendToBackendPriority(goal.priority),
    dueDate: goal.dueDate,
    project: goal.project,
    platformTags: goal.platformTags,
    team: goal.team,
    status: frontendToBackendStatus(goal.status || 'pending'),
  }
}

// Convert frontend subtask to API subtask format (for creation/updates)
export function subtaskToApiSubtask(subtask: Subtask): Partial<ApiSubtask> {
  return {
    title: subtask.title,
    description: subtask.description,
    completed: subtask.done || subtask.completed || false,
    estimatedHours: subtask.estimatedHours,
    category: subtask.category,
    skills: subtask.skills,
    dependencies: subtask.dependencies,
  }
}

// Group goals by date for the frontend
export function groupGoalsByDate(goals: Goal[]): Record<string, Goal[]> {
  return goals.reduce((acc, goal) => {
    const dateKey = goal.dueDate
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(goal)
    return acc
  }, {} as Record<string, Goal[]>)
}

// Generate a date key from a Date object
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}