// routes/mailRoutes.js
const express = require("express");
const router = express.Router();
const mailService = require("../services/mailService");
const TokenModel = require("../models/TokenModel");

const bcrypt = require("bcryptjs");

// At the top of mailRoutes.js/ Adjust path based on your folder structure
const { getUserByEmail, updatePassword } = require('../models/userModel');

// Test mail service
router.get("/test", async (req, res) => {
  try {
    const isConnected = await mailService.verifyConnection();
    res.json({ 
      message: isConnected ? "Mail service is working" : "Mail service connection failed",
      status: isConnected ? "success" : "error"
    });
  } catch (error) {
    res.status(500).json({ message: "Mail service test failed", error: error.message });
  }
});
router.post("/send-reset-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: "Email is required",
        success: false 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email format",
        success: false 
      });
    }

    // Database validation - Check if user exists
    try {
      // Check if user exists using your existing function
      const user = await getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          success: false
        });
      }

      // Additional user validations
      if (user.isDeleted) {
        return res.status(404).json({ 
          message: "User not found",
          success: false
        });
      }

      if (user.status === 'inactive' || user.status === 'suspended') {
        return res.status(403).json({ 
          message: "Account is not active. Please contact support.",
          success: false
        });
      }

    } catch (dbError) {
      console.error("Database validation error:", dbError);
      return res.status(500).json({ 
        message: "Database error occurred",
        success: false
      });
    }

    // Token generation and email sending
    try {
      // Generate reset token using TokenModel
      const resetToken = TokenModel.createResetToken(email, 1); // 1 hour expiry

      // Send email
      const result = await mailService.sendPasswordResetEmail(email, resetToken);

      if (!result.success) {
        console.error("Email sending failed:", result.error);
        return res.status(500).json({ 
          message: "Failed to send password reset email",
          success: false,
          error: result.error
        });
      }

      // Log successful password reset request for security monitoring
      console.log(`Password reset requested for email: ${email} at ${new Date().toISOString()}`);

    } catch (tokenError) {
      console.error("Token creation error:", tokenError);
      return res.status(500).json({ 
        message: "Failed to generate reset token",
        success: false
      });
    }

    res.json({ 
      message: "Password reset email sent successfully",
      success: true
    });

  } catch (error) {
    console.error("Send reset email error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      success: false 
    });
  }
});
// Verify reset token with database validation
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Reset token is required",
        success: false
      });
    }

    // Validate token format (if you have specific format requirements)
    if (typeof token !== 'string' || token.length < 10) {
      return res.status(400).json({
        message: "Invalid token format",
        success: false
      });
    }

    // Check if token exists and is valid using JWT verification
    const tokenVerification = TokenModel.verifyToken(token);
    
    if (!tokenVerification.valid) {
      return res.status(400).json({
        message: tokenVerification.error || "Invalid or expired reset token",
        success: false
      });
    }

    const tokenData = tokenVerification.data;

    // Verify associated user still exists and is valid
    try {
      const user = await getUserByEmail(tokenData.email);
      
      if (!user) {
        // JWT tokens expire automatically, no manual cleanup needed
        return res.status(400).json({
          message: "Invalid reset token",
          success: false
        });
      }

      if (user.isDeleted || user.status === 'inactive' || user.status === 'suspended') {
        return res.status(403).json({
          message: "Account is not active",
          success: false
        });
      }

    } catch (dbError) {
      console.error("Database validation error during token verification:", dbError);
      return res.status(500).json({
        message: "Database error occurred",
        success: false
      });
    }

    res.json({
      message: "Token is valid",
      success: true,
      email: tokenData.email // Optional: return email for frontend use
    });

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false
    });
  }
});

// Reset password with database validation
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
        success: false
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
        success: false
      });
    }

    // Verify token using JWT verification
    const tokenVerification = TokenModel.verifyToken(token);
    
    if (!tokenVerification.valid) {
      return res.status(400).json({
        message: tokenVerification.error || "Invalid or expired reset token",
        success: false
      });
    }

    const tokenData = tokenVerification.data;

    // Database validation - Update user password
    try {
      const user = await getUserByEmail(tokenData.email);
      
      if (!user) {
        return res.status(400).json({
          message: "Invalid reset token",
          success: false
        });
      }

      if (user.isDeleted || user.status !== 'active') {
        return res.status(403).json({
          message: "Account is not active",
          success: false
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

await updatePassword(user.id, hashedPassword);
      // Update user password
      

      // JWT tokens expire automatically, no manual cleanup needed
      // Optional: Invalidate all existing sessions for this user
      // await SessionModel.deleteAllUserSessions(user.id);

      // Log password reset for security
      console.log(`Password reset completed for user ID: ${user.id} at ${new Date().toISOString()}`);

    } catch (dbError) {
      console.error("Database error during password reset:", dbError);
      return res.status(500).json({
        message: "Failed to reset password",
        success: false
      });
    }

    res.json({
      message: "Password reset successfully",
      success: true
    });

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false
    });
  }
});
router.post("/send-notification", async (req, res) => {
  try {
    const { email, userName, title, message } = req.body;

    if (!email || !title || !message) {
      return res.status(400).json({ message: "Email, title, and message are required" });
    }

    const result = await mailService.sendNotificationEmail(email, title, message, userName || "User");

    if (result.success) {
      res.json({ 
        message: "Notification email sent successfully",
        success: true
      });
    } else {
      res.status(500).json({ 
        message: "Failed to send notification email",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Send notification email error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Send custom email
router.post("/send-custom", async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent } = req.body;

    if (!to || !subject || !htmlContent) {
      return res.status(400).json({ message: "To, subject, and htmlContent are required" });
    }

    const result = await mailService.sendCustomEmail(to, subject, htmlContent, textContent);

    if (result.success) {
      res.json({ 
        message: "Custom email sent successfully",
        success: true
      });
    } else {
      res.status(500).json({ 
        message: "Failed to send custom email",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Send custom email error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get token statistics (for debugging/monitoring)
router.get("/token-stats", (req, res) => {
  try {
    const stats = {
      totalTokens: TokenModel.getTokenCount(),
      cleanedTokens: TokenModel.cleanupExpiredTokens()
    };
    
    res.json({
      message: "Token statistics retrieved",
      stats: stats,
      success: true
    });
  } catch (error) {
    console.error("Get token stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Clean up expired tokens manually
router.delete("/cleanup-tokens", (req, res) => {
  try {
    const cleanedCount = TokenModel.cleanupExpiredTokens();
    
    res.json({
      message: `Cleaned up ${cleanedCount} expired tokens`,
      cleanedCount: cleanedCount,
      success: true
    });
  } catch (error) {
    console.error("Cleanup tokens error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;