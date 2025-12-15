const mongoose = require("mongoose");

const AdminsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^01[0,1,2,5][0-9]{8}$/,
    },
    role: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true }
);

const Admins = mongoose.model("Admins", AdminsSchema);
module.exports = Admins;
