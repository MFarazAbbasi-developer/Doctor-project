import express from "express";
import passport from "../config/passport.js";
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
  updatePassword,
  verifyOtp,
} from "../controllers/authController.js";
import { protectAdmin, protectUser } from "../middlewares/authMiddleware.js";
import { addDoctorByAdmin } from "../controllers/adminDoctorController.js";
import { upload } from "../middlewares/multerConfig.js";

const authRouter = express.Router();

// Initialize passport
authRouter.use(passport.initialize());

// -------------------------
// Manual Auth Routes
// -------------------------
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/update-password", updatePassword);

authRouter.get("/me", protectUser, getCurrentUser);
authRouter.get("/admin/me", protectAdmin, getCurrentUser);


// Doctor Registration
authRouter.post(
  "/doctors/add",
  (req, res, next) => {
    req.uploadPath = "doctors";
    next();
  },
  upload.single("profileImage"),
  addDoctorByAdmin
);

// -------------------------
// Google OAuth Routes
// -------------------------
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const { token } = req.user;

    if (!process.env.CLIENT_URL) {
      return res.status(500).send("CLIENT_URL not defined in environment");
    }

    // Redirect user to frontend with JWT token
    return res.redirect(`${process.env.CLIENT_URL}/auth/social?token=${token}`);
  }
);

export default authRouter;
