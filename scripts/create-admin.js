// Creates a local admin user for development if it doesn't exist
const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config/env");
const Admins = require("../models/admins.model");
const bcrypt = require("bcryptjs");

async function run() {
  await mongoose.connect(MONGODB_URI);
  const email = process.env.DEV_ADMIN_EMAIL || "admin@local.test";
  const password = process.env.DEV_ADMIN_PASSWORD || "adminpass";
  const phoneNumber = process.env.DEV_ADMIN_PHONE || "01000000000";

  let admin = await Admins.findOne({ email });
  if (admin) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  admin = new Admins({
    name: "Local Admin",
    email,
    password: hashed,
    role: "admin",
    phoneNumber,
  });
  await admin.save();
  console.log(
    "Created admin:",
    email,
    "password:",
    password,
    "phone:",
    phoneNumber
  );
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
