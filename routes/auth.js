// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// We will pass pool from index.js
export default function authRoutes(pool) {

  // POST /register
  router.post("/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }

      // Check if user already exists
      const existing = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: "Username already taken." });
      }

      // Hash the password before saving (never store plain text passwords!)
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
        [username, hashedPassword]
      );

      res.status(201).json({
        message: "User registered successfully!",
        user: result.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Registration failed." });
    }
  });

  // POST /login
  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }

      // Find user
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (result.rowCount === 0) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const user = result.rows[0];

      // Compare entered password with hashed password in DB
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      // Generate JWT token (valid for 1 day)
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "Login successful!",
        token, // Frontend/Postman will save this and send it in future requests
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed." });
    }
  });

  return router;
}