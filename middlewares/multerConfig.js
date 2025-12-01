import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// --- Cloudinary setup ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "DoctorProject", // optional folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// --- File filter ---
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

// --- Export multer instance ---
export const upload = multer({ storage: cloudStorage, fileFilter });
