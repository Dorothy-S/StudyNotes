const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

// Serialize / deserialize
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

// Helper to handle OAuth login/signup
async function handleOAuthLogin(profile, providerKey, done) {
  try {
    const query = {};
    query[providerKey] = profile.id;

    let user = await User.findOne(query);

    const email =
      (profile.emails && profile.emails[0] && profile.emails[0].value) ||
      null;
    const username =
      profile.username ||
      profile.displayName ||
      (email ? email.split("@")[0] : `${providerKey}_${profile.id}`);

    if (!user) {
      // Try existing user with same email
      if (email) {
        user = await User.findOne({ email });
      }

      if (!user) {
        user = new User({
          username,
          email: email || `${providerKey}_${profile.id}@example.com`,
          password: Math.random().toString(36).slice(-12),
          profilePic:
            profile.photos && profile.photos[0] && profile.photos[0].value
              ? profile.photos[0].value
              : ""
        });
      }

      user[providerKey] = profile.id;
      await user.save();
    } else {
      // Make sure avatar gets updated at least once
      if (
        profile.photos &&
        profile.photos[0] &&
        profile.photos[0].value &&
        !user.profilePic
      ) {
        user.profilePic = profile.photos[0].value;
        await user.save();
      }
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}

/* GOOGLE */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) =>
      handleOAuthLogin(profile, "googleId", done)
  )
);

/* GITHUB */
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) =>
      handleOAuthLogin(profile, "githubId", done)
  )
);

module.exports = passport;
