const Users = require("../models/users.model");
const Admins = require("../models/admins.model");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcryptjs");
const { JWT_SECRET, JWT_ENDS_IN } = require("../config/env");

const signUp = async (req, res, next) => {
  try {
    let newUser = req.body;

    if (await Users.findOne({ email: newUser.email })) {
      return res
        .status(400)
        .json({ success: false, msg: "username or email already exists" });
    }

    const hashedPassword = await bycrypt.hash(newUser.password, 10);
    newUser.password = hashedPassword;

    const createdUser = await Users.create({
      email: newUser.email,
      name: newUser.name,
      password: newUser.password,
      parentNumber: newUser.parentNumber,
      grade: newUser.grade,
      role: "student",
      approvalStatus: "pending",
    });

    res.status(201).json({
      success: true,
      msg: "Sign up request submitted. Wait for admin approval.",
      data: {
        id: createdUser._id,
        approvalStatus: createdUser.approvalStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await Users.findOne({ email });
    let isAdmin = false;

    if (!user) {
      user = await Admins.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, msg: "Invalid email" });
      }
      isAdmin = true;
    } else if (user.approvalStatus === "pending") {
      return res.status(403).json({
        success: false,
        msg: "Your account is pending admin approval.",
      });
    } else if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        success: false,
        msg: "Your signup request was rejected. Contact admin.",
      });
    }

    const isPasswordValid = await bycrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, msg: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_ENDS_IN,
    });

    const isProd = process.env.NODE_ENV === "production";
    const secure = isProd;
    const sameSite = secure ? "none" : "lax";

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure,
      sameSite,
    });

    res.status(200).json({
      success: true,
      msg: "User signed in successfully",
      isAdmin,
    });
  } catch (err) {
    next(err);
  }
};

const signOut = (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd;
  const sameSite = secure ? "none" : "lax";
  res.clearCookie("token", { secure, sameSite });
  res.status(200).json({ success: true, msg: "Signed out" });
};

module.exports = {
  signUp,
  signIn,
  signOut,
};
