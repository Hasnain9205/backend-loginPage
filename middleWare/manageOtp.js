const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  secure: true,
  service: "gmail",
  auth: {
    user: "rajon013039799@gmail.com",
    pass: "awamianfeqjbaspt",
  },
});

const sendOtp = async ({ email, otp }) => {
  const mailOptions = {
    from: "rajon013039799@gmail.com",
    to: email,
    subject: "Your OTP code",
    text: `Welcome to our e-commerce webSite.Visit our webSite and enjoy. Your verification OTP code is:  ${otp}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP send successfully");
  } catch (error) {
    console.log("OTP error", error);
  }
};
module.exports = sendOtp;
