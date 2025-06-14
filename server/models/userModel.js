const pool = require("../config/db");

// Create user - handles both regular signup and Google OAuth with phone number
const createUser = async (name, email, hashedPassword = null, phoneNumber = null) => {
  const query = `
    INSERT INTO users (name, email, password, phone_number) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, name, email, phone_number
  `;
  
  // For Google OAuth users, use a placeholder instead of null
  const passwordToStore = hashedPassword || 'GOOGLE_OAUTH_USER';
  
  const result = await pool.query(query, [name, email, passwordToStore, phoneNumber]);
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  try {
    console.log("Searching for user with email:", email);
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    console.log("Query result:", result.rows.length > 0 ? "User found" : "User not found");
    return result.rows[0];
  } catch (error) {
    console.error("Database error in getUserByEmail:", error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Database error in getUserById:", error);
    throw error;
  }
};

// Update password function
const updatePassword = async (userId, hashedPassword) => {
  try {
    const query = "UPDATE users SET password = $1 WHERE id = $2";
    await pool.query(query, [hashedPassword, userId]);
    return true;
  } catch (error) {
    console.error("Database error in updatePassword:", error);
    throw error;
  }
};

// NEW: Update phone number function
const updatePhoneNumber = async (userId, phoneNumber) => {
  try {
    const query = "UPDATE users SET phone_number = $1 WHERE id = $2";
    await pool.query(query, [phoneNumber, userId]);
    return true;
  } catch (error) {
    console.error("Database error in updatePhoneNumber:", error);
    throw error;
  }
};

// NEW: Get user by phone number (if needed for validation)
const getUserByPhone = async (phoneNumber) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE phone_number = $1", [phoneNumber]);
    return result.rows[0];
  } catch (error) {
    console.error("Database error in getUserByPhone:", error);
    throw error;
  }
};

module.exports = { 
  createUser, 
  getUserByEmail, 
  getUserById, 
  updatePassword, 
  updatePhoneNumber, 
  getUserByPhone 
};