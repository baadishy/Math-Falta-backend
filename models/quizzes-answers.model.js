const mongoose = require("mongoose");
const Quizzes = require("./quizzes.model");

const quizzesAnswersSchema = new mongoose.Schema(
  {
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
    timeTaken: {
      // seconds spent by user to complete the quiz
      type: Number,
      default: null,
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
  },
  { timestamps: true },
);

quizzesAnswersSchema.pre("save", async function () {
  try {
    // We only need to validate the answers format,
    // score and isCorrect are calculated in the controller
    const validAnswers = ["A", "B", "C", "D"];

    this.questions.forEach((answeredQuestion) => {
      if (!validAnswers.includes(answeredQuestion.userAnswer)) {
        throw new Error(
          `Invalid answer '${answeredQuestion.userAnswer}' for question ID ${answeredQuestion.questionId}`,
        );
      }
    });
  } catch (error) {
    throw error;
  }
});

quizzesAnswersSchema.index({ userId: 1 });
quizzesAnswersSchema.index({ userId: 1, quizId: 1 }, { unique: true });

const QuizzesAnswers = mongoose.model("QuizzesAnswers", quizzesAnswersSchema);
module.exports = QuizzesAnswers;
