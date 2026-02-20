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
      "-questions.answer",
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
      // 1️⃣ Match grade + not deleted
      {
        $match: {
          grade: req.user.grade,
          isDeleted: false,
        },
      },

      // 2️⃣ Lookup user's answered quizzes
      {
        $lookup: {
          from: "quizzesanswers", // ⚠️ collection name (plural, lowercase)
          let: { quizId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$quizId", "$$quizId"] },
                    { $eq: ["$userId", req.user._id] },
                  ],
                },
              },
            },
          ],
          as: "userAnswers",
        },
      },

      // 3️⃣ Keep only quizzes with NO answers by this user
      {
        $match: {
          userAnswers: { $size: 0 },
        },
      },

      // 4️⃣ Final shape
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

const getQuizzesResultsByUserId = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const quizResults = await QuizzesAnswers.aggregate([
      // 1️⃣ Match by userId
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $addFields: {
          questionsCount: { $size: "$questions" },
        },
      },
      // 2️⃣ Sort by most recent
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          title: 1,
          score: 1,
          questionsCount: 1,
          timeTaken: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!quizResults || quizResults.length === 0) {
      return res
        .status(404)
        .json({ success: false, msg: "No quiz results found for this user" });
    }

    res.status(200).json({ success: true, data: quizResults });
  } catch (err) {
    next(err);
  }
};

const getQuizAnswersByQuizId = async (req, res, next) => {
  try {
    const { quizAnswersId } = req.params;
    const userId = req.user._id;

    if (!quizAnswersId)
      return res
        .status(400)
        .json({ success: false, msg: "quizAnswersId param is required" });

    // 1️⃣ Current quiz result
    const quizAnswer = await QuizzesAnswers.findOne({
      _id: quizAnswersId,
      userId,
    }).populate("quizId");

    if (!quizAnswer)
      return res
        .status(404)
        .json({ success: false, msg: "Quiz answers not found" });

    // 2️⃣ Merge questions (review mode)
    const mergedQuestions = quizAnswer.quizId.questions.map((q) => {
      const userQ = quizAnswer.questions.find(
        (uq) => uq.questionId.toString() === q._id.toString(),
      );

      return {
        questionId: q._id,
        image: q.image || null,
        question: q.question,
        options: q.options,
        answer: q.answer,
        userAnswer: userQ?.userAnswer || null,
        isCorrect: userQ?.isCorrect || false,
      };
    });

    // 3️⃣ All solved quizzes for LEFT SIDEBAR
    const solvedQuizzes = await QuizzesAnswers.find({ userId })
      .select("quizId title score createdAt timeTaken")
      .sort({ createdAt: -1 });

    const solvedFormatted = solvedQuizzes.map((q) => ({
      quizId: q.quizId.toString(),
      answersId: q._id.toString(),
      title: q.title,
      score: q.score,
      createdAt: q.createdAt,
      timeTaken: q.timeTaken ?? null,
    }));

    // 4️⃣ Final response
    res.status(200).json({
      success: true,
      data: {
        quizId: quizAnswer.quizId._id.toString(),
        title: quizAnswer.title,
        score: quizAnswer.score,
        questions: mergedQuestions,
        solvedQuizzes: solvedFormatted, // ✅ USED BY FRONTEND
        createdAt: quizAnswer.createdAt,
        timeTaken: quizAnswer.timeTaken ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

const addQuizAnswersByUserId = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const quizAnswers = req.body;

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

    // attach title from DB for reference
    const quiz = await Quizzes.findById(quizAnswers.quizId).select("title");
    if (!quiz)
      return res.status(404).json({ success: false, msg: "Quiz not found" });

    const rawScore = quizAnswers.score ?? 0;

    // ✅ calculate percentage based on number of answers submitted
    const totalQuestions = Array.isArray(quizAnswers.answers)
      ? quizAnswers.questions.length
      : 1; // avoid divide by 0
    const percentageScore = Math.round((rawScore / totalQuestions) * 100);

    // attach userId, quiz title, save percentage and timeTaken
    quizAnswers.userId = userId;
    quizAnswers.title = quiz.title;
    quizAnswers.score = percentageScore;
    // accept timeTaken in seconds
    if (quizAnswers.timeTaken !== undefined && quizAnswers.timeTaken !== null) {
      quizAnswers.timeTaken = Number(quizAnswers.timeTaken) || 0;
    }
    delete quizAnswers._id;
    delete quizAnswers.__v;

    const createdQuizAnswers = await QuizzesAnswers.create(quizAnswers);

    await Activites.create({
      userId,
      activityId: createdQuizAnswers._id,
      activityType: "quiz",
      description: `Completed quiz: ${quiz.title}`,
      score: percentageScore,
    });

    res
      .status(201)
      .json({ success: true, msg: "Quiz answers saved successfully", data: {_id: createdQuizAnswers._id} });
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
