const express = require("express");
const { body } = require("express-validator");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
router.use(requireAuth);

const isAdmin = (user) => user.role === "admin";

async function canEditExam(examId, userId) {
  const { rows } = await pool.query(
    `SELECT c.teacher_id FROM exams e
     JOIN classes c ON c.id = e.class_id
     WHERE e.id = $1`,
    [examId]
  );
  return rows[0]?.teacher_id === userId;
}

// GET /api/words?exam_id=
router.get("/", async (req, res, next) => {
  try {
    const { exam_id } = req.query;
    const { rows } = exam_id
      ? await pool.query("SELECT * FROM words WHERE exam_id = $1 ORDER BY created_at ASC", [exam_id])
      : await pool.query("SELECT * FROM words ORDER BY created_at ASC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/words/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM words WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Word not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/words
router.post(
  "/",
  [body("exam_id").notEmpty(), body("word").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { exam_id, word, meaning, translation } = req.body;
      if (!await canEditExam(exam_id, req.user.id) && !isAdmin(req.user)) {
        return res.status(403).json({ message: "Only the class teacher can add words" });
      }
      const { rows } = await pool.query(
        "INSERT INTO words (exam_id, word, meaning, translation) VALUES ($1, $2, $3, $4) RETURNING *",
        [exam_id, word, meaning || null, translation || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/words/bulk — bulk insert
router.post("/bulk", async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length) {
      return res.status(422).json({ message: "records must be a non-empty array" });
    }

    // Verify teacher permission using the first record's exam_id
    const exam_id = records[0].exam_id;
    if (!await canEditExam(exam_id, req.user.id) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Build a multi-row INSERT
    const placeholders = records.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ");
    const values = records.flatMap((r) => [r.exam_id, r.word, r.meaning || null, r.translation || null]);
    const { rows } = await pool.query(
      `INSERT INTO words (exam_id, word, meaning, translation) VALUES ${placeholders} RETURNING *`,
      values
    );
    res.status(201).json(rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/words/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { rows: existing } = await pool.query("SELECT * FROM words WHERE id = $1", [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: "Word not found" });
    const w = existing[0];
    if (!await canEditExam(w.exam_id, req.user.id) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { word, meaning, translation } = req.body;
    const { rows } = await pool.query(
      `UPDATE words SET word = COALESCE($1, word),
       meaning = COALESCE($2, meaning),
       translation = COALESCE($3, translation),
       updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [word, meaning, translation, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/words/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM words WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Word not found" });
    if (!await canEditExam(rows[0].exam_id, req.user.id) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await pool.query("DELETE FROM words WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;