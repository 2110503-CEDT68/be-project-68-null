const User = require("../models/User.js");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, tel, email, password, role } = req.body;

    const user = await User.create({
      name,
      tel,
      email,
      password,
      role,
    });

    // เปลี่ยนเป็น 201 Created
    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error(err.stack);
    res.status(400).json({
      success: false,
      msg: err.message, // หรือจะเปลี่ยนเป็น "Cannot register user" เพื่อไม่ให้เผยข้อมูล DB มากไปก็ได้ครับ
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Please provide an email and password",
      });
    }

    // check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // เปลี่ยนเป็น 401 Unauthorized
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Cannot login at the moment" });
  }
};

// Helper Function
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  // แปลง process.env เป็น Base-10 Integer ป้องกันบั๊ก Type String
  const expireDays = parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30;

  const options = {
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  // ส่ง token ใน cookie และ response body
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // กันเหนียว กรณี token ผ่าน แต่มองไม่เห็น user ใน DB แล้ว (เช่น โดนลบไอดี)
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Cannot get user profile" });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // เซ็ตคุกกี้ token ให้กลายเป็น 'none' และให้หมดอายุใน 10 วินาที
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, msg: "Cannot logout at the moment" });
  }
};
