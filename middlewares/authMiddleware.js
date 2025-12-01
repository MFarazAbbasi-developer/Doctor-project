import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectUser = async (req, res, next) => {
  try {
    const token = req.cookies.token; // reading cookie

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token found.",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user
    const user = await User.findOne({
      _id: decoded.id,
      role: "user",
      isBlocked: false,
    }).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user; // attach user object
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const protectAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.token; // reading cookie

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token found.",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Get user
    const user = await User.findOne({
      _id: decoded.id,
      role: "admin",
    }).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
      console.log("not working....................")

    req.user = user; // attach user object
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
