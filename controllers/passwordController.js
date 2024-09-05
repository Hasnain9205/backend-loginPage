const jwt = require("jsonwebtoken");
const UserSchema = require("../models/UserSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserSchema.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ id: user._id }, process.env.ACCESS_SECRET, {
      expiresIn: "1h",
    });
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASS,
      },
    });

    const resetUrl = `https://tubular-pie-61a0ec.netlify.app/reset-password/${user._id}/${token}`;

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Your requested a password reset.Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).json({ error: "nodemailer error" });
      } else {
        res.status(200).json({ message: "Email sent:" + info.response });
      }
    });
  } catch (error) {
    res.status(500).send("Error Password reset");
  }
};

exports.resetPassword = async (req, res) => {
  const { id, token } = req.params;
  console.log("token", token);
  const { newPassword } = req.body;

  try {
    jwt.verify(token, process.env.ACCESS_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(400).json({ error: "Invalid or expired token" });
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await UserSchema.findByIdAndUpdate(
          { _id: id },
          { password: hashedPassword }
        );
        if (!user) {
          return res.status(400).json({ error: "user not found" });
        } else {
          return res
            .status(200)
            .json({ message: "Password reset successfully" });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: "reset password error" });
  }
};
