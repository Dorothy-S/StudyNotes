// middleware/auth.js

function requireAuth(req, res, next) {
  // If we already stored user in our own session
  if (req.session && req.session.user) {
    return next();
  }

  // If Passport has an authenticated user
  if (req.isAuthenticated && req.isAuthenticated()) {
    const u = req.user;
    if (u) {
      req.session.user = {
        id: u._id,
        username: u.username,
        email: u.email,
        profilePic: u.profilePic || ""
      };
      return next();
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
}

module.exports = { requireAuth };
