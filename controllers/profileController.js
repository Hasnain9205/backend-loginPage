const UpdateSchema = require("../models/UpdateSchema");

exports.createProfile = async (req, res) => {
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
};

exports.getProfile = async (req, res) => {
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
};

exports.updateProfile = async (req, res) => {
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
};
