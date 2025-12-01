import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import bcrypt from "bcryptjs";
import multer from "multer";
// Store file in memory or disk
const storage = multer.memoryStorage(); // or diskStorage if you want to save
const upload = multer({ storage });
import fs from "fs";
import path from "path";
import { validateUserSignup } from "../utils/validateUser.js";




export const getAdminDashboardStats = async (req, res) => {
  try {
    // 🛡️ Ensure only admins can access (modify according to your auth system)
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ success: false, message: "Access denied." });
    // }

    // 📌 Parallel Queries for Maximum Performance
    const [totalUsers, totalDoctors] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments(),
      // Appointment.countDocuments(),
    ]);

    // 🔥 Monthly visits (Coming soon from analytics model)
    const totalVisits = "-"; // Placeholder until analytics API is ready
    const totalAppointments = "-"; // Placeholder until analytics API is ready

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalDoctors,
        totalAppointments,
        totalVisits,
      },
    });
  } catch (err) {
    console.error("Admin Dashboard Stats Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong fetching dashboard stats.",
    });
  }
};

// GET /admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20, sort = "newest" } = req.query;

    const query = {
      role: "user",
      $or: [
        { "name.firstName": { $regex: search, $options: "i" } },
        { "name.lastName": { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { nicNumber: { $regex: search, $options: "i" } },
      ],
    };

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      az: { "name.firstName": 1 },
      za: { "name.firstName": -1 },
    };

    const users = await User.find(query)
      .select("-password")
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching users." });
  }
};

// GET /admin/users/:id
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user by ID, exclude password
    const user = await User.findById(id).select("-password");

    if (!user || user.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Error fetching single user:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user.",
    });
  }
};

// DELETE /admin/users/:id
// export const deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await User.findByIdAndDelete(id);

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     res.json({ success: true, message: "User deleted successfully." });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "Error deleting user.",
//     });
//   }
// };

// PATCH /admin/users/block/:id
export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: user.isBlocked ? "User blocked." : "User unblocked.",
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while updating status.",
    });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    console.log("first");
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      nicNumber,
      gender,
      role,
      isBlocked,
      isAccountVerified,
      password,
    } = req.body;
    // 1. Find user
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    // 2. Unique checks only if values are being updated
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use.",
        });
      }
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use.",
        });
      }
    }

    if (nicNumber && nicNumber !== user.nicNumber) {
      const nicExists = await User.findOne({ nicNumber });
      if (nicExists) {
        return res.status(400).json({
          success: false,
          message: "NIC number already in use.",
        });
      }
    }
    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // 3. Update allowed fields
    if (firstName) user.name.firstName = firstName;
    if (lastName) user.name.lastName = lastName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (nicNumber) user.nicNumber = nicNumber;
    if (gender) user.gender = gender;
    if (role) user.role = role;
    if (typeof isBlocked === "string") user.isBlocked = isBlocked === "true";
    if (typeof isAccountVerified === "string")
      user.isAccountVerified = isAccountVerified === "true";

    // // 4. Handle profile image if uploaded
    // if (req.file) {
    //   // Optional: delete old image from server if exists
    //   if (user.profileImage) {
    //     const oldPath = path.join(
    //       process.cwd(),
    //       "uploads",
    //       "users",
    //       path.basename(user.profileImage)
    //     );
    //     if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    //   }
    //   user.profileImage = `/uploads/users/${req.file.filename}`;
    // }
    if (req.file) {
  // 1. Delete previous image from Cloudinary if exists
  if (user.profileImagePublicId) {
    try {
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }
  }

  // 2. Save new image
  user.profileImage = req.file.path; // Cloudinary URL
  user.profileImagePublicId = req.file.filename; // This is the public_id generated by multer-storage-cloudinary
}


    // 5. If password provided → hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    // 6. Save updated user
    await user.save();
    console.log("going...............");

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user,
    });
  } catch (err) {
    console.error("Admin Update User Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// Add new user by admin
export const addUserByAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      nicNumber,
      gender = "male",
      role = "user",
      isBlocked = false,
      isAccountVerified = false,
      password,
    } = req.body;

    // 1. Required field check
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !nicNumber ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }
    // ------- Validation -------
    const errors = validateUserSignup({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      nicNumber,
      gender,
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }
    // 2. Unique checks
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use.",
      });
    }

    const phoneExists = await User.findOne({ phoneNumber });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use.",
      });
    }

    const nicExists = await User.findOne({ nicNumber });
    if (nicExists) {
      return res.status(400).json({
        success: false,
        message: "NIC number already in use.",
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create user object
    const newUser = new User({
      name: { firstName, lastName },
      email,
      phoneNumber,
      nicNumber,
      gender,
      role,
      isBlocked: isBlocked === "true" || isBlocked === true,
      isAccountVerified:
        isAccountVerified === "true" || isAccountVerified === true,
      password: hashedPassword,
    });

    // 5. Handle profile image if uploaded
    // if (req.file) {
    //   newUser.profileImage = `/uploads/users/${req.file.filename}`;
    // }
    if (req.file) {
      newUser.profileImage = req.file.path; // Cloudinary URL
      newUser.profileImagePublicId = req.file.filename; // Cloudinary public_id
    }

    // 6. Save user
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: newUser,
    });
  } catch (err) {
    console.error("Admin Add User Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};
