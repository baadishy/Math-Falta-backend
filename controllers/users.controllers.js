const mongoose = require("mongoose");
const Users = require("../models/users.model");
const QuizzesAnswers = require("../models/quizzes-answers.model");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await Users.aggregate([
      {
        $lookup: {
          from: "quizzesanswers",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
              },
            },
            {
              $project: {
                _id: 0,
                topic: 1,
                score: 1,
              },
            },
          ],
          as: "quizzes",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$quizzes.score" },
        },
      },
      {
        $project: {
          name: 1,
          grade: 1,
          quizzes: 1,
          totalScore: 1,
          _id: 0
        },
      },
    ]);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    let id = req.user._id;
    const user = await Users.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$quizzes.score" },
        },
      },
      {
        $project: {
          username: 1,
          grade: 1,
          totalScore: 1,
          parentNumber: 1,
          email: 1,
          'quizzes.topic': 1,
          'quizzes._id': 1,
        },
      },
    ]);

    if (!user.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, data: user[0] });
  } catch (err) {
    next(err);
  }
};

const updateUserById = async (req, res, next) => {
  
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserById,
};
