const User = require("../models/User.js");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, tel, email, password, role } = req.body; // get data from request body

    const user = await User.create({    // create user in database
      name,
      tel,
      email,
      password,
      role,
    });

    // 201 Created
    sendTokenResponse(user, 201, res);
  } catch (err) {     // log database error
    console.error(err.stack);
    res.status(400).json({
      success: false,
      msg: err.message, 
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body; // get email and password from request body

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Please provide an email and password",
      });
    }

    // check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {    // if user not found return response with 401 Unauthorized
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {   // if password does not match return response with 401 Unauthorized
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
  const token = user.getSignedJwtToken();     // create JWT token using method in User model

  // แปลง process.env เป็น Base-10 Integer ป้องกันบั๊ก Type String
  const expireDays = parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30;

  const options = {         // set cookie options expire time and httpOnly
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  // on production set cookie only on HTTPS
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

    // check token unexpired but user not found in database
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
    // Clear cookie โดยไม่ส่งค่า และใช้ maxAge: 0 เพื่อให้หมดอายุทันที
    res.clearCookie("token", {
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
