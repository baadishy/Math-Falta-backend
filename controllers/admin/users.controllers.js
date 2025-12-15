const Users = require("../../models/users.model");
const Admins = require("../../models/admins.model");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await Users.find().select("name email");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await Users.aggregate([
      // 1️⃣ Match user
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },

      // 2️⃣ Get quiz answers by user
      {
        $lookup: {
          from: "quizzesanswers", // collection name (mongoose plural)
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },

      // 3️⃣ Get quizzes
      {
        $lookup: {
          from: "quizzes",
          localField: "attempts.quizId",
          foreignField: "_id",
          as: "quizzesData",
        },
      },

      // 4️⃣ Build final quizzes array
      {
        $project: {
          name: 1,
          email: 1,
          parentNumber: 1,
          grade: 1,
          totalScore: { $sum: "$attempts.score" },
          createdAt: 1,
          updatedAt: 1,

          quizzes: {
            $map: {
              input: "$attempts",
              as: "attempt",
              in: {
                $let: {
                  vars: {
                    quiz: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$quizzesData",
                            as: "q",
                            cond: { $eq: ["$$q._id", "$$attempt.quizId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    topic: "$$attempt.topic",
                    score: "$$attempt.score",

                    questions: {
                      $map: {
                        input: "$$quiz.questions",
                        as: "q",
                        in: {
                          questionId: "$$q._id",
                          question: "$$q.question",
                          image: "$$q.image",
                          options: "$$q.options",
                          correctAnswer: "$$q.answer", // ❌ REMOVE for students

                          userAnswer: {
                            $let: {
                              vars: {
                                ua: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: "$$attempt.questions",
                                        as: "a",
                                        cond: {
                                          $eq: ["$$a.questionId", "$$q._id"],
                                        },
                                      },
                                    },
                                    0,
                                  ],
                                },
                              },
                              in: "$$ua.userAnswer",
                            },
                          },

                          isCorrect: {
                            $let: {
                              vars: {
                                ua: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: "$$attempt.questions",
                                        as: "a",
                                        cond: {
                                          $eq: ["$$a.questionId", "$$q._id"],
                                        },
                                      },
                                    },
                                    0,
                                  ],
                                },
                              },
                              in: "$$ua.isCorrect",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);

    if (!user.length) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user[0] });
  } catch (err) {
    next(err);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existingAdmin = await Admins.findOne({ email });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admins({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: "admin",
    });
    await newAdmin.save();

    res.status(201).json({
      success: true,
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        phoneNumber: newAdmin.phoneNumber,
        password: newAdmin.password,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const updates = req.body;

    const updatedUser = await Users.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

const deleteUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const deletedUser = await Users.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  createAdmin,
};
