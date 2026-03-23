const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, "..", "..", process.env.UPLOADS_DIR || "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only Excel (.xlsx, .xls) and CSV files are allowed"));
  },
});

// POST /api/upload — returns { file_url }
router.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const file_url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ file_url });
});

// POST /api/extract — uses OpenAI to parse the file content into words
router.post("/extract", requireAuth, async (req, res, next) => {
  try {
    const { file_url, json_schema } = req.body;
    if (!file_url) return res.status(422).json({ message: "file_url is required" });

    // Fetch the file contents
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return res.status(400).json({ message: "Could not fetch uploaded file" });

    // Read as text (works well for CSV; for xlsx a proper parser would be better)
    const text = await fileRes.text();

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "OPENAI_API_KEY is not configured on the server" });
    }

    const { OpenAI } = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract vocabulary lists from raw file content. Return a JSON object with a 'words' array. Each item has 'word' (English), 'meaning' (English definition), and 'translation' (Hebrew). Only return the JSON, nothing else.",
        },
        {
          role: "user",
          content: `File content:\n\n${text.slice(0, 12000)}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    res.json({ status: "success", output: parsed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;