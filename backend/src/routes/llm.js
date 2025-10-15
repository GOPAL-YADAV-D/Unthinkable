const express = require('express');
const rateLimit = require('express-rate-limit');
const llmController = require('../controllers/llmController');
const { authenticate } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// Rate limiting for LLM endpoints (more restrictive)
const llmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.llmMaxRequests, // Limit each IP to configured LLM requests
  message: {
    success: false,
    error: 'Too many LLM requests, please try again later. LLM usage is rate limited to prevent abuse.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All LLM routes require authentication and rate limiting
router.use(authenticate);
router.use(llmRateLimit);

// LLM service routes

// Generate subtasks for a goal
router.post('/generate-subtasks', llmController.generateSubtasks);

// Optimize goal title
router.post('/optimize-title', llmController.optimizeTitle);

// Interactive chat for goal planning
router.post('/chat', llmController.chat);

// Suggest priority level for a goal
router.post('/suggest-priority', llmController.suggestPriority);

// Estimate completion time for a goal
router.post('/estimate-time', llmController.estimateTime);

// Get LLM service status and capabilities
router.get('/status', llmController.getStatus);

// Health check for LLM services
router.get('/health', (req, res) => {
  const status = llmController.getStatus ? llmController.getStatus() : { openai: { available: false } };
  
  res.status(200).json({
    success: true,
    data: {
      service: 'LLM Service',
      status: 'operational',
      providers: {
        openai: status.openai?.available ? 'available' : 'unavailable',
        fallback: 'available',
      },
      endpoints: [
        'POST /api/llm/generate-subtasks',
        'POST /api/llm/optimize-title',
        'POST /api/llm/chat',
        'POST /api/llm/suggest-priority',
        'POST /api/llm/estimate-time',
        'GET /api/llm/status',
        'GET /api/llm/health',
      ],
      rateLimit: {
        window: '15 minutes',
        maxRequests: config.rateLimit.llmMaxRequests,
      },
    },
  });
});

module.exports = router;