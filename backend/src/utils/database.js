const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class DatabaseClient {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Set up event listeners for logging
    this.prisma.$on('query', (e) => {
      logger.debug(`Query: ${e.query} Params: ${e.params} Duration: ${e.duration}ms`);
    });

    this.prisma.$on('error', (e) => {
      logger.error(`Database error: ${e.message}`, { target: e.target });
    });

    this.prisma.$on('info', (e) => {
      logger.info(`Database info: ${e.message}`, { target: e.target });
    });

    this.prisma.$on('warn', (e) => {
      logger.warn(`Database warning: ${e.message}`, { target: e.target });
    });
  }

  async connect() {
    try {
      // Skip database connection if DATABASE_URL is not properly configured
      if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password')) {
        logger.warn('Database URL not configured, skipping database connection');
        return false;
      }
      
      await this.prisma.$connect();
      logger.info('Database connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      return false;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }

  async healthCheck() {
    try {
      // If no database connection, return not configured status
      if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password')) {
        return { status: 'not_configured', message: 'Database URL not configured' };
      }
      
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', message: 'Database connection is working' };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Getter to access Prisma client
  get client() {
    return this.prisma;
  }
}

// Create singleton instance
const db = new DatabaseClient();

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await db.disconnect();
});

process.on('SIGTERM', async () => {
  await db.disconnect();
});

process.on('SIGINT', async () => {
  await db.disconnect();
});

module.exports = db;