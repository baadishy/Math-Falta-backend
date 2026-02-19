const Quizzes = require("../../models/quizzes.model");
const QuizzesAnswers = require("../../models/quizzes-answers.model");
const cloudinary = require("../../config/cloudinary");

// Normalize answers so they are stored as letters 'A'..'D'
function normalizeAnswer(ans) {
  if (typeof ans === "number") return String.fromCharCode(65 + ans);
  if (typeof ans === "string") {
    const trimmed = ans.trim();
    if (/^[0-9]+$/.test(trimmed))
      return String.fromCharCode(65 + Number(trimmed));
    if (/^[A-Da-d]$/.test(trimmed)) return trimmed.toUpperCase();
  }
  return ans;
}

/* ================= GET ALL ================= */
const getAllQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quizzes.find({ isDeleted: false }).select(
      "title grade updatedAt",
    );
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

const getDeletedQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quizzes.find({ isDeleted: true });
    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

/* ================= GET BY ID ================= */
const getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Quiz ID is required" });

    const mongoose = require("mongoose");

    const quiz = await Quizzes.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      // get quiz answers
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "quizId",
          as: "answers",
        },
      },

      // join users
      {
        $lookup: {
          from: "users",
          localField: "answers.userId",
          foreignField: "_id",
          as: "users",
        },
      },

      // calculate total score per user from answers
      {
        $addFields: {
          usersWithTotalScore: {
            $map: {
              input: "$users",
              as: "u",
              in: {
                _id: "$$u._id",
                name: "$$u.name",
                email: "$$u.email",
                totalScore: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$answers",
                          as: "a",
                          cond: { $eq: ["$$a.userId", "$$u._id"] },
                        },
                      },
                      as: "ua",
                      in: "$$ua.score",
                    },
                  },
                },
              },
            },
          },
        },
      },

      // map answers with user + computed totalScore
      {
        $addFields: {
          detailedResults: {
            $map: {
              input: "$answers",
              as: "a",
              in: {
                score: "$$a.score",
                createdAt: "$$a.createdAt",
                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$usersWithTotalScore",
                        as: "u",
                        cond: { $eq: ["$$u._id", "$$a.userId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      // stats
      {
        $addFields: {
          questionsCount: { $size: "$questions" },
          attempts: { $size: "$answers" },
          highestScore: { $max: "$answers.score" },
        },
      },

      {
        $addFields: {
          highestScoreCount: {
            $size: {
              $filter: {
                input: "$answers",
                as: "a",
                cond: { $eq: ["$$a.score", "$highestScore"] },
              },
            },
          },
        },
      },

      // final projection
      {
        $project: {
          title: 1,
          grade: 1,
          isDeleted: 1,
          isPublished: 1,
          createdAt: 1,
          updatedAt: 1,
          questions: 1,

          questionsCount: 1,
          attempts: 1,
          highestScore: 1,
          highestScoreCount: 1,

          detailedResults: {
            score: 1,
            createdAt: 1,
            "user._id": 1,
            "user.name": 1,
            "user.email": 1,
            "user.totalScore": 1,
          },
        },
      },
    ]);

    if (!quiz || quiz.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    res.status(200).json({ success: true, data: quiz[0] });
  } catch (error) {
    next(error);
  }
};

const getQuizByIdEdit = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Quiz ID is required" });

    const quiz = await Quizzes.findOne({ _id: id, isDeleted: false });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

/* ================= GET QUIZ ANSWERS ================= */
const getQuizAnswersById = async (req, res, next) => {
  try {
    const { id, quizAnswersId } = req.params;

    const quizAnswer = await QuizzesAnswers.findOne({
      _id: quizAnswersId,
      userId: id,
    }).populate("quizId");

    if (!quizAnswer)
      return res
        .status(404)
        .json({ success: false, message: "Quiz answers not found" });

    const merged = quizAnswer.quizId.questions.map((q) => {
      const userQ = quizAnswer.questions.find(
        (uq) => uq.questionId.toString() === q._id.toString(),
      );

      return {
        questionId: q._id,
        question: q.question,
        image: q.image || null,
        options: q.options,
        answer: q.answer,
        userAnswer: userQ?.userAnswer || null,
        isCorrect: userQ?.isCorrect || false,
      };
    });

    res.status(200).json({
      success: true,
      data: { ...quizAnswer.toObject(), questions: merged },
    });
  } catch (error) {
    next(error);
  }
};

/* ================= CREATE QUIZ ================= */
const createQuiz = async (req, res, next) => {
  try {
    const { title, grade, questions } = req.body;
    const imagesFiles = req.files;

    const parsedQuestions = JSON.parse(questions);

    const questionsData = parsedQuestions.map((q, index) => {
      let image = null;

      if (imagesFiles?.[`image${index}`]?.[0]) {
        image = {
          url: imagesFiles[`image${index}`][0].path,
          publicId: imagesFiles[`image${index}`][0].filename,
        };
      }

      return {
        question: q.question,
        options: q.options,
        // Normalize answers so they are always stored as letters A-D
        answer: normalizeAnswer(q.answer),
        image,
      };
    });

    const quiz = new Quizzes({ title, grade, questions: questionsData });
    await quiz.save();

    res.status(201).json({ success: true,  msg: "Quiz created successfully"});
  } catch (error) {
    next(error);
  }
};

/* ================= UPDATE QUIZ INFO ONLY ================= */
const updateQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, grade } = req.body;

    const quiz = await Quizzes.findOne({ _id: id, isDeleted: false });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    if (title) quiz.title = title;
    if (grade) quiz.grade = grade;

    await quiz.save();
    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

/* ================= ADD QUESTIONS ================= */
const addQuizQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    const imagesFiles = req.files;

    const quiz = await Quizzes.findOne({ _id: id, isDeleted: false });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    const parsedQuestions = JSON.parse(questions);

    const newQuestions = parsedQuestions.map((q, index) => {
      let image = null;

      if (imagesFiles?.[`image${index}`]?.[0]) {
        image = {
          url: imagesFiles[`image${index}`][0].path,
          publicId: imagesFiles[`image${index}`][0].filename,
        };
      }

      return {
        question: q.question,
        options: q.options,
        answer: normalizeAnswer(q.answer),
        image,
      };
    });

    quiz.questions.push(...newQuestions);
    await quiz.save();

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

/* ================= UPDATE SINGLE QUESTION ================= */
const updateQuizQuestion = async (req, res, next) => {
  try {
    const { quizId, questionId } = req.params;
    const { question, options, answer } = req.body;
    const file = req.files?.image0?.[0];

    const quiz = await Quizzes.findOne({ _id: quizId, isDeleted: false });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    const q = quiz.questions.id(questionId);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    if (question) q.question = question;
    if (options) q.options = options;
    if (answer !== undefined && answer !== null)
      q.answer = normalizeAnswer(answer);

    if (file) {
      if (q.image?.publicId) {
        await cloudinary.uploader.destroy(q.image.publicId);
      }
      q.image = {
        url: file.path,
        publicId: file.filename,
      };
    }

    await quiz.save();
    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

/* ================= DELETE SINGLE QUESTION (PUT) ================= */
const deleteQuizQuestion = async (req, res, next) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quizzes.findOne({ _id: quizId, isDeleted: false });
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    const q = quiz.questions.id(questionId);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    if (q.image?.publicId) {
      await cloudinary.uploader.destroy(q.image.publicId);
    }

    quiz.questions = quiz.questions.filter(
      (ques) => ques._id.toString() !== questionId,
    );
    await quiz.save();

    res.status(200).json({ success: true, message: "Question deleted" });
  } catch (error) {
    next(error);
  }
};

/* ================= DELETE QUIZ ================= */
const deleteQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quiz = await Quizzes.findById(id);
    if (!quiz)
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });

    for (const q of quiz.questions) {
      if (q.image?.publicId) {
        await cloudinary.uploader.destroy(q.image.publicId);
      }
    }

    await Quizzes.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Quiz deleted" });
  } catch (error) {
    next(error);
  }
};

const softDeleteQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quiz = await Quizzes.findOne({ _id: id, isDeleted: false });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    quiz.isDeleted = true;
    quiz.deletedAt = new Date();

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz soft deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const restoreQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Quiz ID is required" });
    }

    const quiz = await Quizzes.findOne({ _id: id, isDeleted: true });
    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    if (!quiz.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Quiz is already active",
      });
    }

    quiz.isDeleted = false;
    quiz.deletedAt = null;

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz restored successfully",
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllQuizzes,
  getQuizById,
  getQuizAnswersById,
  createQuiz,
  updateQuizById,
  addQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
  deleteQuizById,
  softDeleteQuizById,
  restoreQuizById,
  getDeletedQuizzes,
  getQuizByIdEdit,
};
