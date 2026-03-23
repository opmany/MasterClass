const express = require("express");
const { body } = require("express-validator");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

const isAdmin = (user) => user.role === "admin";

async function getMembership(id) {
  const { rows } = await pool.query("SELECT * FROM memberships WHERE id = $1", [id]);
  return rows[0] || null;
}

// GET /api/memberships?class_id=&user_id=&status=
router.get("/", async (req, res, next) => {
  try {
    const { class_id, user_id, status, role } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;

    if (class_id) { conditions.push(`class_id = $${i++}`); values.push(class_id); }
    if (user_id) { conditions.push(`user_id = $${i++}`); values.push(user_id); }
    if (status) { conditions.push(`status = $${i++}`); values.push(status); }
    if (role) { conditions.push(`role = $${i++}`); values.push(role); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM memberships ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/memberships/:id
router.get("/:id", async (req, res, next) => {
  try {
    const m = await getMembership(req.params.id);
    if (!m) return res.status(404).json({ message: "Membership not found" });
    res.json(m);
  } catch (err) {
    next(err);
  }
});

// POST /api/memberships — join request
router.post(
  "/",
  [
    body("class_id").notEmpty(),
    body("role").optional().isIn(["student", "teacher"]),
    body("status").optional().isIn(["pending", "approved", "rejected"]),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { class_id, role = "student", status = "pending" } = req.body;

      // Check class exists
      const { rows: classRows } = await pool.query("SELECT id FROM classes WHERE id = $1", [class_id]);
      if (!classRows.length) return res.status(404).json({ message: "Class not found" });

      const { rows } = await pool.query(
        `INSERT INTO memberships (class_id, user_id, user_email, user_name, role, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (class_id, user_id) DO UPDATE
           SET status = EXCLUDED.status, updated_at = NOW()
         RETURNING *`,
        [class_id, req.user.id, req.user.email, req.user.full_name || req.user.email, role, status]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/memberships/:id — approve / reject (teacher or admin)
router.patch("/:id", async (req, res, next) => {
  try {
    const m = await getMembership(req.params.id);
    if (!m) return res.status(404).json({ message: "Membership not found" });

    // Only the class teacher or admin can change status
    const { rows: classRows } = await pool.query("SELECT teacher_id FROM classes WHERE id = $1", [m.class_id]);
    const isTeacher = classRows[0]?.teacher_id === req.user.id;
    if (!isTeacher && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { status, role } = req.body;
    const { rows } = await pool.query(
      `UPDATE memberships
       SET status = COALESCE($1, status),
           role = COALESCE($2, role),
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, role, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/memberships/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const m = await getMembership(req.params.id);
    if (!m) return res.status(404).json({ message: "Membership not found" });

    // User can delete their own, teacher/admin can delete any
    const { rows: classRows } = await pool.query("SELECT teacher_id FROM classes WHERE id = $1", [m.class_id]);
    const isTeacher = classRows[0]?.teacher_id === req.user.id;
    const isOwn = m.user_id === req.user.id;
    if (!isOwn && !isTeacher && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await pool.query("DELETE FROM memberships WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;