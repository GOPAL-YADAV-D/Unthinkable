const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Registration controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login controller error:', error);
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      const result = await authService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh controller error:', error);
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.userId);
      
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get profile controller error:', error);
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const user = await authService.updateProfile(req.userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Update profile controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Both old and new passwords are required',
        });
      }

      const result = await authService.changePassword(
        req.userId,
        oldPassword,
        newPassword
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Change password controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Logout (client-side only for JWT)
  async logout(req, res) {
    try {
      // For JWT, logout is primarily handled client-side by removing the token
      // We could implement a token blacklist here if needed
      
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }
}

module.exports = new AuthController();