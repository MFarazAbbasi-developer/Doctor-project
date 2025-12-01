import dotenv from "dotenv";
dotenv.config(); // MUST be first
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "Google OAuth environment variables missing! Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
  );
}

passport.use(
  
  new GoogleStrategy(
    {
      
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // callbackURL: "/api/auth/google/callback",
      callbackURL: "http://localhost:5000/api/auth/google/callback"

    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user with googleId exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If user with same email exists, link googleId
          const existingEmail = await User.findOne({
            email: profile.emails[0].value,
          });

          if (existingEmail) {
            existingEmail.googleId = profile.id;
            existingEmail.authProvider = "google";
            existingEmail.isAccountVerified = true;
            existingEmail.emailVerifiedAt = new Date();
            user = await existingEmail.save();
          } else {
            // Create new Google OAuth user
            user = await User.create({
              googleId: profile.id,
              authProvider: "google",
              email: profile.emails[0].value,
              name: {
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
              },
              profileImage: profile.photos?.[0]?.value || null,
              isAccountVerified: true,
              emailVerifiedAt: new Date(),
            });
          }
        }

        // Create JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        return done(null, { user, token });
      } catch (err) {
        console.log("Google Auth Error:", err);
        done(err, null);
      }
    }
  )
);

export default passport;
