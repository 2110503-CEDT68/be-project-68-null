const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization && // Check if the authorization header exists
    req.headers.authorization.startsWith("Bearer") // Check if it starts with "Bearer"
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    return res
      .status(401)
      .json({ success: false, msg: "Not authorized to access this route" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log(decoded);

    req.user = await User.findById(decoded.id); // Attach user to request object

    // check if user still exists
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, msg: "The user belonging to this token no longer exists" });
    }

    next();
  } catch (err) {
    console.log(err);
    return res
      .status(401)
      .json({ success: false, msg: "Not authorized to access this route" });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        msg: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
