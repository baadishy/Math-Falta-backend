const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student",
  },
  totalScore: {
    type: Number,
    default: 0,
    required: false,
  },
  parentNumber: {
    type: String,
    required: true,
    trim: true,
    match: /^01[0,1,2,5][0-9]{8}$/,
  },
  grade: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 1,
    default: "5",
    trim: true,
    match: [/^(5|6|7|8|9)$/, "Grade must be between 5 and 9"],
  },
  lessonsCompleted: {
    type: [{
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Lessons",
      },
      lastOpened: {
        type: Date,
        default: Date.now(),
      }
    }],
  },
}, { timestamps: true });

usersSchema.index({email: 1}, {unique: true});

const Users = mongoose.model("Users", usersSchema);
module.exports = Users;
