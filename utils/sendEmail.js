import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text, html = null) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,        // e.g., smtp.gmail.com
      port: process.env.EMAIL_PORT,        // 465 for SSL, 587 for TLS
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for others
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: `"Health Sytem" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      ...(html && { html }), // optional HTML content
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Send Email Error:", error);
    throw new Error("Email could not be sent");
  }
};
