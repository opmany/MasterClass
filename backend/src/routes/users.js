const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/users — admin only: list all users
router.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role — admin only: change a user's role
router.patch("/:id/role", requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(422).json({ message: "role must be 'user' or 'admin'" });
    }
    const { rows } = await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role",
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;