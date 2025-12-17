const mongoose = require("mongoose");

const quizzesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      maxLength: 2,
      minLength: 1,
      default: "5",
      trim: true,
      match: [/^(5|6|7|8|9)$/, "Grade must be between 5 and 9"],
    },
    questions: {
      type: [
        {
          question: {
            type: String,
            required: function () {
              // 'this' is the question subdocument
              return !this.image; // required only if no image
            },
            trim: true,
          },
          _id: {
            type: mongoose.Schema.Types.ObjectId,
            auto: true,
          },
          image: {
            type: {
              url: {
                type: String,
                required: true,
                validate: {
                  validator: function (v) {
                    // Validate if the image is a valid URL
                    return /^https?:\/\/.+/.test(v);
                  },
                  message: "Invalid image URL",
                },
              },
              publicId: {
                type: String,
                required: true,
              },
              format: {
                type: String,
              },
            },
            required: false,
          },
          options: {
            type: [String],
            required: true,
            validate: {
              validator: (arr) => Array.isArray(arr) && arr.length === 4,
              message: "There must be 4 options",
            },
          },
          answer: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

quizzesSchema.pre("save", async function (next) {
  try {
    const validAnswers = ["A", "B", "C", "D"];
    this.questions.forEach((q) => {
      if (q.image) {
        for (let i = 0; i < q.options.length; i++) {
          if (!q.options[i] || q.options[i].trim() === "") {
            throw new Error(
              `Option ${String.fromCharCode(
                65 + i
              )} is required for image questions`
            );
          }
        }
        if (!validAnswers.includes(q.answer)) {
          throw new Error(
            "Answer must be one of 'A', 'B', 'C', or 'D' for image questions"
          );
        }
      }
    });
  } catch (error) {
    throw error;
  }
});

quizzesSchema.index({isDeleted: 1, grade: 1});
quizzesSchema.index({isDeleted: 1});

const Quizzes = mongoose.model("Quizzes", quizzesSchema);
module.exports = Quizzes;
