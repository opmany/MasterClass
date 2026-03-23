const express = require("express");
const { body, query } = require("express-validator");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

// Helpers
const isAdmin = (user) => user.role === "admin";

async function getClass(id) {
  const { rows } = await pool.query("SELECT * FROM classes WHERE id = $1", [id]);
  return rows[0] || null;
}

// GET /api/classes  — all classes (admin) or only ones user is involved in
router.get("/", async (req, res, next) => {
  try {
    const { teacher_id } = req.query;

    let rows;
    if (teacher_id) {
      // Filter by teacher
      ({ rows } = await pool.query(
        "SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC",
        [teacher_id]
      ));
    } else if (isAdmin(req.user)) {
      ({ rows } = await pool.query("SELECT * FROM classes ORDER BY created_at DESC"));
    } else {
      // Return classes where the user is teacher OR approved member
      ({ rows } = await pool.query(
        `SELECT DISTINCT c.* FROM classes c
         LEFT JOIN memberships m ON m.class_id = c.id AND m.user_id = $1 AND m.status = 'approved'
         WHERE c.teacher_id = $1 OR m.id IS NOT NULL
         ORDER BY c.created_at DESC`,
        [req.user.id]
      ));
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/classes/:id
router.get("/:id", async (req, res, next) => {
  try {
    const cls = await getClass(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes
router.post(
  "/",
  [body("name").trim().notEmpty(), body("description").optional().trim()],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO classes (name, description, teacher_id, teacher_name)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, description || null, req.user.id, req.user.full_name || req.user.email]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/classes/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const cls = await getClass(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (cls.teacher_id !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { name, description } = req.body;
    const { rows } = await pool.query(
      `UPDATE classes
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/classes/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const cls = await getClass(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (cls.teacher_id !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await pool.query("DELETE FROM classes WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;