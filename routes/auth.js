const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const passport = require("passport");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---------- Multer setup for profile pictures ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const userId = req.session.user?.id || "guest";
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});

// Helper: put user info into session payload
function setSessionUser(req, user) {
  req.session.user = {
    id: user._id,
    username: user.username,
    email: user.email,
    profilePic: user.profilePic || ""
  };
}

// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const user = new User({ username, email, password });
    await user.save();

    return res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LOGIN (LOCAL) ----------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    setSessionUser(req, user);
    return res.json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LOGOUT ----------
router.get("/logout", (req, res) => {
  req.logout?.(() => {});
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// ---------- LOGIN STATUS ----------
router.get("/status", (req, res) => {
  let userPayload = null;

  if (req.session && req.session.user) {
    userPayload = req.session.user;
  } else if (req.user) {
    userPayload = {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      profilePic: req.user.profilePic || ""
    };
  }

  if (userPayload) {
    return res.json({ loggedIn: true, user: userPayload });
  }

  return res.json({ loggedIn: false });
});

// ---------- CHANGE PASSWORD ----------
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new passwords are required" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user || !user.password) {
      return res.status(400).json({
        message:
          "Password change is only available for accounts with a local password"
      });
    }

    const match = await user.comparePassword(oldPassword);
    if (!match) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.password = newPassword; // will be hashed by pre-save
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- PROFILE PICTURE UPLOAD ----------
router.post(
  "/profile-picture",
  requireAuth,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const relativePath = `/uploads/${req.file.filename}`;
      user.profilePic = relativePath;
      await user.save();

      setSessionUser(req, user);

      res.json({
        message: "Profile picture updated successfully",
        profilePicUrl: relativePath
      });
    } catch (err) {
      console.error("Profile picture error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------- THIRD–PARTY AUTH (3 PROVIDERS) ----------

// GOOGLE
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login.html"
  }),
  (req, res) => {
    setSessionUser(req, req.user);
    res.redirect("/index.html");
  }
);

// GITHUB
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login.html"
  }),
  (req, res) => {
    setSessionUser(req, req.user);
    res.redirect("/index.html");
  }
);

module.exports = router;
