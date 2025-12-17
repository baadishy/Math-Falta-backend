const Quizzes = require("../models/quizzes.model");
const QuizzesAnswers = require("../models/quizzes-answers.model");
const mongoose = require("mongoose");
const Activites = require("../models/activites.model");

const getQuizByQuizId = async (req, res, next) => {
  try {
    let quizId = req.params.id;
    if (!quizId)
      return res
        .status(400)
        .json({ success: false, msg: "quizId param is required" });

    let quiz = await Quizzes.findOne({ _id: quizId, isDeleted: false }).select(
      "-questions.answer"
    );

    if (!quiz) {
      return res.status(404).json({ success: false, msg: "Quiz not found" });
    }

    if (quiz.grade != req.user.grade) {
      return res
        .status(403)
        .json({ success: false, msg: "Access to this quiz is forbidden" });
    }

    res.status(200).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};

const getTitlesByGrade = async (req, res, next) => {
  try {
    const quizzes = await Quizzes.aggregate([
      {
        $match: {
          grade: req.user.grade,
          isDeleted: false,
        },
      },
      {
        $project: {
          title: 1,
          questionsCount: { $size: "$questions" },
        },
      },
    ]);

    if (!quizzes || quizzes.length === 0) {
      return res
        .status(404)
        .json({ success: false, msg: "No quizzes found for this grade" });
    }

    res.status(200).json({ success: true, data: quizzes });
  } catch (err) {
    next(err);
  }
};

const getQuizAnswersByQuizId = async (req, res, next) => {
  try {
    let { quizAnswersId } = req.params;
    let userId = req.user._id;

    if (!quizAnswersId)
      return res
        .status(400)
        .json({ success: false, msg: "quizId param is required" });

    const quizAnswer = await QuizzesAnswers.findOne({
      _id: quizAnswersId,
      userId,
    }).populate("quizId");

    if (!quizAnswer) {
      return res.status(404).json({ error: "Quiz answers not found" });
    }

    // Merge questions
    const merged = quizAnswer.quizId.questions.map((q) => {
      const userQ = quizAnswer.questions.find(
        (uq) => uq.questionId.toString() === q._id.toString()
      );

      return {
        questionId: q._id,
        question: q.question,
        options: q.options,
        answer: q.answer,
        userAnswer: userQ?.userAnswer || null,
        isCorrect: userQ?.isCorrect || false,
      };
    });

    res.json({
      success: true,
      data: {
        quizId: quizAnswer.quizId._id,
        title: quizAnswer.title,
        userId: quizAnswer.userId,
        score: quizAnswer.score,
        questions: merged,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getQuizzesResultsByUserId = async (req, res, next) => {
  {
    try {
      let userId = req.user._id;
      const quizAnswers = await QuizzesAnswers.find({ userId }).select(
        "score title createdAt"
      ).sort({ createdAt: -1 });

      if (!quizAnswers || quizAnswers.length === 0) {
        return res
          .status(404)
          .json({ success: false, msg: "No quiz answers found for this user" });
      }

      res.status(200).json({ success: true, data: quizAnswers });
    } catch (err) {
      next(err);
    }
  }
};
const addQuizAnswersByUserId = async (req, res, next) => {
  try {
    let userId = req.user._id;
    let quizAnswers = req.body;

    if (!userId)
      return res
        .status(400)
        .json({ success: false, msg: "userId param is required" });

    if (!quizAnswers)
      return res
        .status(400)
        .json({ success: false, msg: "quiz answers data is required" });

    // accept quizId sent as quizId or _id
    if (!quizAnswers.quizId && quizAnswers._id)
      quizAnswers.quizId = quizAnswers._id;
    if (!quizAnswers.quizId)
      return res
        .status(400)
        .json({ success: false, msg: "quizId is required in body" });

    // attach title (original quiz title) for validation and easier reporting
    const quiz = await Quizzes.findById(quizAnswers.quizId).select("title");
    if (!quiz)
      return res.status(404).json({ success: false, msg: "Quiz not found" });

    quizAnswers.userId = userId;
    quizAnswers.title = quiz.title;
    delete quizAnswers._id;
    delete quizAnswers.__v;

    const createdQuizAnswers = await QuizzesAnswers.create(quizAnswers);
    const latestActivities = await Activites.create({
      userId: userId,
      activityId: createdQuizAnswers._id,
      activityType: "quiz",
      description: `Completed quiz: ${quiz.title}`,
      score: createdQuizAnswers.score,
    });

    res.status(201).json({ success: true, data: createdQuizAnswers });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuizByQuizId,
  getTitlesByGrade,
  getQuizzesResultsByUserId,
  getQuizAnswersByQuizId,
  addQuizAnswersByUserId,
};
