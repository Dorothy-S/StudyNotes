const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// -------------------------
// LOCAL LOGIN STRATEGY
// -------------------------
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });

      if (!user) return done(null, false, { message: "User not found" });

      const match = await user.comparePassword(password);
      if (!match) return done(null, false, { message: "Incorrect password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// -------------------------
// GOOGLE OAUTH STRATEGY
// -------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. If user already exists — return it
        let user = await User.findOne({ googleId: profile.id });

        if (user) return done(null, user);

        // 2. If no email returned, generate placeholder
        const email =
          profile.emails?.[0]?.value ||
          `google_${profile.id}@noemail.com`;

        // 3. Ensure username is UNIQUE
        let baseUsername = profile.displayName.replace(/\s+/g, "");
        let finalUsername = baseUsername;
        let counter = 1;

        while (await User.findOne({ username: finalUsername })) {
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }

        // 4. Create new user
        user = new User({
          username: finalUsername,
          email,
          googleId: profile.id,
          profilePic: profile.photos?.[0]?.value || ""
        });

        await user.save();
        return done(null, user);

      } catch (err) {
        return done(err);
      }
    }
  )
);

// -------------------------
// SESSION HANDLING
// -------------------------
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
