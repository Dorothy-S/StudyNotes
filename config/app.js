const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const DB = require("./db");
const passport = require("./passport");

// ----------------------------
// CONNECT TO MONGODB
// ----------------------------
mongoose.connect(DB.URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on("error", console.error.bind(console, "MongoDB error:"));
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
});

const app = express();

// ----------------------------
// CORS (Render-safe)
// ----------------------------
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ----------------------------
// BODY PARSERS
// ----------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------
// SESSION (REQUIRED FOR OAUTH)
// ----------------------------
app.set("trust proxy", 1); // Required for Render HTTPS proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || "studynotes-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Render handles HTTPS, MUST stay false unless using custom domain
      httpOnly: true,
      sameSite: "lax", // Allows Google OAuth redirect
    },
  })
);

// ----------------------------
// PASSPORT (OAUTH + LOCAL)
// ----------------------------
app.use(passport.initialize());
app.use(passport.session());

// ----------------------------
// STATIC FRONTEND FILES
// ----------------------------
app.use(express.static(path.join(__dirname, "..")));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ----------------------------
// ROUTES
// ----------------------------
const authRoutes = require("../routes/auth");
const notesRoutes = require("../routes/notes");

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

// ----------------------------
// FALLBACK — SERVE FRONTEND
// ----------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

module.exports = app;
