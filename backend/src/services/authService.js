const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const config = require('../config');
const db = require('../utils/database');
const logger = require('../utils/logger');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

class AuthService {
  constructor() {
    this.prisma = db.client;
    this.isDatabaseAvailable = this.checkDatabaseAvailability();
    // In-memory storage for development when database is not available
    this.inMemoryUsers = new Map();
    this.userIdCounter = 1;
  }

  checkDatabaseAvailability() {
    return !(!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password'));
  }

  // Generate JWT tokens
  generateTokens(userId) {
    const payload = { userId, type: 'access' };
    
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshPayload = { userId, type: 'refresh' };
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  verifyToken(token, type = 'access') {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, config.security.bcryptRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(userData) {
    try {
      // Validate input
      const validatedData = registerSchema.parse(userData);

      if (!this.isDatabaseAvailable) {
        // Fallback to in-memory storage for development
        return this.registerInMemory(validatedData);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(validatedData.password);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: validatedData.email,
          passwordHash: hashedPassword,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = this.generateTokens(user.id);

      logger.info(`New user registered: ${user.email}`);

      return {
        user,
        tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // In-memory registration for development
  async registerInMemory(validatedData) {
    // Check if user already exists
    for (const [id, user] of this.inMemoryUsers) {
      if (user.email === validatedData.email) {
        throw new Error('User with this email already exists');
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(validatedData.password);

    // Create user
    const userId = `user-${this.userIdCounter++}`;
    const user = {
      id: userId,
      email: validatedData.email,
      passwordHash: hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      createdAt: new Date(),
    };

    this.inMemoryUsers.set(userId, user);

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    logger.info(`New user registered (in-memory): ${user.email}`);

    // Return user data (without password hash)
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Login user
  async login(credentials) {
    try {
      // Validate input
      const validatedData = loginSchema.parse(credentials);

      if (!this.isDatabaseAvailable) {
        // Fallback to in-memory storage for development
        return this.loginInMemory(validatedData);
      }

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await this.comparePassword(
        validatedData.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = this.generateTokens(user.id);

      // Return user data (without password hash)
      const { passwordHash, ...userWithoutPassword } = user;

      logger.info(`User logged in: ${user.email}`);

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // In-memory login for development
  async loginInMemory(validatedData) {
    // Find user by email
    let user = null;
    for (const [id, userData] of this.inMemoryUsers) {
      if (userData.email === validatedData.email) {
        user = userData;
        break;
      }
    }

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await this.comparePassword(
      validatedData.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Return user data (without password hash)
    const { passwordHash, ...userWithoutPassword } = user;

    logger.info(`User logged in (in-memory): ${user.email}`);

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken, 'refresh');

      // Check if user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id);

      return {
        user,
        tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      if (!this.isDatabaseAvailable) {
        // Fallback to in-memory storage for development
        const user = this.inMemoryUsers.get(userId);
        if (!user) {
          throw new Error('User not found');
        }
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Get profile failed:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        avatarUrl: z.string().url().optional(),
      });

      const validatedData = updateSchema.parse(updateData);

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });

      logger.info(`User profile updated: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Profile update failed:', error);
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Validate new password
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      // Get user with password hash
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isOldPasswordValid = await this.comparePassword(
        oldPassword,
        user.passwordHash
      );

      if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
      });

      logger.info(`Password changed for user: ${user.email}`);

      return { message: 'Password updated successfully' };
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();