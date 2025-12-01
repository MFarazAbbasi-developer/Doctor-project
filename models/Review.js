import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },
    date: { type: Date, default: () => Date.now() },
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for fast queries
reviewSchema.index({ doctorId: 1 });
reviewSchema.index({ patientId: 1 });
reviewSchema.index({ doctorId: 1, rating: -1 }); // for top-rated doctors
reviewSchema.index({ doctorId: 1, patientId: 1 }, { unique: true }); // one review per user per doctor

const Review = mongoose.model("Review", reviewSchema);
export default Review;
