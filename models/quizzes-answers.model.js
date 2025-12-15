const mongoose = require("mongoose");
const Quizzes = require("./quizzes.model");

const quizzesAnswersSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quizzes",
    required: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  questions: {
    type: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        userAnswer: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    required: true,
  },
}, { timestamps: true });

quizzesAnswersSchema.pre("save", async function () {
  try {
    console.log("quizId received:", this.quizId);

    const quiz = await Quizzes.findById(this.quizId);
    let score = 0;

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    this.questions.forEach((answeredQuestion) => {
      const originalQuestion = quiz.questions.id(answeredQuestion.questionId);

      if (
        originalQuestion &&
        originalQuestion.answer === answeredQuestion.userAnswer
      ) {
        answeredQuestion.isCorrect = true;
        score += 1;
      } else {
        answeredQuestion.isCorrect = false;
      }
    });

    this.score = score;
  } catch (error) {
    throw error;
  }
});

quizzesAnswersSchema.index({userId: 1});

const QuizzesAnswers = mongoose.model("QuizzesAnswers", quizzesAnswersSchema);
module.exports = QuizzesAnswers;
