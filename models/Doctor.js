import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    // Personal Info
    name: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      // minlength: 8,
      select: false,
    },

    phoneNumber: {
      type: String,
      required: true,
      match: /^(\+92|0)?3[0-9]{9}$/,
    },
    nicNumber: {
      type: String,
      // required: true,
      unique: true,
      sparse: true, // <- allows multiple documents with null/undefined
      // match: /^[0-9]{5}-[0-9]{7}-[0-9]$/,
      
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      // required: true,
    },

    profileImage: { type: String, default: null },
    profileImagePublicId: { type: String },

    isBlocked: { type: Boolean, default: false },

    // Professional Info
    description: { type: String, default: "" },
    bio: { type: String, maxlength: 160, default: "" }, // ~1-2 sentences
    specialization: { type: String, required: true, trim: true },
    // experienceYears: { type: Number, required: true },
    languages: { type: [String], default: [] },
    educationBackground: [
      { degree: String, institution: String, year: Number },
    ],
    certifications: [{ title: String, organization: String, year: Number }],
    // services: { type: [String], required: true, default: [] },
    tags: { type: [String], default: [] },

    // Clinic Info
    clinicAddress: {
      street: { type: String, default: "" },
      city: { type: String, 
        // required: true
       },
      zipCode: { type: String, 
        // required: true 
      },
      province: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
      mapLink: { type: String, default: "" } 
    },

    workHistory: [
      {
        hospital: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hospital",
          required: true,
        },
        position: { type: String, required: true },
        startYear: { type: Number, required: true },
        endYear: { type: Number }, // null = still working
      },
    ],

    consultationFee: {
      amount: { type: Number,
        //  required: true
         },
      currency: { type: String, default: "PKR" },
    },

    // Availability
    availability: {
      days: [{ type: String }],
      timeSlots: [{ start: String, end: String }],
    },

    // Review Stats
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    role: { type: String, enum: ["doctor"], default: "doctor" },

    // Security & Account Management
    isAccountVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpireAt: { type: Date, default: null },
    resetOtp: { type: String, default: "" },
    resetOtpExpireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for better search performance
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ "clinicAddress.city": 1 });
doctorSchema.index({ tags: 1 });
doctorSchema.index({ averageRating: -1 });

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
