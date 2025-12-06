const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },

    // Local password (optional if user signs up with OAuth only)
    password: { type: String },

    // Profile picture URL (for uploaded avatar or from OAuth)
    profilePic: { type: String, default: "" },

    // 3rd–party IDs
    googleId: { type: String },
    githubId: { type: String },
  },
  {
    collection: "users"
  }
);

// Hash password if changed
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password") || !this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password for local login
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // OAuth-only account
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
