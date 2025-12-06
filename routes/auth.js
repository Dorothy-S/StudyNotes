const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const passport = require("passport");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* ---------------------------
   MULTER FOR PROFILE UPLOAD
---------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  }
});

/* ---------------------------
      HELPER: SESSION USER
---------------------------- */
function sessionPayload(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    profilePic: user.profilePic || ""
  };
}

/* ---------------------------
        REGISTER USER
---------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists)
      return res.status(400).json({ message: "Username or email exists" });

    const user = new User({ username, email, password });
    await user.save();

    res.json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------------------
          LOGIN (LOCAL)
---------------------------- */
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Login successful", user: sessionPayload(req.user) });
});

/* ---------------------------
            LOGOUT
---------------------------- */
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
});

/* ---------------------------
       LOGIN STATUS
---------------------------- */
router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ loggedIn: true, user: sessionPayload(req.user) });
  }
  res.json({ loggedIn: false });
});

/* ---------------------------
      CHANGE PASSWORD
---------------------------- */
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findById(req.user.id);

    if (!user.password)
      return res.status(400).json({
        message: "Password change unavailable for OAuth-only accounts"
      });

    const match = await user.comparePassword(oldPassword);
    if (!match)
      return res.status(400).json({ message: "Old password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------------------
  PROFILE PICTURE UPLOAD
---------------------------- */
router.post(
  "/profile-picture",
  requireAuth,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const user = await User.findById(req.user.id);
      user.profilePic = `/uploads/${req.file.filename}`;
      await user.save();

      res.json({
        message: "Profile updated",
        profilePicUrl: user.profilePic
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/* ---------------------------
       GOOGLE OAUTH
---------------------------- */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {
    res.redirect("/index.html");
  }
);

module.exports = router;
