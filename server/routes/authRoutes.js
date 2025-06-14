const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const admin = require("../config/firebase");
const { createUser, getUserByEmail } = require("../models/userModel");

// Signup route


// Run this once to generate the correct hash for "rt12"


async function generateHash() {
  const hash = await bcrypt.hash('rt12', 12);
  console.log('Hash for rt12:', hash);
}

generateHash();



router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    console.log("Signup attempt:", { 
      name, 
      email, 
      password: "***", 
      phoneNumber: phoneNumber ? "***" : "not provided" 
    });

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Convert to strings to handle numeric inputs
    const nameString = String(name).trim();
    const emailString = String(email).toLowerCase().trim();
    const passwordString = String(password);
    const phoneString = phoneNumber ? String(phoneNumber).trim() : null;

    // Optional: Validate phone number format if provided
    if (phoneString && phoneString.length > 0) {
      // Basic phone validation (adjust regex as needed for your requirements)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phoneString.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({ message: "Please enter a valid phone number" });
      }
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(emailString);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash the password with consistent salt rounds (12 to match your existing hashes)
    const hashedPassword = await bcrypt.hash(passwordString, 12);
    console.log("Password hashed successfully");

    // Create user with phone number
    const user = await createUser(nameString, emailString, hashedPassword, phoneString);
    console.log("User created successfully:", user);

    // Return user data WITHOUT password
    res.status(201).json({ 
      message: "Account created successfully", 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        phoneNumber: user.phone_number || null // Note: database field is phone_number
      } 
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// LOGIN ROUTE - FIXED with Google OAuth handling
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, password: "***" });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Convert to strings to handle numeric inputs
    const emailString = String(email).toLowerCase().trim();
    const passwordString = String(password);

    console.log("Password as string:", passwordString);

    // Find user by email
    const user = await getUserByEmail(emailString);
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if this is a Google OAuth user
    if (user.password === 'GOOGLE_OAUTH_USER') {
      return res.status(401).json({ 
        message: "This account uses Google Sign-In. Please use Google to log in." 
      });
    }

    console.log("User found, comparing passwords...");
    console.log("Stored hash:", user.password);

    // Compare password with hashed password in DB
    const isPasswordValid = await bcrypt.compare(passwordString, user.password);
    console.log("Password comparison result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Password invalid");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("Login successful");

    // Return user data WITHOUT password
    res.status(200).json({ 
      message: "Login successful", 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      } 
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GOOGLE SIGNUP ROUTE
router.post("/google-signup", async (req, res) => {
  try {
    console.log("Google signup request received:", req.body);
    
    const { token } = req.body;

    if (!token) {
      console.log("No token provided");
      return res.status(400).json({ message: "Token is required" });
    }

    console.log("Verifying Firebase token...");
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("Token decoded successfully:", { 
      email: decoded.email, 
      name: decoded.name || decoded.displayName 
    });
    
    const email = decoded.email;
    const name = decoded.name || decoded.displayName || "Unnamed User";

    console.log("Checking for existing user with email:", email);
    const existingUser = await getUserByEmail(email);
    
    if (existingUser) {
      console.log("User already exists:", existingUser.email);
      return res.status(409).json({ message: "User already exists" });
    }

    console.log("Creating new user:", { name, email });
    // For Google users, we don't pass a password (will use placeholder)
    const newUser = await createUser(name, email);
    console.log("User created successfully:", newUser);

    console.log("Database insertion result:", newUser);
    
    // Return user data WITHOUT password
    res.status(201).json({ 
      message: "Google signup successful", 
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error("Google signup error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: "Invalid token format" });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ message: "Token revoked" });
    }
    
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// GOOGLE LOGIN ROUTE
router.post("/google-login", async (req, res) => {
  try {
    console.log("Google login request received:", req.body);
    
    const { token } = req.body;

    if (!token) {
      console.log("No token provided");
      return res.status(400).json({ message: "Token is required" });
    }

    console.log("Verifying Firebase token...");
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("Token decoded successfully:", { 
      email: decoded.email, 
      name: decoded.name || decoded.displayName 
    });
    
    const email = decoded.email;

    console.log("Checking for existing user with email:", email);
    const existingUser = await getUserByEmail(email);
    
    if (!existingUser) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found. Please sign up first." });
    }

    // Check if this is indeed a Google OAuth user
    if (existingUser.password !== 'GOOGLE_OAUTH_USER') {
      return res.status(400).json({ 
        message: "This account uses email/password login. Please use your password to log in." 
      });
    }

    console.log("Google login successful");
    
    // Return user data
    res.status(200).json({ 
      message: "Google login successful", 
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email
      }
    });
  } catch (error) {
    console.error("Google login error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: "Invalid token format" });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ message: "Token revoked" });
    }
    
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;