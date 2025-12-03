export const validateUserSignup = (data) => {
  const errors = [];

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push("First name is required");
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push("Last name is required");
  }

  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.password || data.password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!data.phoneNumber || !/^(\+92|0)?3[0-9]{9}$/.test(data.phoneNumber)) {
    errors.push("Invalid Pakistani phone number");
  }

  if (!data.nicNumber || !/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(data.nicNumber)) {
    errors.push("Invalid NIC number");
  }

  // if (!data.gender || !["male", "female", "other"].includes(data.gender)) {
  //   errors.push("Invalid gender");
  // }

  return errors;
};
