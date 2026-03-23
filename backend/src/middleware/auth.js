const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

/**
 * Require a valid JWT.  Attaches req.user = { id, email, role, full_name }.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Token invalid or expired" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, email, full_name, role FROM users WHERE id = $1",
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ message: "User not found" });
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require role = 'admin'.  Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };