const mongoose = require("mongoose");
const Quizzes = require("./quizzes.model");

const quizzesAnswersSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quizzes",
    required: true,
  },
  title: {
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
    const quiz = await Quizzes.findById(this.quizId);
    const validAnswers = ["A", "B", "C", "D"];
    let score = 0;

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    this.questions.forEach((answeredQuestion) => {
      const originalQuestion = quiz.questions.id(answeredQuestion.questionId);

      if (!validAnswers.includes(answeredQuestion.userAnswer)) {
        throw new Error(
          `Invalid answer '${answeredQuestion.userAnswer}' for question ID ${answeredQuestion.questionId}`
        );
      }

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
quizzesAnswersSchema.index({userId: 1, quizId: 1}, {unique: true});

const QuizzesAnswers = mongoose.model("QuizzesAnswers", quizzesAnswersSchema);
module.exports = QuizzesAnswers;
