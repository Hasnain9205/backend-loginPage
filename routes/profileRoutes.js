const express = require("express");
const Auth = require("../middleWare/Auth");
const router = express.Router();
const profileController = require("../controllers/profileController");

router.post("/createProfile", Auth, profileController.createProfile);
router.get("/getProfile", Auth, profileController.getProfile);
router.put("/updateProfile", Auth, profileController.updateProfile);

module.exports = router;
