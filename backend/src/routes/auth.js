const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const pool = require("../db/pool");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("full_name").optional().trim().notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, full_name } = req.body;
      const hash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password, full_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, full_name, role, created_at`,
        [email, hash, full_name || null]
      );
      const user = rows[0];
      res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Email already in use" });
      }
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { rows } = await pool.query(
        "SELECT id, email, full_name, role, password FROM users WHERE email = $1",
        [email]
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const { password: _, ...safeUser } = user;
      res.json({ token: signToken(user.id), user: safeUser });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// PATCH /api/auth/me
router.patch(
  "/me",
  requireAuth,
  [body("full_name").optional().trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { full_name } = req.body;
      const { rows } = await pool.query(
        `UPDATE users SET full_name = COALESCE($1, full_name), updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, full_name, role`,
        [full_name, req.user.id]
      );
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;