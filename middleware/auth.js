// middleware/auth.js
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // Token should come in header like: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided. Please login first." });
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

  if (!token) {
    return res.status(401).json({ error: "Token missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username } will now be available in all protected routes
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token. Please login again." });
  }
};