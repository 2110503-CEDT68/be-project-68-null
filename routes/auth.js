const express = require("express");
const { protect } = require("../middleware/auth.js");
const { register, login, getMe, logout } = require("../controllers/auth.js");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", protect, logout);

module.exports = router;
