const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');
const logger = require('../utils/logger');

// Validation schemas matching the frontend types
const prioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
const statusSchema = z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']);

const subtaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Subtask title is required'),
  description: z.string().optional(),
  completed: z.boolean().default(false),
});

const goalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().optional(),
  priority: prioritySchema.default('MEDIUM'),
  status: statusSchema.default('ACTIVE'),
  dueDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    // Handle both date (YYYY-MM-DD) and datetime formats
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.toISOString();
  }),
  projectId: z.string().optional(),
  platformTags: z.array(z.string()).default([]),
  teamMembers: z.array(z.string()).default([]), // Array of user IDs
  subtasks: z.array(subtaskSchema).default([]),
});

const updateGoalSchema = goalSchema.partial();

class GoalService {
  constructor() {
    this.prisma = db.client;
    this.isDatabaseAvailable = this.checkDatabaseAvailability();
    // In-memory storage for development when database is not available
    this.inMemoryGoals = new Map();
    this.inMemorySubtasks = new Map();
    this.goalIdCounter = 1;
    this.subtaskIdCounter = 1;
    
    // Seed some demo data for development
    if (!this.isDatabaseAvailable) {
      this.seedDemoData();
    }
  }

  checkDatabaseAvailability() {
    return !(!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password'));
  }

  // Seed demo data for in-memory storage
  seedDemoData() {
    const today = new Date().toISOString().split('T')[0];
    
    const demoGoal1 = {
      id: 'goal-1',
      title: 'Launch Product MVP',
      description: 'Complete and launch the minimum viable product',
      priority: 'HIGH',
      status: 'ACTIVE',
      dueDate: '2025-10-30T00:00:00.000Z',
      ownerId: 'user-1',
      projectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const demoGoal2 = {
      id: 'goal-2',
      title: 'Marketing Push',
      description: 'Execute comprehensive marketing strategy',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      dueDate: '2025-11-15T00:00:00.000Z',
      ownerId: 'user-1',
      projectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.inMemoryGoals.set('goal-1', demoGoal1);
    this.inMemoryGoals.set('goal-2', demoGoal2);

    // Demo subtasks
    const subtasks = [
      { id: 'subtask-1', title: 'Finalize landing page', completed: true, goalId: 'goal-1' },
      { id: 'subtask-2', title: 'QA test checkout flow', completed: false, goalId: 'goal-1' },
      { id: 'subtask-3', title: 'Record demo video', completed: false, goalId: 'goal-1' },
      { id: 'subtask-4', title: 'Draft announcement', completed: false, goalId: 'goal-2' },
      { id: 'subtask-5', title: 'Plan social posts', completed: false, goalId: 'goal-2' },
    ];

    subtasks.forEach(subtask => {
      this.inMemorySubtasks.set(subtask.id, {
        ...subtask,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.goalIdCounter = 3;
    this.subtaskIdCounter = 6;
  }

  // Utility function to format date as YYYY-MM-DD
  formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get all goals for a user
  async getUserGoals(userId, filters = {}) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.getUserGoalsInMemory(userId, filters);
      }

      const where = {
        ownerId: userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.projectId && { projectId: filters.projectId }),
      };

      const goals = await this.prisma.goal.findMany({
        where,
        include: {
          subtasks: true,
          platformTags: {
            include: {
              platformTag: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return this.formatGoalsResponse(goals);
    } catch (error) {
      logger.error('Get user goals failed:', error);
      throw error;
    }
  }

  // Get goals by date (matching frontend expectation)
  async getGoalsByDate(userId, date) {
    try {
      const dateKey = this.formatDateKey(date);
      
      if (!this.isDatabaseAvailable) {
        return this.getGoalsByDateInMemory(userId, dateKey);
      }

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const goals = await this.prisma.goal.findMany({
        where: {
          ownerId: userId,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          subtasks: true,
          platformTags: {
            include: {
              platformTag: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return this.formatGoalsResponse(goals);
    } catch (error) {
      logger.error('Get goals by date failed:', error);
      throw error;
    }
  }

  // In-memory implementation for development
  getUserGoalsInMemory(userId, filters = {}) {
    const userGoals = Array.from(this.inMemoryGoals.values())
      .filter(goal => goal.ownerId === userId);

    // Apply filters
    let filteredGoals = userGoals;
    if (filters.status) {
      filteredGoals = filteredGoals.filter(goal => goal.status === filters.status);
    }
    if (filters.priority) {
      filteredGoals = filteredGoals.filter(goal => goal.priority === filters.priority);
    }

    // Add subtasks to each goal
    return filteredGoals.map(goal => ({
      ...goal,
      subtasks: Array.from(this.inMemorySubtasks.values())
        .filter(subtask => subtask.goalId === goal.id),
      platformTags: [],
      teamMembers: [],
    }));
  }

  getGoalsByDateInMemory(userId, targetDate) {
    const userGoals = this.getUserGoalsInMemory(userId);
    
    return userGoals.filter(goal => {
      if (!goal.dueDate) return false;
      const goalDate = this.formatDateKey(goal.dueDate);
      return goalDate === targetDate;
    });
  }

  // Create a new goal
  async createGoal(userId, goalData) {
    try {
      // Validate input
      const validatedData = goalSchema.parse(goalData);
      
      if (!this.isDatabaseAvailable) {
        return this.createGoalInMemory(userId, validatedData);
      }

      // Create goal with subtasks
      const goal = await this.prisma.goal.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          priority: validatedData.priority,
          status: validatedData.status,
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          projectId: validatedData.projectId,
          ownerId: userId,
          subtasks: {
            create: validatedData.subtasks.map(subtask => ({
              title: subtask.title,
              description: subtask.description,
              completed: subtask.completed,
            })),
          },
        },
        include: {
          subtasks: true,
          platformTags: {
            include: {
              platformTag: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Goal created: ${goal.title} by user ${userId}`);
      
      return this.formatGoalResponse(goal);
    } catch (error) {
      logger.error('Create goal failed:', error);
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // In-memory goal creation
  createGoalInMemory(userId, validatedData) {
    const goalId = `goal-${this.goalIdCounter++}`;
    
    const goal = {
      id: goalId,
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      status: validatedData.status,
      dueDate: validatedData.dueDate,
      projectId: validatedData.projectId,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.inMemoryGoals.set(goalId, goal);

    // Create subtasks
    const subtasks = validatedData.subtasks.map(subtaskData => {
      const subtaskId = `subtask-${this.subtaskIdCounter++}`;
      const subtask = {
        id: subtaskId,
        title: subtaskData.title,
        description: subtaskData.description,
        completed: subtaskData.completed,
        goalId: goalId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.inMemorySubtasks.set(subtaskId, subtask);
      return subtask;
    });

    logger.info(`Goal created (in-memory): ${goal.title} by user ${userId}`);

    return {
      ...goal,
      subtasks,
      platformTags: [],
      teamMembers: [],
    };
  }

  // Update a goal
  async updateGoal(userId, goalId, updateData) {
    try {
      const validatedData = updateGoalSchema.parse(updateData);
      
      if (!this.isDatabaseAvailable) {
        return this.updateGoalInMemory(userId, goalId, validatedData);
      }

      // Check if goal exists and belongs to user
      const existingGoal = await this.prisma.goal.findFirst({
        where: {
          id: goalId,
          ownerId: userId,
        },
      });

      if (!existingGoal) {
        throw new Error('Goal not found or access denied');
      }

      const goal = await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          ...(validatedData.title && { title: validatedData.title }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.priority && { priority: validatedData.priority }),
          ...(validatedData.status && { status: validatedData.status }),
          ...(validatedData.dueDate !== undefined && { 
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null 
          }),
          ...(validatedData.projectId !== undefined && { projectId: validatedData.projectId }),
        },
        include: {
          subtasks: true,
          platformTags: {
            include: {
              platformTag: true,
            },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Goal updated: ${goalId} by user ${userId}`);
      
      return this.formatGoalResponse(goal);
    } catch (error) {
      logger.error('Update goal failed:', error);
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // In-memory goal update
  updateGoalInMemory(userId, goalId, validatedData) {
    const goal = this.inMemoryGoals.get(goalId);
    
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Goal not found or access denied');
    }

    // Update goal fields
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        goal[key] = validatedData[key];
      }
    });
    
    goal.updatedAt = new Date();
    this.inMemoryGoals.set(goalId, goal);

    const subtasks = Array.from(this.inMemorySubtasks.values())
      .filter(subtask => subtask.goalId === goalId);

    logger.info(`Goal updated (in-memory): ${goalId} by user ${userId}`);

    return {
      ...goal,
      subtasks,
      platformTags: [],
      teamMembers: [],
    };
  }

  // Toggle subtask completion
  async toggleSubtask(userId, subtaskId) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.toggleSubtaskInMemory(userId, subtaskId);
      }

      // Check if subtask exists and belongs to user's goal
      const subtask = await this.prisma.subtask.findFirst({
        where: {
          id: subtaskId,
          goal: {
            ownerId: userId,
          },
        },
        include: {
          goal: true,
        },
      });

      if (!subtask) {
        throw new Error('Subtask not found or access denied');
      }

      const updatedSubtask = await this.prisma.subtask.update({
        where: { id: subtaskId },
        data: {
          completed: !subtask.completed,
        },
      });

      logger.info(`Subtask toggled: ${subtaskId} by user ${userId}`);
      
      return updatedSubtask;
    } catch (error) {
      logger.error('Toggle subtask failed:', error);
      throw error;
    }
  }

  // In-memory subtask toggle
  toggleSubtaskInMemory(userId, subtaskId) {
    const subtask = this.inMemorySubtasks.get(subtaskId);
    
    if (!subtask) {
      throw new Error('Subtask not found');
    }

    // Check if subtask belongs to user's goal
    const goal = this.inMemoryGoals.get(subtask.goalId);
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Access denied');
    }

    subtask.completed = !subtask.completed;
    subtask.updatedAt = new Date();
    
    this.inMemorySubtasks.set(subtaskId, subtask);

    logger.info(`Subtask toggled (in-memory): ${subtaskId} by user ${userId}`);
    
    return subtask;
  }

  // Add a new subtask to a goal
  async addSubtask(userId, goalId, subtaskData) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.addSubtaskInMemory(userId, goalId, subtaskData);
      }

      // Check if goal exists and belongs to user
      const goal = await this.prisma.goal.findFirst({
        where: {
          id: goalId,
          ownerId: userId,
        },
      });

      if (!goal) {
        throw new Error('Goal not found or access denied');
      }

      const subtask = await this.prisma.subtask.create({
        data: {
          title: subtaskData.title,
          description: subtaskData.description,
          completed: false,
          goalId: goalId,
        },
      });

      logger.info(`Subtask added: ${subtask.id} to goal ${goalId} by user ${userId}`);
      
      return subtask;
    } catch (error) {
      logger.error('Add subtask failed:', error);
      throw error;
    }
  }

  // In-memory subtask addition
  addSubtaskInMemory(userId, goalId, subtaskData) {
    const goal = this.inMemoryGoals.get(goalId);
    
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Goal not found or access denied');
    }

    const subtaskId = `subtask-${this.subtaskIdCounter++}`;
    const subtask = {
      id: subtaskId,
      title: subtaskData.title,
      description: subtaskData.description,
      completed: false,
      estimatedHours: subtaskData.estimatedHours,
      category: subtaskData.category,
      skills: subtaskData.skills || [],
      dependencies: subtaskData.dependencies || [],
      goalId: goalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.inMemorySubtasks.set(subtaskId, subtask);

    logger.info(`Subtask added (in-memory): ${subtaskId} to goal ${goalId} by user ${userId}`);
    
    return subtask;
  }

  // Update a subtask
  async updateSubtask(userId, goalId, subtaskId, subtaskData) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.updateSubtaskInMemory(userId, goalId, subtaskId, subtaskData);
      }

      // Check if subtask exists and belongs to user's goal
      const subtask = await this.prisma.subtask.findFirst({
        where: {
          id: subtaskId,
          goalId: goalId,
          goal: {
            ownerId: userId,
          },
        },
      });

      if (!subtask) {
        throw new Error('Subtask not found or access denied');
      }

      const updatedSubtask = await this.prisma.subtask.update({
        where: { id: subtaskId },
        data: {
          title: subtaskData.title !== undefined ? subtaskData.title : undefined,
          description: subtaskData.description !== undefined ? subtaskData.description : undefined,
          completed: subtaskData.completed !== undefined ? subtaskData.completed : undefined,
        },
      });

      logger.info(`Subtask updated: ${subtaskId} by user ${userId}`);
      
      return updatedSubtask;
    } catch (error) {
      logger.error('Update subtask failed:', error);
      throw error;
    }
  }

  // In-memory subtask update
  updateSubtaskInMemory(userId, goalId, subtaskId, subtaskData) {
    const subtask = this.inMemorySubtasks.get(subtaskId);
    
    if (!subtask || subtask.goalId !== goalId) {
      throw new Error('Subtask not found');
    }

    // Check if subtask belongs to user's goal
    const goal = this.inMemoryGoals.get(goalId);
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Update subtask fields
    if (subtaskData.title !== undefined) subtask.title = subtaskData.title;
    if (subtaskData.description !== undefined) subtask.description = subtaskData.description;
    if (subtaskData.completed !== undefined) subtask.completed = subtaskData.completed;
    
    subtask.updatedAt = new Date();
    this.inMemorySubtasks.set(subtaskId, subtask);

    logger.info(`Subtask updated (in-memory): ${subtaskId} by user ${userId}`);
    
    return subtask;
  }

  // Check if all subtasks are completed and update goal status
  async checkAndUpdateGoalCompletion(userId, goalId) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.checkAndUpdateGoalCompletionInMemory(userId, goalId);
      }

      // Get all subtasks for the goal
      const goal = await this.prisma.goal.findFirst({
        where: {
          id: goalId,
          ownerId: userId,
        },
        include: {
          subtasks: true,
        },
      });

      if (!goal) {
        throw new Error('Goal not found or access denied');
      }

      // If goal has subtasks, check if all are completed
      if (goal.subtasks.length > 0) {
        const allCompleted = goal.subtasks.every(subtask => subtask.completed);
        
        if (allCompleted && goal.status !== 'COMPLETED') {
          await this.prisma.goal.update({
            where: { id: goalId },
            data: { status: 'COMPLETED' },
          });
          logger.info(`Goal auto-completed: ${goalId} (all subtasks done)`);
        } else if (!allCompleted && goal.status === 'COMPLETED') {
          await this.prisma.goal.update({
            where: { id: goalId },
            data: { status: 'ACTIVE' },
          });
          logger.info(`Goal reactivated: ${goalId} (not all subtasks done)`);
        }
      }
    } catch (error) {
      logger.error('Check goal completion failed:', error);
      throw error;
    }
  }

  // In-memory goal completion check
  checkAndUpdateGoalCompletionInMemory(userId, goalId) {
    const goal = this.inMemoryGoals.get(goalId);
    
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Goal not found or access denied');
    }

    // Get all subtasks for this goal
    const subtasks = Array.from(this.inMemorySubtasks.values())
      .filter(subtask => subtask.goalId === goalId);

    if (subtasks.length > 0) {
      const allCompleted = subtasks.every(subtask => subtask.completed);
      
      if (allCompleted && goal.status !== 'COMPLETED') {
        goal.status = 'COMPLETED';
        goal.updatedAt = new Date();
        this.inMemoryGoals.set(goalId, goal);
        logger.info(`Goal auto-completed (in-memory): ${goalId} (all subtasks done)`);
      } else if (!allCompleted && goal.status === 'COMPLETED') {
        goal.status = 'ACTIVE';
        goal.updatedAt = new Date();
        this.inMemoryGoals.set(goalId, goal);
        logger.info(`Goal reactivated (in-memory): ${goalId} (not all subtasks done)`);
      }
    }
  }

  // Delete a goal
  async deleteGoal(userId, goalId) {
    try {
      if (!this.isDatabaseAvailable) {
        return this.deleteGoalInMemory(userId, goalId);
      }

      // Check if goal exists and belongs to user
      const goal = await this.prisma.goal.findFirst({
        where: {
          id: goalId,
          ownerId: userId,
        },
      });

      if (!goal) {
        throw new Error('Goal not found or access denied');
      }

      await this.prisma.goal.delete({
        where: { id: goalId },
      });

      logger.info(`Goal deleted: ${goalId} by user ${userId}`);
      
      return { message: 'Goal deleted successfully' };
    } catch (error) {
      logger.error('Delete goal failed:', error);
      throw error;
    }
  }

  // In-memory goal deletion
  deleteGoalInMemory(userId, goalId) {
    const goal = this.inMemoryGoals.get(goalId);
    
    if (!goal || goal.ownerId !== userId) {
      throw new Error('Goal not found or access denied');
    }

    // Delete goal and its subtasks
    this.inMemoryGoals.delete(goalId);
    
    // Delete associated subtasks
    Array.from(this.inMemorySubtasks.entries()).forEach(([id, subtask]) => {
      if (subtask.goalId === goalId) {
        this.inMemorySubtasks.delete(id);
      }
    });

    logger.info(`Goal deleted (in-memory): ${goalId} by user ${userId}`);
    
    return { message: 'Goal deleted successfully' };
  }

  // Helper methods for formatting responses
  formatGoalsResponse(goals) {
    return goals.map(goal => this.formatGoalResponse(goal));
  }

  formatGoalResponse(goal) {
    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      status: goal.status,
      dueDate: goal.dueDate ? goal.dueDate.toISOString().split('T')[0] : null,
      projectId: goal.projectId,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      subtasks: goal.subtasks || [],
      platformTags: goal.platformTags?.map(pt => pt.platformTag.name) || [],
      teamMembers: goal.teamMembers?.map(tm => ({
        id: tm.user.id,
        name: `${tm.user.firstName} ${tm.user.lastName}`.trim(),
        initials: this.generateInitials(tm.user.firstName, tm.user.lastName),
      })) || [],
    };
  }

  generateInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return (first + last) || 'UN';
  }
}

module.exports = new GoalService();