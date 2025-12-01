import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ----------------------------
    // Basic Profile Info
    // ----------------------------
    name: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default: null,
    },
    profileImagePublicId: { type: String },


    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isBlocked: { type: Boolean, default: false },

    // ----------------------------
    // Auth Fields (Manual)
    // ----------------------------
    password: {
      type: String,
      minlength: 8,
      select: false,
      required: function () {
        return !this.googleId;
      },
    },

    phoneNumber: {
      type: String,
      sparse: true,
      match: /^(\+92|0)?3[0-9]{9}$/,
      required: function () {
        return !this.googleId;
      },
    },

    nicNumber: {
      type: String,
      sparse: true,
      match: /^[0-9]{5}-[0-9]{7}-[0-9]$/,
      required: function () {
        return !this.googleId;
      },
    },

    // ----------------------------
    // OAuth Fields
    // ----------------------------
    googleId: {
      type: String,
      default: null,
      index: true,
    },

    authProvider: {
      type: String,
      enum: ["manual", "google"],
      default: "manual",
    },

    // ----------------------------
    // Email Verification
    // ----------------------------
    isAccountVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpireAt: { type: Date, default: null },

    // ----------------------------
    // Forgot Password
    // ----------------------------
    resetOtp: { type: String, default: "" },
    resetOtpExpireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
