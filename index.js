const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(express.json());
app.use(morgan("tiny"));
app.use(
  cors({
    origin: ["https://tubular-pie-61a0ec.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 4000;

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const Auth = require("./middleWare/Auth");

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/password", passwordRoutes);

app.get("/protected", Auth, (req, res) => {
  try {
    return res.status(201).send("Protected Route");
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("backend is running");
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
