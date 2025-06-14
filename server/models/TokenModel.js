// models/TokenModel.js - JWT VERSION with Enhanced Error Handling
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenModel {
  // Check if JWT secret is configured
  static isConfigured() {
    return !!process.env.JWT_SECRET;
  }

  // Validate JWT secret exists and has minimum length
  static validateJWTSecret() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    if (process.env.JWT_SECRET.length < 32) {
      console.warn('JWT_SECRET should be at least 32 characters long for security');
    }
    return true;
  }

  // Create reset token for password reset using JWT
  static createResetToken(email, hoursToExpire = 1) {
    try {
      console.log(`Creating reset token for email: ${email}`);
      
      // Validate inputs
      if (!email || typeof email !== 'string') {
        throw new Error('Valid email is required');
      }
      
      // Validate JWT secret
      this.validateJWTSecret();
      
      const payload = {
        email: email,
        type: 'reset',
        exp: Math.floor(Date.now() / 1000) + (hoursToExpire * 3600),
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomBytes(16).toString('hex') // Unique token ID
      };
      
      console.log('JWT payload created:', { ...payload, jti: payload.jti.substring(0, 8) + '...' });
      
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      console.log(`✅ Created JWT reset token for ${email}, expires in ${hoursToExpire} hours`);
      return token;
    } catch (error) {
      console.error('❌ Error creating reset token:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to create reset token: ${error.message}`);
    }
  }

  // Create verification token for email verification using JWT
  static createVerificationToken(email, hoursToExpire = 24) {
    try {
      console.log(`Creating verification token for email: ${email}`);
      
      // Validate inputs
      if (!email || typeof email !== 'string') {
        throw new Error('Valid email is required');
      }
      
      // Validate JWT secret
      this.validateJWTSecret();
      
      const payload = {
        email: email,
        type: 'verification',
        exp: Math.floor(Date.now() / 1000) + (hoursToExpire * 3600),
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomBytes(16).toString('hex')
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      console.log(`✅ Created JWT verification token for ${email}, expires in ${hoursToExpire} hours`);
      return token;
    } catch (error) {
      console.error('❌ Error creating verification token:', error.message);
      throw new Error(`Failed to create verification token: ${error.message}`);
    }
  }

  // Verify JWT token and return token data
  static verifyToken(token) {
    try {
      console.log(`Verifying JWT token: ${token?.substring(0, 20)}...`);
      
      if (!token) {
        throw new Error('Token is required');
      }
      
      this.validateJWTSecret();
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ JWT token verified successfully');
      return {
        valid: true,
        data: decoded
      };
    } catch (error) {
      console.error('❌ JWT verification error:', error.message);
      
      let errorMessage = 'Invalid token';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token format';
      } else if (error.message.includes('JWT_SECRET')) {
        errorMessage = 'Server configuration error';
      }
      
      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  // JWT tokens don't need manual deletion (they expire automatically)
  static deleteToken(token) {
    console.log('JWT tokens expire automatically - no manual deletion needed');
    return true;
  }

  // For JWT, we can't count active tokens (they're stateless)
  static getTokenCount() {
    console.log('JWT tokens are stateless - count not available');
    return 0;
  }

  // JWT tokens expire automatically - no cleanup needed
  static cleanupExpiredTokens() {
    console.log('JWT tokens expire automatically - no cleanup needed');
    return 0;
  }

  // Can't get tokens by email with JWT (stateless)
  static getTokensByEmail(email) {
    console.log('JWT tokens are stateless - cannot retrieve by email');
    return [];
  }

  // Can't delete tokens by email with JWT (stateless)
  static deleteTokensByEmail(email) {
    console.log('JWT tokens are stateless - cannot delete by email');
    return 0;
  }

  // No auto cleanup needed for JWT
  static startAutoCleanup() {
    console.log('JWT tokens expire automatically - no auto cleanup needed');
  }

  // Decode JWT without verification (for debugging)
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Debug method to check environment
  static debugEnvironment() {
    console.log('=== TokenModel Debug Info ===');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('=============================');
  }
}

module.exports = TokenModel;