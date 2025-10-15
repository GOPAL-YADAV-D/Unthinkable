const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const db = require('./utils/database');
// const dbClient = require('./config/database'); // Commented out for now

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/auth');
const goalRoutes = require('./routes/goals');
const llmRoutes = require('./routes/llm');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      database: dbHealth,
      services: {
        api: 'healthy',
        database: dbHealth.status,
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      database: {
        status: 'unhealthy',
        message: error.message,
      },
      services: {
        api: 'healthy',
        database: 'unhealthy',
      },
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/llm', llmRoutes);

// API documentation route
app.use('/api', (req, res, next) => {
  res.json({
    message: 'Productivity Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        profile: 'GET /api/auth/profile (requires auth)',
        updateProfile: 'PUT /api/auth/profile (requires auth)',
        changePassword: 'POST /api/auth/change-password (requires auth)',
        logout: 'POST /api/auth/logout (requires auth)',
        test: 'GET /api/auth/test (requires auth)',
      },
      goals: {
        list: 'GET /api/goals (requires auth)',
        create: 'POST /api/goals (requires auth)', 
        getById: 'GET /api/goals/:id (requires auth)',
        update: 'PUT /api/goals/:id (requires auth)',
        delete: 'DELETE /api/goals/:id (requires auth)',
        getByDate: 'GET /api/goals/date/:date (requires auth)',
        getByDateRange: 'GET /api/goals/date-range (requires auth)',
        stats: 'GET /api/goals/stats (requires auth)',
        addSubtask: 'POST /api/goals/:id/subtasks (requires auth)',
        toggleSubtask: 'PUT /api/goals/subtasks/:subtaskId/toggle (requires auth)',
      },
      llm: {
        generateSubtasks: 'POST /api/llm/generate-subtasks (requires auth)',
        optimizeTitle: 'POST /api/llm/optimize-title (requires auth)',
        chat: 'POST /api/llm/chat (requires auth)',
        suggestPriority: 'POST /api/llm/suggest-priority (requires auth)',
        estimateTime: 'POST /api/llm/estimate-time (requires auth)',
        status: 'GET /api/llm/status (requires auth)',
        health: 'GET /api/llm/health (requires auth)',
      },
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // await dbClient.disconnect(); // Commented out for now
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

// Start server
const PORT = config.port;

async function startServer() {
  try {
    // Connect to database
    const dbConnected = await db.connect();
    if (!dbConnected) {
      logger.warn('Starting server without database connection');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
      logger.info(`📝 API Documentation: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
      if (dbConnected) {
        logger.info(`�️  Database connected successfully`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;