const Quizzes = require("../models/quizzes.model");
const QuizzesAnswers = require("../models/quizzes-answers.model");
const mongoose = require("mongoose");

const getQuizByQuizId = async (req, res, next) => {
  try {
    let quizId = req.params.id;
    if (!quizId)
      return res
        .status(400)
        .json({ success: false, msg: "quizId param is required" });

    let quiz = await Quizzes.find({_id: quizId, isDeleted: false}).select("-answer");

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

const getTopicsByGrade = async (req, res, next) => {
  try {
    let quizzes = await Quizzes.find({ grade: req.user.grade, isDeleted: false }).select("topic -_id");

    if (!quizzes || quizzes.length === 0) {
      return res.status(404).json({ success: false, msg: "No quizzes found for this grade" });
    }

    let topics = quizzes.map((quiz) => quiz.topic);

    res.status(200).json({ success: true, data: topics });
  } catch (err) {
    next(err);
  }
};

const getQuizAnswersByQuizId = async (req, res, next) => {
  try {
    let { quizAnswersId } = req.params;
    let userId = req.user._id

    if (!quizAnswersId)
      return res
        .status(400)
        .json({ success: false, msg: "quizId param is required" });

    const quizAnswer = await QuizzesAnswers.findOne({_id: quizAnswersId, userId}).populate(
      "quizId"
    );

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
        topic: quizAnswer.topic,
        userId: quizAnswer.userId,
        score: quizAnswer.score,
        questions: merged,
      },
    });
  } catch (err) {
    next(err);
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

    quizAnswers.quizId = quizAnswers._id;
    quizAnswers.userId = userId;
    delete quizAnswers._id;
    delete quizAnswers.__v;

    const createdQuizAnswers = await QuizzesAnswers.create(quizAnswers);

    res.status(201).json({ success: true, data: createdQuizAnswers });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuizByQuizId,
  getTopicsByGrade,
  getQuizAnswersByQuizId,
  addQuizAnswersByUserId
};
