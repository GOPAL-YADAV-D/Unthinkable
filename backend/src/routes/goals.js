const express = require('express');
const goalController = require('../controllers/goalController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All goal routes require authentication
router.use(authenticate);

// Goal CRUD operations
router.get('/', goalController.getGoals);                           // GET /api/goals
router.post('/', goalController.createGoal);                        // POST /api/goals
router.get('/stats', goalController.getDashboardStats);             // GET /api/goals/stats
router.get('/date/:date', goalController.getGoalsByDate);           // GET /api/goals/date/2025-10-15
router.get('/date-range', goalController.getGoalsByDateRange);      // GET /api/goals/date-range?startDate=2025-10-01&endDate=2025-10-31
router.get('/:id', goalController.getGoal);                        // GET /api/goals/:id
router.put('/:id', goalController.updateGoal);                     // PUT /api/goals/:id
router.delete('/:id', goalController.deleteGoal);                  // DELETE /api/goals/:id

// Subtask operations
router.post('/:id/subtasks', goalController.addSubtask);           // POST /api/goals/:id/subtasks
router.put('/:goalId/subtasks/:subtaskId', goalController.updateSubtask); // PUT /api/goals/:goalId/subtasks/:subtaskId
router.put('/subtasks/:subtaskId/toggle', goalController.toggleSubtask); // PUT /api/goals/subtasks/:subtaskId/toggle

module.exports = router;