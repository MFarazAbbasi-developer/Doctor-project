import Doctor from "../models/Doctor.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";

export const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "newest", search = "" } = req.query;

    const query = {
      $or: [
        { "name.firstName": { $regex: search, $options: "i" } },
        { "name.lastName": { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { nicNumber: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
      ],
    };

    let sortOption = { createdAt: -1 }; // default newest
    if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "name-asc") sortOption = { "name.firstName": 1 };
    else if (sort === "name-desc") sortOption = { "name.firstName": -1 };

    const total = await Doctor.countDocuments(query);

    const doctors = await Doctor.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      doctors,
    });
  } catch (err) {
    console.error("Get All Doctors Error:", err);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

export const toggleBlockDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Toggle isBlocked
    doctor.isBlocked = doctor.isBlocked === true ? false : true;
    
    await doctor.save();

    return res.status(200).json({
      success: true,
      message: `Doctor has been ${
        doctor.isBlocked ? "blocked" : "unblocked"
      } successfully`,
      doctor,
    });
  } catch (err) {
    console.error("Block Doctor Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Optional: Delete profile image from server if exists
    if (doctor.profileImage) {
      const imagePath = path.join(
        process.cwd(),
        "uploads",
        "doctors",
        path.basename(doctor.profileImage)
      );
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await Doctor.findByIdAndDelete(doctorId);

    return res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (err) {
    console.error("Delete Doctor Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

export const updateDoctorByAdmin = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      nicNumber,
      gender,
      isBlocked,
      isAccountVerified,
      password,
      description,
      bio,
      specialization,
      experienceYears,
      languages,
      services,
      tags,
      clinicAddress,
      consultationFee,
      educationBackground,
      certifications,
      availability,
    } = req.body;

    const doctor = await Doctor.findById(doctorId).select("+password");
    if (!doctor)
      return res.status(404).json({ success: false, message: "Doctor not found." });

    // --- Before updating fields ---
const nicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
if (!nicRegex.test(nicNumber)) {
  return res
    .status(400)
    .json({ success: false, message: "NIC must be in the format 12345-1234567-1." });
}

if (phoneNumber) {
  // Pakistani phone: 11 digits starting with 03
  const phoneRegex = /^03[0-9]{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number must be 11 digits, starting with 03." });
  }
}

if (experienceYears) {
  if (isNaN(experienceYears) || experienceYears < 0) {
    return res
      .status(400)
      .json({ success: false, message: "Experience must be a positive number." });
  }
}

// Example for consultation fee
if (consultationFee?.amount) {
  if (isNaN(consultationFee.amount) || consultationFee.amount < 0) {
    return res
      .status(400)
      .json({ success: false, message: "Consultation fee must be a positive number." });
  }
}


    // --- Unique checks ---
    if (email && email !== doctor.email) {
      const emailExists = await Doctor.findOne({ email });
      if (emailExists)
        return res.status(400).json({ success: false, message: "Email already in use." });
    }

    if (phoneNumber && phoneNumber !== doctor.phoneNumber) {
      const phoneExists = await Doctor.findOne({ phoneNumber });
      if (phoneExists)
        return res.status(400).json({ success: false, message: "Phone number already in use." });
    }

    if (nicNumber && nicNumber !== doctor.nicNumber) {
      const nicExists = await Doctor.findOne({ nicNumber });
      if (nicExists)
        return res.status(400).json({ success: false, message: "NIC number already in use." });
    }
    // --- Update basic fields ---
    if (firstName) doctor.name.firstName = firstName;
    if (lastName) doctor.name.lastName = lastName;
    if (email) doctor.email = email;
    if (phoneNumber) doctor.phoneNumber = phoneNumber;
    if (nicNumber) doctor.nicNumber = nicNumber;
    if (gender) doctor.gender = gender;
    if (typeof isBlocked === "string") doctor.isBlocked = isBlocked === "true";
    if (typeof isAccountVerified === "string") doctor.isAccountVerified = isAccountVerified === "true";

    if (description) doctor.description = description;
    if (bio) doctor.bio = bio;
    if (specialization) doctor.specialization = specialization;
    if (experienceYears) doctor.experienceYears = experienceYears;
    if (languages) doctor.languages = Array.isArray(languages) ? languages : [languages];
    if (services) doctor.services = Array.isArray(services) ? services : [services];
    if (tags) doctor.tags = Array.isArray(tags) ? tags : [tags];

    // --- Education & Certifications ---
    if (educationBackground) {
  doctor.educationBackground = Array.isArray(educationBackground)
    ? educationBackground
    : typeof educationBackground === "string"
    ? JSON.parse(educationBackground)
    : educationBackground;
}

if (certifications) {
  doctor.certifications = Array.isArray(certifications)
    ? certifications
    : typeof certifications === "string"
    ? JSON.parse(certifications)
    : certifications;
}

if (availability) {
  doctor.availability = Array.isArray(availability?.days)
    ? { days: availability.days, timeSlots: availability.timeSlots || [] }
    : typeof availability === "string"
    ? JSON.parse(availability)
    : availability;
}


    // --- Clinic & Fee ---
    if (clinicAddress) {
      doctor.clinicAddress = { ...doctor.clinicAddress, ...clinicAddress };
    }
    if (consultationFee) {
      doctor.consultationFee = { ...doctor.consultationFee, ...consultationFee };
    }

    // --- Profile image ---
    // if (req.file) {
    //   if (doctor.profileImage) {
    //     const oldPath = path.join(process.cwd(), "uploads", "doctors", path.basename(doctor.profileImage));
    //     if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    //   }
    //   doctor.profileImage = `/uploads/doctors/${req.file.filename}`;
    // }
    // --- Profile image (Cloudinary) ---
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (doctor.profileImagePublicId) {
        await cloudinary.uploader.destroy(doctor.profileImagePublicId);
      }
      doctor.profileImage = req.file.path; // Cloudinary URL
      doctor.profileImagePublicId = req.file.filename; // Cloudinary public_id
    }

    // --- Password ---
    if (password) {
      const salt = await bcrypt.genSalt(10);
      doctor.password = await bcrypt.hash(password, salt);
    }

    await doctor.save();
    return res.status(200).json({ success: true, message: "Doctor updated successfully.", doctor });
  } catch (err) {
    console.error("Admin Update Doctor Error:", err);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

export const getSingleDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Find doctor by ID
    const doctor = await Doctor.findById(id).lean(); // lean() returns plain JS object

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (err) {
    console.error("Error fetching doctor:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};




export const addDoctorByAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      nicNumber,
      gender,
      description,
      bio,
      specialization,
      experienceYears,
      languages,
      educationBackground,
      certifications,
      services,
      tags,
      street,
      city,
      zipCode,
      province,
      mapLink,
      consultationFee,
      availability,
    } = req.body;

    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    // --- REQUIRED FIELDS CHECK ---
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phoneNumber ||
      !nicNumber ||
      !gender ||
      !specialization ||
      experienceYears === undefined ||
      !services?.length ||
      !city ||
      !zipCode ||
      !mapLink ||
      !consultationFee?.amount
    ) {
      return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    // --- UNIQUE CHECKS ---
    if (await Doctor.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already exists." });
    if (await Doctor.findOne({ nicNumber }))
      return res.status(400).json({ success: false, message: "NIC number already exists." });

    // --- NIC & PHONE VALIDATION ---
    if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(nicNumber))
      return res.status(400).json({ success: false, message: "NIC must be 12345-1234567-1." });
    if (!/^03[0-9]{9}$/.test(phoneNumber))
      return res.status(400).json({ success: false, message: "Phone number must be 11 digits, starting with 03." });

    // --- EXPERIENCE VALIDATION ---
    if (isNaN(experienceYears) || experienceYears < 0)
      return res.status(400).json({ success: false, message: "Experience must be positive." });

    // --- CONSULTATION FEE ---
    let fee = { amount: 0, currency: "PKR" };
    try {
      fee = typeof consultationFee === "string" ? JSON.parse(consultationFee) : consultationFee;
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid consultationFee JSON" });
    }
    if (!fee?.amount || isNaN(fee.amount) || fee.amount < 0)
      return res.status(400).json({ success: false, message: "Consultation fee must be positive." });

    // --- HASH PASSWORD ---
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- PARSE OPTIONAL JSON FIELDS ---
    let eduBackground = [];
    let certs = [];
    let avail = { days: [], timeSlots: [] };

    try {
      eduBackground =
        typeof educationBackground === "string" ? JSON.parse(educationBackground) : educationBackground || [];
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid educationBackground JSON" });
    }

    try {
      certs =
        typeof certifications === "string" ? JSON.parse(certifications) : certifications || [];
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid certifications JSON" });
    }

    try {
      avail =
        typeof availability === "string" ? JSON.parse(availability) : availability || { days: [], timeSlots: [] };
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid availability JSON" });
    }

    // --- CREATE DOCTOR ---
    const doctor = await Doctor.create({
      name: { firstName, lastName },
      email,
      password: hashedPassword,
      phoneNumber,
      nicNumber,
      gender,
      profileImage: req.file?.path || null, // Cloudinary URL
      profileImagePublicId: req.file?.filename || null,
      description: description || "",
      bio: bio || "",
      specialization,
      experienceYears,
      languages: Array.isArray(languages) ? languages : languages ? [languages] : [],
      educationBackground: eduBackground,
      certifications: certs,
      services: Array.isArray(services) ? services : [services],
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      clinicAddress: {
        street: street || "",
        city,
        zipCode,
        province: province || "",
        country: "Pakistan",
        mapLink: mapLink || "",
      },
      consultationFee: {
        amount: fee.amount,
        currency: fee.currency || "PKR",
      },
      availability: {
        days: avail.days || [],
        timeSlots: avail.timeSlots || [],
      },
      isBlocked: false,
      isAccountVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor added successfully.",
      doctor,
    });
  } catch (error) {
    console.error("Add doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding doctor.",
    });
  }
};


export const TEMPaddDoctorByAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      gender,
      specialization,
      experienceYears,
      educationBackground,
      street,
      consultationFee,
      availability,
    } = req.body;

    console.log("req.body:", req.body);


    // --- REQUIRED FIELDS CHECK ---
    if (
      !firstName ||
      !lastName ||
      // !email ||
      // !phoneNumber ||
      !gender ||
      !specialization ||
      // experienceYears === undefined ||
      !consultationFee?.amount
    ) {
      return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    // --- UNIQUE CHECKS ---
    if (await Doctor.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already exists." });

    if (!/^03[0-9]{9}$/.test(phoneNumber))
      return res.status(400).json({ success: false, message: "Phone number must be 11 digits, starting with 03." });

    // --- EXPERIENCE VALIDATION ---
    if (experienceYears && experienceYears < 0)
      return res.status(400).json({ success: false, message: "Experience must be positive." });

    // --- CONSULTATION FEE ---
    let fee = { amount: 0, currency: "PKR" };
    try {
      fee = typeof consultationFee === "string" ? JSON.parse(consultationFee) : consultationFee;
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid consultationFee JSON" });
    }
    if (!fee?.amount || isNaN(fee.amount) || fee.amount < 0)
      return res.status(400).json({ success: false, message: "Consultation fee must be positive." });



    // --- PARSE OPTIONAL JSON FIELDS ---
    let eduBackground = [];
    let avail = { days: [], timeSlots: [] };

    try {
      eduBackground =
        typeof educationBackground === "string" ? JSON.parse(educationBackground) : educationBackground || [];
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid educationBackground JSON" });
    }


    try {
      avail =
        typeof availability === "string" ? JSON.parse(availability) : availability || { days: [], timeSlots: [] };
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid availability JSON" });
    }

    // --- CREATE DOCTOR ---
    const doctor = await Doctor.create({
      name: { firstName, lastName },
      email,
      phoneNumber,
      gender,
      specialization,
      experienceYears,
      educationBackground: eduBackground,
      clinicAddress: {
        street: street || "",
        city:"Nawabshah",
        zipCode: "67450",
        province: "Sindh",
        country: "Pakistan",
        mapLink: "",
      },
      consultationFee: {
        amount: fee.amount,
        currency: fee.currency || "PKR",
      },
      availability: {
        days: avail.days || [],
        timeSlots: avail.timeSlots || [],
      },
      isBlocked: false,
      isAccountVerified: false,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor added successfully.",
      doctor,
    });
  } catch (error) {
    console.error("Add doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding doctor.",
    });
  }
};