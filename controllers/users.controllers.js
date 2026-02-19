const mongoose = require("mongoose");
const Users = require("../models/users.model");
const Quizzes = require("../models/quizzes.model");
const QuizzesAnswers = require("../models/quizzes-answers.model");
const Activites = require("../models/activites.model");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await Users.aggregate([
      {
        $lookup: {
          from: "quizzesanswers",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
              },
            },
            {
              $project: {
                _id: 0,
                title: 1,
                score: 1,
              },
            },
          ],
          as: "quizzes",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$quizzes.score" },
        },
      },
      {
        $project: {
          name: 1,
          grade: 1,
          quizzes: 1,
          totalScore: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    let id = req.user._id;
    if (req.path == "/header") {
      const userHeader = await Users.findById(id).select(
        "name parentNumber email",
      );
      return res.status(200).json({ success: true, data: userHeader });
    }

    const user = await Users.aggregate([
      // 1️⃣ Match user
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },

      // 2️⃣ Unwind lessonsCompleted
      {
        $unwind: {
          path: "$lessonsCompleted",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 3️⃣ Sort by latest opened lesson
      {
        $sort: {
          "lessonsCompleted.lastOpened": -1,
        },
      },

      // 4️⃣ Take only the latest lesson
      {
        $limit: 1,
      },

      // 5️⃣ Lookup lesson details
      {
        $lookup: {
          from: "lessons",
          localField: "lessonsCompleted.lessonId",
          foreignField: "_id",
          as: "latestLesson",
        },
      },

      // 6️⃣ Unwind lookup result
      {
        $unwind: {
          path: "$latestLesson",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 7️⃣ Lookup quizzes
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "quizzes",
        },
      },

      // 8️⃣ Add calculated fields
      {
        $addFields: {
          totalScore: { $sum: "$quizzes.score" },
          quizzesCompleted: { $size: "$quizzes" },
        },
      },

      // 9️⃣ Final shape including progress
      {
        $project: {
          name: 1,
          grade: 1,
          totalScore: 1,
          quizzesCompleted: 1,

          latestLesson: {
            _id: "$latestLesson._id",
            title: "$latestLesson.title",
            topic: "$latestLesson.topic",
            openedAt: "$lessonsCompleted.lastOpened",
            progress: "$lessonsCompleted.progress", // ✅ include progress
          },

          quizzes: {
            _id: 1,
            quizId: 1,
          },
        },
      },
    ]);

    if (!user.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const lessonsCompleted = await Activites.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id),
          activityType: "lesson",
        },
      },
      {
        $group: {
          _id: "$activityId", // lessonId
        },
      },
      {
        $count: "lessonsCompleted",
      },
    ]);

    const answeredQuzzIds = (user[0].quizzes || [])
      .map((quiz) => {
        const id = quiz?.quizId ?? quiz?._id;
        return id ? String(id) : null;
      })
      .filter(Boolean);

    const reccommendedQuizzes = await Quizzes.find({
      grade: user[0].grade,
      _id: { $nin: answeredQuzzIds },
      isDeleted: false,
    }).select("title");

    const latestActivities = await Activites.find({ userId: id })
      .sort({ updatedAt: -1 })
      .limit(5);

    const leaderboard = await Users.aggregate([
      {
        $lookup: {
          from: "quizzesanswers",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
              },
            },
            {
              $project: {
                _id: 0,
                score: 1,
              },
            },
          ],
          as: "quizzes",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$quizzes.score" },
        },
      },
      {
        $project: {
          name: 1,
          grade: 1,
          totalScore: 1,
        },
      },
    ]).sort({ totalScore: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...user[0],
        lessonsCompleted: lessonsCompleted[0]
          ? lessonsCompleted[0].lessonsCompleted
          : 0,
        latestActivities: latestActivities,
        leaderboard: leaderboard,
        reccommendedQuizzes: reccommendedQuizzes,
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateUserById = async (req, res, next) => {};

const transporter = require("../config/nodemailer");
const { EMAIL_ACCOUNT } = require("../config/env");

const sendReport = async (req, res, next) => {
  try {
    const { url, parentEmail } = req.body;

    if (!url)
      return res.status(400).json({ success: false, message: "Missing url" });

    // Determine recipient: prefer provided parentEmail, fall back to authenticated user's email
    const recipient = parentEmail || (req.user && req.user.email);
    if (!recipient)
      return res
        .status(400)
        .json({ success: false, message: "No recipient email available" });

    const mailOptions = {
      from: EMAIL_ACCOUNT,
      to: recipient,
      subject: "Math-Falta: Report link",
      html: `
        <div style="font-family:Arial, Helvetica, sans-serif; line-height:1.4; color:#111827">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEnHeX6lQASREHo1CvcD7QajIRgG-bxK1_GrGnL3ZFhDJQYxQ_lrDe7CnigLxfH3imLfdpb3DCk-V3FmnDBeNvZ9uFXwsCRvZokrYJoR7dphuKXlanzVBLBGzqciJUJW79daXHfJG_pizZ8g_O5QLHYhHE7Ci50qsI0E5j3uxiMqzqCj4YsscAk1GE1vZREbMnvt6F646N6wuLriYo-bk1wn36wZTNBgKIQ2c0o0TJIBKmpqmCZvbnbG-MlbRK9_pKV22ZDXNgj1s" alt="Math-Falta" width="64" />
            <h2 style="margin:0; color:#135bec">Math-Falta</h2>
          </div>
          <p>Hello,</p>
          <p>Your child's report is available at the following link:</p>
          <p><a href="${url}">${url}</a></p>
          <p>Open the link to preview or download the report.</p>
          <p>— Math-Falta</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Report link sent" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserById,
  sendReport,
};
