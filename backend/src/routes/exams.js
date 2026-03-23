const express = require("express");
const { body } = require("express-validator");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

const isAdmin = (user) => user.role === "admin";

async function getExam(id) {
  const { rows } = await pool.query("SELECT * FROM exams WHERE id = $1", [id]);
  return rows[0] || null;
}

async function isTeacherOfClass(classId, userId) {
  const { rows } = await pool.query("SELECT teacher_id FROM classes WHERE id = $1", [classId]);
  return rows[0]?.teacher_id === userId;
}

// GET /api/exams?class_id=
router.get("/", async (req, res, next) => {
  try {
    const { class_id } = req.query;
    const { rows } = class_id
      ? await pool.query("SELECT * FROM exams WHERE class_id = $1 ORDER BY created_at ASC", [class_id])
      : await pool.query("SELECT * FROM exams ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/exams/:id
router.get("/:id", async (req, res, next) => {
  try {
    const exam = await getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  } catch (err) {
    next(err);
  }
});

// POST /api/exams
router.post(
  "/",
  [body("name").trim().notEmpty(), body("class_id").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { name, class_id, is_default = false } = req.body;
      if (!await isTeacherOfClass(class_id, req.user.id) && !isAdmin(req.user)) {
        return res.status(403).json({ message: "Only the class teacher can create exams" });
      }
      const { rows } = await pool.query(
        "INSERT INTO exams (name, class_id, is_default) VALUES ($1, $2, $3) RETURNING *",
        [name, class_id, is_default]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/exams/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const exam = await getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!await isTeacherOfClass(exam.class_id, req.user.id) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { name, is_default } = req.body;
    const { rows } = await pool.query(
      `UPDATE exams SET name = COALESCE($1, name),
       is_default = COALESCE($2, is_default), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, is_default, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/exams/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const exam = await getExam(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!await isTeacherOfClass(exam.class_id, req.user.id) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await pool.query("DELETE FROM exams WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;