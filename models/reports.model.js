const mongoose = require("mongoose");

const reportsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quizzes",
      required: false,
    },
    url: { type: String, required: true },
    publicId: { type: String, required: false },
    meta: { type: Object, required: false },
  },
  { timestamps: true },
);

const Reports = mongoose.model("Reports", reportsSchema);
module.exports = Reports;
