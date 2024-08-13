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

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(morgan("tiny"));
app.use(cors());

const PORT = process.env.PORT || 5000;

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
    await sendOtp({ email, otp });
    const hashedOtp = await bcrypt.hash(otp, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
    });

    await user.save();
    const accessToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        password: user.password,
      },
      process.env.ACCESS_SECRET,
      { expiresIn: "1m" }
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
    return res.status(201).send({ user, accessToken, refreshToken });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
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

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send("Unauthorized: Incorrect password");
    }

    const accessToken = jwt.sign(
      { id: user._id, name: user.name },
      process.env.ACCESS_SECRET,
      { expiresIn: "1m" }
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

app.get("/refresh", Auth, (req, res) => {
  try {
    const { user } = req;
    const accessToken = jwt.sign(
      { id: user.id, name: user.name },
      process.env.ACCESS_SECRET,
      { expiresIn: "10m" }
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
