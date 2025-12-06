const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const DB = require("./db");
const passport = require("./passport");

const app = express();

// -----------------------------
// MongoDB Connection
// -----------------------------
mongoose.connect(DB.URI);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// -----------------------------
// Basic app setup
// -----------------------------
app.set("trust proxy", 1);

// CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "studynotes-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,   // set true if HTTPS + proxy in production
      sameSite: "lax"
    }
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// -----------------------------
// Static files
// -----------------------------
app.use(express.static(path.join(__dirname, "..")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// -----------------------------
// API Routes
// -----------------------------
const authRoutes = require("../routes/auth");
const notesRoutes = require("../routes/notes");

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

// -----------------------------
// Fallback to index.html (Express 5 safe)
// -----------------------------
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

module.exports = app;
