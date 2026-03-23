require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const classRoutes = require("./routes/classes");
const membershipRoutes = require("./routes/memberships");
const examRoutes = require("./routes/exams");
const wordRoutes = require("./routes/words");
const userRoutes = require("./routes/users");
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// ─── Static file serving for uploads ─────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", process.env.UPLOADS_DIR || "uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/words", wordRoutes);
app.use("/api/users", userRoutes);
app.use("/api", uploadRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 MasterClass API running on port ${PORT}`);
});