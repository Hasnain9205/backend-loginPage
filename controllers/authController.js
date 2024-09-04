const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserSchema = require("../models/UserSchema");
const sendOtp = require("../middleWare/manageOtp");
const UpdateSchema = require("../models/UpdateSchema");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }
    const existingUser = await UserSchema.findOne({ email });
    if (existingUser) {
      return res.status(400).send("This user already exist");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const expirationOtp = new Date(Date.now() + 2 * 60 * 1000);
    await sendOtp({ email, otp, expirationOtp });
    const hashedOtp = await bcrypt.hash(otp, 10);
    const user = new UserSchema({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      expirationOtp,
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
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await UserSchema.findOne({ email });
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
      const userProfile = !!user.profile;
      res.status(200).json({ userProfile });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.log("opt verified error", error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    const user = await UserSchema.findOne({ email });

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

    const userProfile = await UpdateSchema.findOne({ userId: user._id });
    const updateProfile = !userProfile;

    user.password = undefined;
    return res
      .status(201)
      .send({ user, accessToken, refreshToken, updateProfile });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
};

exports.refresh = async (req, res) => {
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
};
