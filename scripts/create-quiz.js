const axios = require("axios");
const FormData = require("form-data");
const { MONGODB_URI } = require("../config/env");

const BASE = "http://localhost:3000";

async function run() {
  // sign in as admin and store cookies
  const signInRes = await axios.post(
    `${BASE}/api/auth/sign-in`,
    {
      email: process.env.DEV_ADMIN_EMAIL || "admin@local.test",
      password: process.env.DEV_ADMIN_PASSWORD || "adminpass",
    },
    { withCredentials: true }
  );

  const cookie = signInRes.headers["set-cookie"];
  if (!cookie) throw new Error("No cookie set on sign-in");

  const form = new FormData();
  form.append("title", "Geometry Basics");
  form.append("grade", "7");
  // Use numeric indices for answers (0-based)
  form.append(
    "questions",
    JSON.stringify([
      { question: "What is 2+2?", options: ["3", "4", "5", "6"], answer: 1 },
      {
        question: "Which shape has 3 sides?",
        options: ["Square", "Triangle", "Circle", "Hexagon"],
        answer: 1,
      },
    ])
  );

  try {
    const res = await axios.post(`${BASE}/api/admin/quizzes`, form, {
      headers: { ...form.getHeaders(), Cookie: cookie.join("; ") },
      withCredentials: true,
      timeout: 10000,
    });

    console.log("Created quiz:", res.data.data._id);
  } catch (err) {
    if (err.response) {
      console.error("Request failed:", err.response.status, err.response.data);
    } else if (err.request) {
      console.error(
        "No response received. Possible server down or connection refused."
      );
    } else {
      console.error("Error preparing request:", err.message);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
