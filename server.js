import express from "express";
import dotenv from "dotenv";
import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import doctorRouter from "./routes/doctorRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import path from "path";
import userRouter from "./routes/userRoutes.js";


dotenv.config();

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cookieParser());
// app.use(cors()); 
app.use(
  cors({
    origin: process.env.CLIENT_URL, // allow only your frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // if you use cookies/auth
  })
);

// Serve uploads folder statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// app.use(helmet());
// app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // max: 100,
  max: 1000,
  message: "Too many requests from this IP, please try again later."
});
app.use("/api/", limiter);

// ===== DATABASE CONNECTION =====
connectDB(); // Connect to MongoDB


app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/reviews", reviewRouter);

app.use("/api/admin", adminRouter);


// ===== TEST ROUTE =====
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "API is working!!!" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
