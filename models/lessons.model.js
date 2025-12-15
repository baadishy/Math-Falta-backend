const mongoose = require("mongoose");

const lessonsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      maxLength: 1,
      minLength: 1,
      default: "5",
      trim: true,
      match: [/^(5|6|7|8|9)$/, "Grade must be between 5 and 9"],
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    video: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Validate if the video is a valid URL
          return /^https?:\/\/.+/.test(v);
        },
      },
      message: "Invalid video URL",
    },
    docs: {
      type: [
        {
          url: {
            type: String,
            required: true,
            validate: {
              validator: function (v) {
                // Validate if the document is a valid URL
                return /^https?:\/\/.+/.test(v);
              },
            },
            message: "Invalid document URL",
          },
          publicId: {
            type: String,
            required: true,
          },
          label: {
            type: String,
            required: true,
            trim: true,
          },
          originalName: {
            type: String,
            trim: true,
            required: true,
          },
        },
      ],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

lessonsSchema.index({isDeleted: 1});
lessonsSchema.index({grade: 1});

const Lessons = mongoose.model("Lessons", lessonsSchema);

module.exports = Lessons;
