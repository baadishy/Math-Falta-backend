const Users = require("../models/users.model");
const Admins = require("../models/admins.model");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcryptjs");
const { JWT_SECRET, JWT_ENDS_IN } = require("../config/env");
const sendEmail = require("../utils/send-email");

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
      role: 'student',
    });

    const token = jwt.sign({ id: createdUser._id }, JWT_SECRET, {
      expiresIn: JWT_ENDS_IN,
    });
    
    sendEmail(createdUser.email, "Welcome Email", "http://math-falta.com/dashboard", createdUser.name );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: false,
      sameSite: "lax",
    });

    res.status(201).json({
      success: true,
      msg: "User created successfully",
      data: createdUser,
    });
  } catch (err) {
    next(err);
  }
};

const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await Users.findOne({ email });

    if (!user) {
      user = await Admins.findOne({ email });
      if (!user) {
      return res.status(400).json({ success: false, msg: "Invalid email" });
    }
  }

    const isPasswordValid = await bycrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ success: false, msg: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_ENDS_IN,
    });


    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      msg: "User signed in successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signUp,
  signIn,
};
