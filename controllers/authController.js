import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validateUserSignup } from "../utils/validateUser.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";

export const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      nicNumber,
      // gender,
    } = req.body;

    // ------- Validation -------
    const errors = validateUserSignup({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      nicNumber,
      // gender,
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // ------- Check duplicates -------
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const phoneExists = await User.findOne({ phoneNumber });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }

    const nicExists = await User.findOne({ nicNumber });
    if (nicExists) {
      return res.status(400).json({
        success: false,
        message: "NIC already in use",
      });
    }

    // ------- Hash Password -------
    const hashedPassword = await bcrypt.hash(password, 10);

    // ------- Generate Email OTP -------
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 15 * 60 * 1000; // 15 min

    // ------- Create User -------
    const user = await User.create({
      name: { firstName, lastName },
      email,
      password: hashedPassword,
      phoneNumber,
      nicNumber,
      // gender,
      authProvider: "manual",
      isAccountVerified: false,
      verifyOtp: otp,
      verifyOtpExpireAt: otpExpire,
    });

    // ------- Generate JWT -------
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ------- Set Cookie -------
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      user,
      otp, // (remove in production)
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const login = async (req, res) => {
  try {
    const { nicNumber, password, role } = req.body;

    // Manual login requires NIC + password
    if (!nicNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "NIC and password are required",
      });
    }

    // NIC format validation
    if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(nicNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NIC number",
      });
    }

    // Find user
    const user = await User.findOne({ nicNumber, role }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Blocked user check
    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User is blocked. Please contact support.",
      });
    }

    // Google user cannot login manually
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account is registered with Google. Please login with Google instead.",
      });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set cookie
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });
    res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",            // Important
  maxAge: 7 * 24 * 60 * 60 * 1000,
});


    // Response
    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// controllers/authController.js
export const logout = async (req, res) => {
  try {
    // Clear the cookie (if using httpOnly cookie for JWT)
    // res.cookie("token", "", {
    //   httpOnly: true,
    //   expires: new Date(0), // expire immediately
    //   sameSite: "strict",
    //   secure: process.env.NODE_ENV === "production",
    // });
res.cookie("token", "", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",            // VERY IMPORTANT
  expires: new Date(0),
});

    // Respond success
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while logging out",
    });
  }
};


export const getCurrentUser = async (req, res) => {
  try {
    // req.user comes from middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not logged in.",
      });
    }

    return res.status(200).json({
      success: true,
      user: req.user,
      role: req.user.role
    });
  } catch (error) {
    console.log("Get Current User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};



export const forgotPassword = async (req, res) => {
  try {
    const { contactType, contactValue, role } = req.body;

    if (!contactType || !contactValue) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
console.log("first")
    let user;

    if (contactType === "email") {
      user = await User.findOne({ email: contactValue, role });
    }
    // else if (contactType === "phone") {
    //   user = await User.findOne({ phoneNumber: contactValue, role });
    // }

    if (!user) {
      return res.status(404).json({ success: false, message: `User not found with provided ${contactType}.` });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save hashed OTP and expiration (10 minutes)
    user.resetOtp = hashedOtp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via email
    if (contactType === "email") {
      const subject = "Your OTP for Password Reset";
      const text = `Your OTP to reset password is: ${otp}. It is valid for 10 minutes.`;
      await sendEmail(user.email, subject, text);
    }
    // else if (contactType === "phone") {
    //   // TODO: Send OTP via SMS
    // }

    res.status(200).json({ success: true, message: `OTP sent to your ${contactType}.` });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const { contactType, contactValue, otp, role } = req.body;

    if (!contactType || !contactValue || !otp) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    let user;
    if (contactType === "email") {
      user = await User.findOne({ email: contactValue, role });
    }
    // else if (contactType === "phone") {
    //   user = await User.findOne({ phoneNumber: contactValue, role });
    // }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.resetOtp || !user.resetOtpExpireAt) {
      return res.status(400).json({ success: false, message: "No OTP request found. Please request OTP again." });
    }

    if (Date.now() > user.resetOtpExpireAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // OTP is valid -> clear OTP fields
    user.resetOtp = null;
    user.resetOtpExpireAt = null;
    await user.save();

    res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};


export const updatePassword = async (req, res) => {
  try {
    const { contactType, contactValue, password, role } = req.body;

    if (!contactType || !contactValue || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    let user;
    if (contactType === "email") {
      user = await User.findOne({ email: contactValue, role });
    }
    // else if (contactType === "phone") {
    //   user = await User.findOne({ phoneNumber: contactValue, role });
    // }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Clear any residual OTP fields just in case
    user.resetOtp = null;
    user.resetOtpExpireAt = null;

    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};
