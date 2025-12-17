const mongoose = require("mongoose");
const { create } = require("./quizzes.model");

const activitesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    activityType: {
      type: String,
      enum: ["quiz", "lesson"],
      required: true,
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Activites = mongoose.model("Activites", activitesSchema);

module.exports = Activites;