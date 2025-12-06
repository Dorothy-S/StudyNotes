// middleware/auth.js

function requireAuth(req, res, next) {
  // We only trust our own session data
  if (req.session && req.session.user) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
}

module.exports = { requireAuth };
