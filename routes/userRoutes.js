import express from "express";
import { protectUser } from "../middlewares/authMiddleware.js";
import {
  getSingleUser,
  toggleBlockUser,
} from "../controllers/adminController.js";
import { upload } from "../middlewares/multerConfig.js";
import {
  updatePassword,
  updateProfile,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/get/:id", protectUser, getSingleUser);
// userRouter.patch("/users/block/:id", protectUser, toggleBlockUser);
userRouter.put(
  "/update/:id",
  protectUser,
  (req, res, next) => {
    req.uploadPath = "users";
    next();
  },
  upload.single("profileImage"),
  updateProfile
);
userRouter.put("/update-password/:id", protectUser, updatePassword);

export default userRouter;
