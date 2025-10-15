const goalService = require('../services/goalService');
const logger = require('../utils/logger');

class GoalController {
  // Get all goals for the authenticated user
  async getGoals(req, res) {
    try {
      const { status, priority, projectId } = req.query;
      const filters = {};
      
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (projectId) filters.projectId = projectId;

      const goals = await goalService.getUserGoals(req.userId, filters);
      
      res.status(200).json({
        success: true,
        data: { goals },
      });
    } catch (error) {
      logger.error('Get goals controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get goals by specific date (matching frontend expectation)
  async getGoalsByDate(req, res) {
    try {
      const { date } = req.params;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date parameter is required',
        });
      }

      const goals = await goalService.getGoalsByDate(req.userId, date);
      
      res.status(200).json({
        success: true,
        data: { goals },
      });
    } catch (error) {
      logger.error('Get goals by date controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get goals grouped by date (matching frontend GoalsByDate type)
  async getGoalsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate query parameters are required',
        });
      }

      const goalsByDate = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate dates in range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateKey = date.toISOString().split('T')[0];
        const goals = await goalService.getGoalsByDate(req.userId, dateKey);
        if (goals.length > 0) {
          goalsByDate[dateKey] = goals;
        }
      }
      
      res.status(200).json({
        success: true,
        data: { goalsByDate },
      });
    } catch (error) {
      logger.error('Get goals by date range controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create a new goal
  async createGoal(req, res) {
    try {
      const goal = await goalService.createGoal(req.userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        data: { goal },
      });
    } catch (error) {
      logger.error('Create goal controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get a specific goal by ID
  async getGoal(req, res) {
    try {
      const { id } = req.params;
      
      // For now, we'll get all goals and filter by ID
      // In a real implementation, we'd have a getGoalById method
      const goals = await goalService.getUserGoals(req.userId);
      const goal = goals.find(g => g.id === id);
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          error: 'Goal not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: { goal },
      });
    } catch (error) {
      logger.error('Get goal controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update a goal
  async updateGoal(req, res) {
    try {
      const { id } = req.params;
      const goal = await goalService.updateGoal(req.userId, id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        data: { goal },
      });
    } catch (error) {
      logger.error('Update goal controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Delete a goal
  async deleteGoal(req, res) {
    try {
      const { id } = req.params;
      const result = await goalService.deleteGoal(req.userId, id);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Delete goal controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Toggle subtask completion
  async toggleSubtask(req, res) {
    try {
      const { subtaskId } = req.params;
      const subtask = await goalService.toggleSubtask(req.userId, subtaskId);
      
      // Check if all subtasks are completed and update goal status if needed
      await goalService.checkAndUpdateGoalCompletion(req.userId, subtask.goalId);
      
      res.status(200).json({
        success: true,
        message: 'Subtask updated successfully',
        data: { subtask },
      });
    } catch (error) {
      logger.error('Toggle subtask controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Add a new subtask to a goal
  async addSubtask(req, res) {
    try {
      const { id: goalId } = req.params;
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Subtask title is required',
        });
      }

      const subtask = await goalService.addSubtask(req.userId, goalId, {
        title,
        description,
      });
      
      res.status(201).json({
        success: true,
        message: 'Subtask added successfully',
        data: { subtask },
      });
    } catch (error) {
      logger.error('Add subtask controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update a subtask
  async updateSubtask(req, res) {
    try {
      const { goalId, subtaskId } = req.params;
      const { title, description, completed } = req.body;
      
      const subtask = await goalService.updateSubtask(req.userId, goalId, subtaskId, {
        title,
        description,
        completed,
      });
      
      // Check if all subtasks are completed and update goal status if needed
      if (completed !== undefined) {
        await goalService.checkAndUpdateGoalCompletion(req.userId, goalId);
      }
      
      res.status(200).json({
        success: true,
        message: 'Subtask updated successfully',
        data: { subtask },
      });
    } catch (error) {
      logger.error('Update subtask controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get dashboard summary stats
  async getDashboardStats(req, res) {
    try {
      const goals = await goalService.getUserGoals(req.userId);
      
      const stats = {
        totalGoals: goals.length,
        activeGoals: goals.filter(g => g.status === 'ACTIVE').length,
        completedGoals: goals.filter(g => g.status === 'COMPLETED').length,
        highPriorityGoals: goals.filter(g => g.priority === 'HIGH').length,
        totalSubtasks: goals.reduce((sum, goal) => sum + goal.subtasks.length, 0),
        completedSubtasks: goals.reduce((sum, goal) => 
          sum + goal.subtasks.filter(st => st.completed).length, 0
        ),
      };

      stats.goalCompletionRate = stats.totalGoals > 0 
        ? Math.round((stats.completedGoals / stats.totalGoals) * 100) 
        : 0;
      
      stats.subtaskCompletionRate = stats.totalSubtasks > 0 
        ? Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100) 
        : 0;
      
      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      logger.error('Get dashboard stats controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new GoalController();