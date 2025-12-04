import express from "express";
import { protectAdmin } from "../middlewares/authMiddleware.js";
import {
  addUserByAdmin,
  getAdminDashboardStats,
  getAllUsers,
  getSingleUser,
  toggleBlockUser,
  updateUserByAdmin,
} from "../controllers/adminController.js";
import { upload } from "../middlewares/multerConfig.js";
import { getAllDoctors, toggleBlockDoctor, updateDoctorByAdmin, getSingleDoctor, addDoctorByAdmin, TEMPaddDoctorByAdmin } from "../controllers/adminDoctorController.js";

const adminRouter = express.Router();

// For Dashboard Stats
adminRouter.get("/stats", protectAdmin, getAdminDashboardStats);

// For Simple Users (Patients)
adminRouter.get("/users", protectAdmin, getAllUsers);
adminRouter.post(
  "/users/add",
  protectAdmin,
  (req, res, next) => {
    req.uploadPath = "users";
    next();
  },
  upload.single("profileImage"),
  addUserByAdmin
);
adminRouter.get("/users/:id", protectAdmin, getSingleUser);
adminRouter.patch("/users/block/:id", protectAdmin, toggleBlockUser);
// adminRouter.delete("/users/delete/:id", protectAdmin, deleteUser);
adminRouter.put(
  "/users/edit/:id",
  protectAdmin,
  (req, res, next) => {
    req.uploadPath = "users";
    next();
  },
  upload.single("profileImage"),
  updateUserByAdmin
);


// For Doctors
adminRouter.get("/doctors", protectAdmin, getAllDoctors);
adminRouter.get("/doctors/:id", protectAdmin, getSingleDoctor);

adminRouter.patch("/doctors/block/:id", protectAdmin, toggleBlockDoctor);
// adminRouter.delete("/doctors/delete/:id", protectAdmin, deleteDoctor);
adminRouter.put(
  "/doctors/edit/:id",
  protectAdmin,
  (req, res, next) => {
    req.uploadPath = "doctors";
    next();
  },
  upload.single("profileImage"),
  updateDoctorByAdmin
);


adminRouter.post(
  "/doctors/add",
  // protectAdmin,
  // (req, res, next) => {
  //   req.uploadPath = "doctors";
  //   next();
  // },
  // upload.single("profileImage"),
  TEMPaddDoctorByAdmin
);

export default adminRouter;
