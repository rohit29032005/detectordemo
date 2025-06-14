// config/mailConfig.js
const nodemailer = require('nodemailer');

const createTransport = () => {
  // Validate required environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Additional options for Gmail and other providers
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('Creating SMTP transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user
  });

  return nodemailer.createTransport(config);
};

// Alternative Gmail-specific configuration
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

module.exports = { createTransport, createGmailTransporter };

// ================================================================
// services/mailService.js
class MailService {
  constructor() {
    this.transporter = null;
   
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
    this.supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
    this.fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  }

  // Lazy initialization of transporter with fallback
  getTransporter() {
    if (!this.transporter) {
      try {
        // Try standard configuration first
        this.transporter = createTransport();
      } catch (error) {
        console.warn('Standard SMTP config failed, trying Gmail service:', error.message);
        try {
          // Fallback to Gmail service configuration
          this.transporter = createGmailTransporter();
        } catch (gmailError) {
          console.error('Gmail service config also failed:', gmailError.message);
          throw new Error('Failed to create mail transporter with both configurations');
        }
      }
    }
    return this.transporter;
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log('✅ Mail service is ready to send emails');
      return { success: true, message: 'Mail service verified successfully' };
    } catch (error) {
      console.error('❌ Mail service error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Test email sending
  async sendTestEmail(toEmail = null) {
    try {
      const testEmail = toEmail || this.supportEmail;
      const result = await this.sendCustomEmail(
        testEmail,
        'Test Email - Mail Service Working',
        '<h1>Test Email</h1><p>Your mail service is working correctly!</p>',
        'Test Email - Your mail service is working correctly!'
      );
      return result;
    } catch (error) {
      console.error('Test email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, userName = '') {
    try {
      const resetLink = `${this.appUrl}/api/mail/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: this.appName,
          address: this.fromEmail
        },
        to: email,
        subject: `Password Reset - ${this.appName}`,
        html: this.getPasswordResetTemplate(userName, resetLink),
        text: this.getPasswordResetTextTemplate(userName, resetLink)
      };

      const info = await this.getTransporter().sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Password reset email error:', error);
      return { success: false, error: error.message };
    }
  }async sendPasswordResetEmail(email, resetToken, userName = '') {
  try {
    // ✅ FIXED: Point to frontend page with token parameter
    const resetLink = `${this.appUrl}/detectordemo/login.html?token=${resetToken}`;
    // Alternative if your HTML is in a specific path:
    // const resetLink = `${this.appUrl}/index.html?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: this.appName,
        address: this.fromEmail
      },
      to: email,
      subject: `Password Reset - ${this.appName}`,
      html: this.getPasswordResetTemplate(userName, resetLink),
      text: this.getPasswordResetTextTemplate(userName, resetLink)
    };

    const info = await this.getTransporter().sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
}
  // Send welcome email
  async sendWelcomeEmail(email, userName) {
    try {
      const mailOptions = {
        from: {
          name: this.appName,
          address: this.fromEmail
        },
        to: email,
        subject: `Welcome to ${this.appName}!`,
        html: this.getWelcomeTemplate(userName),
        text: this.getWelcomeTextTemplate(userName)
      };

      const info = await this.getTransporter().sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Welcome email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification
  async sendEmailVerification(email, verificationToken, userName = '') {
    try {
      const verificationLink = `${this.appUrl}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: {
          name: this.appName,
          address: this.fromEmail
        },
        to: email,
        subject: `Verify Your Email - ${this.appName}`,
        html: this.getEmailVerificationTemplate(userName, verificationLink),
        text: this.getEmailVerificationTextTemplate(userName, verificationLink)
      };

      const info = await this.getTransporter().sendMail(mailOptions);
      console.log('Email verification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send custom email
  async sendCustomEmail(to, subject, htmlContent, textContent = '') {
    try {
      const mailOptions = {
        from: {
          name: this.appName,
          address: this.fromEmail
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const info = await this.getTransporter().sendMail(mailOptions);
      console.log('Custom email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Custom email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email
  async sendNotificationEmail(email, title, message, userName = '') {
    try {
      const mailOptions = {
        from: {
          name: this.appName,
          address: this.fromEmail
        },
        to: email,
        subject: `${title} - ${this.appName}`,
        html: this.getNotificationTemplate(userName, title, message),
        text: this.getNotificationTextTemplate(userName, title, message)
      };

      const info = await this.getTransporter().sendMail(mailOptions);
      console.log('Notification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Notification email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk emails (with rate limiting)
  async sendBulkEmails(emails, subject, htmlContent, textContent = '', options = {}) {
    const { batchSize = 5, delay = 1000 } = options;
    const results = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => 
        this.sendCustomEmail(email, subject, htmlContent, textContent)
      );
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error);
      }
    }
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    return {
      success: true,
      total: emails.length,
      successful,
      failed,
      results
    };
  }

  // Utility function to strip HTML tags
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // HTML Email Templates
  getPasswordResetTemplate(userName, resetLink) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: 400; opacity: 0.9; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; transition: background 0.3s; }
          .button:hover { background: #5a6fd8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
          .security-note { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.appName}</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>You requested a password reset for your ${this.appName} account. No worries, it happens to the best of us!</p>
            <p>Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>
            <div class="warning">
              <strong>⏰ This link will expire in 1 hour</strong> for your security.
            </div>
            <div class="security-note">
              <h4>🔒 Security Information:</h4>
              <ul>
                <li>This link can only be used once</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your current password remains unchanged until you create a new one</li>
              </ul>
            </div>
            <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetLink}</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>${this.appName} Team</strong></p>
            <p><small>If you have any questions, contact us at ${this.supportEmail}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 32px; font-weight: 300; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .emoji { font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎉</div>
            <h1>Welcome to ${this.appName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to ${this.appName}! We're absolutely thrilled to have you join our growing community.</p>
            <p>Your account has been successfully created, and you now have access to all our amazing features.</p>
            <div class="features">
              <h3>🚀 What's Next?</h3>
              <ul>
                <li>Explore all the features available to you</li>
                <li>Customize your profile settings</li>
                <li>Connect with other members of our community</li>
                <li>Take advantage of our support resources</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="${this.appUrl}" class="button">Get Started Now</a>
            </div>
            <p>If you have any questions or need assistance getting started, don't hesitate to reach out to our friendly support team at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a>.</p>
            <p>We're here to help you make the most of your ${this.appName} experience!</p>
          </div>
          <div class="footer">
            <p>Welcome aboard! 🎊<br><strong>${this.appName} Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEmailVerificationTemplate(userName, verificationLink) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Email</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: 400; opacity: 0.9; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.appName}</h1>
            <h2>📧 Email Verification</h2>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>Thanks for joining ${this.appName}! We're excited to have you on board.</p>
            <p>To complete your registration and start using all our features, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">✓ Verify My Email</a>
            </div>
            <div class="warning">
              <strong>⏰ This verification link will expire in 24 hours.</strong>
            </div>
            <p>Once verified, you'll have full access to your account and can start exploring everything ${this.appName} has to offer.</p>
            <p>If you didn't create this account, please ignore this email and the account will remain unverified.</p>
            <p>Having trouble with the button? Copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationLink}</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>${this.appName} Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getNotificationTemplate(userName, title, message) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: 400; opacity: 0.9; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .message-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 5px 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.appName}</h1>
            <h2>🔔 ${title}</h2>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <div class="message-box">
              <p>${message}</p>
            </div>
            <p>If you have any questions about this notification, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>${this.appName} Team</strong></p>
            <p><small>Contact us: ${this.supportEmail}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Text Email Templates (fallback)
  getPasswordResetTextTemplate(userName, resetLink) {
    return `
Hi ${userName || 'there'},

You requested a password reset for your ${this.appName} account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
${this.appName} Team

---
If you're having trouble clicking the link, copy and paste it into your browser.
    `.trim();
  }

  getWelcomeTextTemplate(userName) {
    return `
Hi ${userName},

Welcome to ${this.appName}! We're thrilled to have you join our community.

Your account has been successfully created, and you now have access to all our features.

Get started: ${this.appUrl}

If you have any questions, feel free to contact us at ${this.supportEmail}.

Best regards,
${this.appName} Team
    `.trim();
  }

  getEmailVerificationTextTemplate(userName, verificationLink) {
    return `
Hi ${userName || 'there'},

Thanks for joining ${this.appName}! 

Please verify your email address by clicking the link below:
${verificationLink}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
${this.appName} Team
    `.trim();
  }

  getNotificationTextTemplate(userName, title, message) {
    return `
Hi ${userName || 'there'},

${title}

${message}

Best regards,
${this.appName} Team

Contact us: ${this.supportEmail}
    `.trim();
  }
}

module.exports = new MailService();