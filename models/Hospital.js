import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    images: [{ type: String }],  // banners, building photos, etc.

    phone: { type: String },
    email: { type: String },

    address: {
      street: { type: String, default: "" },
      city: { type: String, required: true },
      province: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
    },

    departments: [{ type: String }],   // e.g., Cardiology, Orthopedics

    facilities: [{ type: String }],    // e.g., Emergency, ICU, Pharmacy

    // Rating summary
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // Doctors working here
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],

    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Useful indexes
hospitalSchema.index({ name: 1 });
hospitalSchema.index({ "address.city": 1 });
hospitalSchema.index({ departments: 1 });

const Hospital = mongoose.model("Hospital", hospitalSchema);
export default Hospital;

