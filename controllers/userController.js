import User from "../models/User.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// ------------------ UPDATE PROFILE ------------------
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, email, phoneNumber, nicNumber, gender } = req.body;

    // 1. Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // 2. Unique checks
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ success: false, message: "Email already in use." });
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) return res.status(400).json({ success: false, message: "Phone number already in use." });
    }

    if (nicNumber && nicNumber !== user.nicNumber) {
      const nicExists = await User.findOne({ nicNumber });
      if (nicExists) return res.status(400).json({ success: false, message: "NIC number already in use." });
    }

    // 3. Update fields
    if (firstName) user.name.firstName = firstName;
    if (lastName) user.name.lastName = lastName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (nicNumber) user.nicNumber = nicNumber;
    if (gender) user.gender = gender;

    // 4. Handle profile image
    if (req.file) {
      if (user.profileImage) {
        const oldPath = path.join(process.cwd(), "uploads", "users", path.basename(user.profileImage));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profileImage = `/uploads/users/${req.file.filename}`;
    }

    // 5. Save
    await user.save();

    return res.status(200).json({ success: true, message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// ------------------ UPDATE PASSWORD ------------------
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both current and new passwords are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    // 1. Find user with password
    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // 2. Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect." });

    // 3. Hash and update
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Update Password Error:", err);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};
