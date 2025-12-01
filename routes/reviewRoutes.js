import express from "express";
import { protectUser } from "../middlewares/authMiddleware.js";
import { createReview, deleteReview, getAllReviews, updateReview } from "../controllers/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.get("/get-all-reviews/:doctorId", getAllReviews);

reviewRouter.post("/add-review/:doctorId", protectUser, createReview  );
reviewRouter.delete("/delete-review/:reviewId", protectUser, deleteReview );
reviewRouter.put("/edit-review/:reviewId", protectUser, updateReview );


export default reviewRouter;
