import express from "express";
import { doctorLogin, doctorLogout, doctorRegister, getAllDoctors, getDoctorById } from "../controllers/doctorController.js";

const doctorRouter = express.Router();


doctorRouter.post("/register", doctorRegister);
doctorRouter.post("/login", doctorLogin);
doctorRouter.post("/logout", doctorLogout);

// GET all doctors
doctorRouter.get("/get-all", getAllDoctors);

// GET single doctor by ID
doctorRouter.get("/get/:slug", getDoctorById);

export default doctorRouter;
