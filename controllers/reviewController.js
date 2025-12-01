import Review from "../models/Review.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";

export const getAllReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required",
      });
    }

    // Fetch reviews for the doctor and populate patient info
    const reviews = await Review.find({ doctorId, verified: true })
      .sort({ date: -1 }) // latest first
      .populate({
        path: "patientId",
        select: "name email", // only get name object
      });

    // Format response to include full patient name
    const formattedReviews = reviews.map((rev) => ({
      id: rev._id,
      doctorId: rev.doctorId,
      patientId: rev.patientId._id,
      rating: rev.rating,
      comment: rev.comment,
      date: rev.date,
      patientName: `${rev.patientId.name.firstName} ${rev.patientId.name.lastName}`,
    }));

    return res.status(200).json({
      success: true,
      count: formattedReviews.length,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching reviews",
    });
  }
};

export const createReview = async (req, res) => {
  try {
    const { doctorId } = req.params;
    // const { patientId, rating, comment } = req.body;
    const { rating, comment } = req.body;
    const patientId = req.user._id?.toString();
    // console.log(patientId.toString())

    // Validate fields
    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required.",
      });
    }
    // Validate comment length
    if (comment.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Comment must be at least 5 characters long.",
      });
    }
    if (comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters.",
      });
    }
    // Check doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }
    // Check patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }
    // Check if patient already reviewed (schema also enforces this)
    const existing = await Review.findOne({ doctorId, patientId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this doctor.",
      });
    }
    console.log("patientId -    ", doctorId);
    console.log("patientId -    ", patientId);
    console.log("patientId -    ", rating);
    console.log("patientId -    ", comment);

    // Create new review
    const review = await Review.create({
      doctorId,
      patientId,
      rating,
      comment,
    });

    // Recalculate doctor's average rating + total reviews
    const stats = await Review.aggregate([
      { $match: { doctorId: doctor._id } },
      {
        $group: {
          _id: "$doctorId",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    if (stats.length > 0) {
      doctor.averageRating = stats[0].averageRating;
      doctor.totalReviews = stats[0].totalReviews;
    } else {
      doctor.averageRating = 0;
      doctor.totalReviews = 0;
    }

    await doctor.save();

    // Populate patient name for frontend card
    const populatedReview = await Review.findById(review._id).populate(
      "patientId",
      "name"
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review: {
        id: populatedReview._id,
        doctorId: populatedReview.doctorId,
        patientId: populatedReview.patientId._id,
        rating: populatedReview.rating,
        comment: populatedReview.comment,
        date: populatedReview.createdAt,
        patientName: `${populatedReview.patientId.name.firstName} ${populatedReview.patientId.name.lastName}`,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);

    // Handling duplicate review error (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this doctor.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while submitting review.",
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id; // Authenticated user

    // 1. Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // 2. Check if logged-in user is the original reviewer
    if (review.patientId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this review",
      });
    }

    // 3. Delete review
    await Review.findByIdAndDelete(reviewId);

    // 4. Recalculate doctor statistics
    const stats = await Review.aggregate([
      { $match: { doctorId: review.doctorId } },
      {
        $group: {
          _id: "$doctorId",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const doctor = await Doctor.findById(review.doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found while updating stats",
      });
    }

    if (stats.length > 0) {
      doctor.totalReviews = stats[0].totalReviews;
      doctor.averageRating = stats[0].averageRating;
    } else {
      doctor.totalReviews = 0;
      doctor.averageRating = 0;
    }

    await doctor.save();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting review",
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id.toString();

    // 1. Validate input
    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required.",
      });
    }

    if (comment.length < 5 || comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment must be between 5–1000 characters.",
      });
    }

    // 2. Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    // 3. Check ownership
    if (review.patientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this review.",
      });
    }

    // 4. Update review
    review.rating = rating;
    review.comment = comment;
    await review.save();

    // 5. Recalculate doctor's stats
    const stats = await Review.aggregate([
      { $match: { doctorId: review.doctorId } },
      {
        $group: {
          _id: "$doctorId",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const doctor = await Doctor.findById(review.doctorId);
    if (stats.length > 0) {
      doctor.totalReviews = stats[0].totalReviews;
      doctor.averageRating = stats[0].averageRating;
    } else {
      doctor.totalReviews = 0;
      doctor.averageRating = 0;
    }

    await doctor.save();

    // 6. Send updated review with populated name
    const updated = await Review.findById(reviewId).populate(
      "patientId",
      "name"
    );

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review: {
        id: updated._id,
        doctorId: updated.doctorId,
        patientId: updated.patientId._id,
        rating: updated.rating,
        comment: updated.comment,
        date: updated.updatedAt,
        patientName: `${updated.patientId.name.firstName} ${updated.patientId.name.lastName}`,
      },
    });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating review.",
    });
  }
};
