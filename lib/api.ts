import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10)

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
}

export interface ApiGoal {
  id: string
  title: string
  description?: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed'
  project?: string
  platformTags?: string[]
  team?: string[]
  userId: string
  subtasks: ApiSubtask[]
  createdAt: string
  updatedAt: string
}

export interface ApiSubtask {
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

export interface GoalsResponse {
  success: boolean
  data: {
    goals: ApiGoal[]
    total: number
  }
}

export interface GoalResponse {
  success: boolean
  data: {
    goal: ApiGoal
  }
}

export interface LLMSubtasksResponse {
  success: boolean
  data: {
    subtasks: Array<{
      title: string
      description?: string
      estimatedHours?: number
      category?: string
      skills?: string[]
      dependencies?: string[]
    }>
    totalEstimatedHours?: number
    criticalPath?: string[]
    implementationTips?: string[]
  }
}

// Auth API functions
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', { email, password })
    return response.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },

  getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },
}

// Goals API functions
export const goalsApi = {
  getGoals: async (page = 1, limit = 50, dueDate?: string): Promise<GoalsResponse> => {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    })
    if (dueDate) {
      params.append('dueDate', dueDate)
    }
    const response = await api.get(`/api/goals?${params}`)
    return response.data
  },

  createGoal: async (goalData: {
    title: string
    description?: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate: string
    project?: string
    platformTags?: string[]
    team?: string[]
  }): Promise<GoalResponse> => {
    const response = await api.post('/api/goals', goalData)
    return response.data
  },

  updateGoal: async (goalId: string, goalData: Partial<{
    title: string
    description?: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate: string
    status: 'pending' | 'in_progress' | 'completed'
    project?: string
    platformTags?: string[]
    team?: string[]
  }>): Promise<GoalResponse> => {
    const response = await api.put(`/api/goals/${goalId}`, goalData)
    return response.data
  },

  deleteGoal: async (goalId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/api/goals/${goalId}`)
    return response.data
  },

  addSubtask: async (goalId: string, subtaskData: {
    title: string
    description?: string
  }): Promise<{ success: boolean; data: { subtask: ApiSubtask } }> => {
    const response = await api.post(`/api/goals/${goalId}/subtasks`, subtaskData)
    return response.data
  },

  updateSubtask: async (goalId: string, subtaskId: string, subtaskData: {
    title?: string
    description?: string
    completed?: boolean
  }): Promise<{ success: boolean; data: { subtask: ApiSubtask } }> => {
    const response = await api.put(`/api/goals/${goalId}/subtasks/${subtaskId}`, subtaskData)
    return response.data
  },

  deleteSubtask: async (goalId: string, subtaskId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/api/goals/${goalId}/subtasks/${subtaskId}`)
    return response.data
  },
}

// LLM API functions
export const llmApi = {
  generateSubtasks: async (goalTitle: string, goalDescription?: string): Promise<LLMSubtasksResponse> => {
    const response = await api.post('/api/llm/generate-subtasks', {
      goalTitle,
      goalDescription,
    })
    return response.data
  },

  getStatus: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/api/llm/status')
    return response.data
  },
}

export default api