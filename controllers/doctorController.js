import Doctor from "../models/Doctor.js";
import bcrypt from 'bcryptjs'

export const doctorRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      gender,
      specialization,
      clinicAddress,
      consultationFee,
    } = req.body;

    // --- REQUIRED FIELDS CHECK ---
    if (
      !name?.firstName ||
      !name?.lastName ||
      !email ||
      !password ||
      !phoneNumber ||
      !gender ||
      !specialization ||
      !clinicAddress?.city ||
      !consultationFee?.amount
    ) {
      return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    // --- UNIQUE CHECKS ---
    if (await Doctor.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already exists." });

    // // --- NIC & PHONE VALIDATION ---
    if (!/^03[0-9]{9}$/.test(phoneNumber))
      return res.status(400).json({ success: false, message: "Phone number must be 11 digits, starting with 03." });


console.log("Hale pyo anja taen ta: ", req.body)

    // --- HASH PASSWORD ---
    const hashedPassword = await bcrypt.hash(password, 10);

    

    

    // --- CREATE DOCTOR ---
    const doctor = await Doctor.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      gender,
      specialization,
      clinicAddress: {
        street: "",
        city: clinicAddress.city,
        zipCode: "",
        province: "",
        country: "Pakistan",
        mapLink: "",
      },
      consultationFee: {
        amount: consultationFee.amount,
        currency: consultationFee.currency || "PKR",
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

export const doctorLogin = async (req, res) => {
  res.status(200).json({ message: "Doctor Login Controller is working!!!" });
};

export const doctorLogout = async (req, res) => {
  res.status(200).json({ message: "Doctor Logout Controller is working!!!" });
};

export const getAllDoctors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      specialization,
      city,
      search,
      sort = "mostExperienced",
    } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get full filter lists (independent of pagination)
    const allSpecializations = await Doctor.distinct("specialization", {
      isBlocked: false,
    });
    const allCities = await Doctor.distinct("clinicAddress.city", {
      isBlocked: false,
    });

    // Build dynamic filter
    const filter = { isBlocked: false };

    if (specialization) {
      filter.specialization = { $regex: specialization, $options: "i" };
    }

    if (city) {
      filter["clinicAddress.city"] = { $regex: city, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { "name.firstName": { $regex: search, $options: "i" } },
        { "name.lastName": { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
        { "clinicAddress.city": { $regex: search, $options: "i" } },
      ];
    }

    // Sorting logic
    let sortOption = { createdAt: -1 }; // default newest
    switch (sort) {
      case "highestRated":
        sortOption = { averageRating: -1 };
        break;
      case "mostExperienced":
        sortOption = { experienceYears: -1 };
        break;
      case "feeLowHigh":
        sortOption = { "consultationFee.amount": 1 };
        break;
      case "feeHighLow":
        sortOption = { "consultationFee.amount": -1 };
        break;
      case "mostReviewed":
        sortOption = { totalReviews: -1 };
        break;
      case "aToZ":
        sortOption = { "name.firstName": 1 };
        break;
      case "zToA":
        sortOption = { "name.firstName": -1 };
        break;
      // newest is already default
    }

    // Count total doctors after filtering
    const totalDoctors = await Doctor.countDocuments(filter);

    // Fetch doctors with pagination and sorting
    const doctors = await Doctor.find(filter)
      .select("-password -verifyOtp -resetOtp")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);
    console.log("Doctors: ", doctors.length);

    res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      totalDoctors,
      totalPages: Math.ceil(totalDoctors / limitNum),
      count: doctors.length,
      doctors,
      filters: {
        specializations: allSpecializations,
        cities: allCities,
      },
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================== GET DOCTOR BY ID ===================
export const getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.slug;
    const doctor = await Doctor.findOne({
      _id: doctorId,
      isBlocked: false,
    }).select("-password -verifyOtp -resetOtp -__v");
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
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
