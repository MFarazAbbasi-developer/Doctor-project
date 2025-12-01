import multer from "multer";
import path from "path";
import fs from "fs";

// Dynamic storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // You will send something like req.uploadPath = "users" or "doctors"
    const folder = req.uploadPath || "users"; // fallback to users

    const uploadDir = path.join(process.cwd(), "uploads", folder);

    // Create folder if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Only image files allowed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

export const upload = multer({ storage, fileFilter });
