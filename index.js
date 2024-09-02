const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const User = require("./models/UserSchema.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Auth = require("./middleWare/Auth.js");
const cors = require("cors");
const crypto = require("crypto");
const sendOtp = require("./middleWare/manageOtp.js");
const UpdateSchema = require("./models/UpdateSchema.js");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(morgan("tiny"));
app.use(cors());

const PORT = process.env.PORT || 4000;

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("This user already exist");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const expirationOtp = new Date(Date.now() + 2 * 60 * 1000);
    await sendOtp({ email, otp, expirationOtp });
    const hashedOtp = await bcrypt.hash(otp, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      expirationOtp,
      profileComplete: false,
    });

    await user.save();
    const accessToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        password: user.password,
      },
      process.env.ACCESS_SECRET,
      { expiresIn: "5m" }
    );
    const refreshToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        password: user.password,
      },
      process.env.REFRESH_SECRET,
      { expiresIn: "5d" }
    );
    user.otp = undefined;
    user.password = undefined;
    return res.status(201).send({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("user not found");
    }
    const currentOtp = Date.now();
    if (currentOtp > user.expirationOtp) {
      res.status(400).json({ message: "Expired OTP" });
    }
    const isMatchOtp = await bcrypt.compare(otp, user.otp);
    if (isMatchOtp) {
      user.verified = true;
      await user.save();
      res.status(200).json("Otp verified successfully");
    } else {
      res.status(400).json("Invalid OTP");
    }
  } catch (error) {
    console.log("opt verified error", error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User not found");
    }
    if (user.verified === false) {
      return res.status(400).send("Invalid OTP");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send("Unauthorized: Incorrect password");
    }

    const accessToken = jwt.sign(
      { id: user._id, name: user.name },
      process.env.ACCESS_SECRET,
      { expiresIn: "5m" }
    );
    const refreshToken = jwt.sign(
      { id: user._id, name: user.name },
      process.env.REFRESH_SECRET,
      { expiresIn: "5d" }
    );
    user.password = undefined;
    return res.status(201).send({ user, accessToken, refreshToken });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/createProfile", Auth, async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth } = req.body;
    const userId = req.user.id;
    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).send("All profile fields are required");
    }
    const newProfile = new UpdateSchema({
      userId,
      firstName,
      lastName,
      dateOfBirth,
      profileComplete: true,
    });
    await newProfile.save();
    res.status(201).send("New user created");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/getProfile", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);
    if (!userId) {
      return res.status(400).send("User ID is missing");
    }
    const profile = await UpdateSchema.findOne({ userId });
    if (profile) {
      res.status(200).json(profile);
    } else {
      res.status(400).send("profile not found");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.put("/updateProfile", Auth, async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth } = req.body;
    if (!firstName && !lastName && !dateOfBirth) {
      return res.status(400).send("No profile information provided");
    }
    console.log("req.user:", req.user);

    const userId = req.user.id || req.user._id;
    const user = await UpdateSchema.findOne({ userId });
    if (!user) {
      res.status(400).send("user not found");
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    await user.save();
    console.log(user);
    res.status(200).json({ user, message: "user updated successfully" });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/refresh", Auth, (req, res) => {
  try {
    const { user } = req;
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      process.env.ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    console.log("new token", accessToken);
    return res.status(201).send({ accessToken });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.get("/protected", Auth, (req, res) => {
  try {
    return res.status(201).send("Protected Route");
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ id: user._id }, process.env.ACCESS_SECRET, {
      expiresIn: "1d",
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

    const resetUrl = `http://localhost:5173/reset-password/${user._id}/${token}`;

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
      } else [res.status(200).json({ error: "Email sent:" + info.response })];
    });
  } catch (error) {
    res.status(500).send("Error Password reset");
  }
});

app.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  console.log("token", token);
  const { newPassword } = req.body;

  try {
    jwt.verify(token, process.env.ACCESS_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(400).json({ error: "Invalid or expired token" });
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await User.findByIdAndUpdate(
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
});

app.get("/", (req, res) => {
  res.send("login page website running");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
