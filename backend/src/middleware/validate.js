const { validationResult } = require("express-validator");

/**
 * Express middleware that checks validation results from express-validator.
 * Returns 422 with error details if validation fails.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: "Validation error", errors: errors.array() });
  }
  next();
}

module.exports = validate;