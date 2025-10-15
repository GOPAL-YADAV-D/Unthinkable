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

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug({
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log database errors
    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });

    // Log database info
    this.prisma.$on('info', (e) => {
      logger.info('Database info:', e.message);
    });

    // Log database warnings
    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning:', e.message);
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('📦 Connected to database successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('📦 Disconnected from database');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  getClient() {
    return this.prisma;
  }
}

// Create a singleton instance
const dbClient = new DatabaseClient();

module.exports = dbClient;