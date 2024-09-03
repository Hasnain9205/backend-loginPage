const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const Auth = require("../middleWare/Auth");

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.get("/refresh", Auth, authController.refresh);

module.exports = router;
