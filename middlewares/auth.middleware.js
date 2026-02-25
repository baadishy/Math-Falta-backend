const { JWT_SECRET } = require("../config/env");
const Users = require("../models/users.model");
const Admins = require("../models/admins.model");
const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    let user = await Users.findById(decoded.id).select("-password");

    if (!user) {
      user = await Admins.findById(decoded.id).select("-password");
      if (!user) return res.status(401).json({ success: false, msg: "Unauthorized" });
    } else if (user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        msg:
          user.approvalStatus === "pending"
            ? "Your account is pending admin approval."
            : "Your account is not approved.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ success: false, msg: "Unauthorized" });
  }
};

module.exports = authMiddleware;
