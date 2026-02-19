const Admins = require("../../models/admins.model");
const Users = require("../../models/users.model");
const Lessons = require("../../models/lessons.model");
const Quizzes = require("../../models/quizzes.model");

const getCurrentAdmin = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const admin = await Admins.findById(adminId).select("-password");
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existingAdmin = await Admins.findOne({ email });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admins({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: "admin",
    });
    await newAdmin.save();

    res.status(201).json({
      success: true,
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        phoneNumber: newAdmin.phoneNumber,
        password: newAdmin.password,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    // Example: Fetch some dashboard data
    const dashboardData = {
  totalUsers: await Users.countDocuments(),

  totalLessons: await Lessons.countDocuments({ isDeleted: { $ne: true } }),

  totalQuizzes: await Quizzes.countDocuments({ isDeleted: { $ne: true } }),
};

    
    const lessons = await Lessons.find({isDeleted: false}).select("title _id createdAt updatedAt").limit(4).sort({ createdAt: -1 });
    const quizzes = await Quizzes.aggregate([
      // sort by last update (important for dashboard)
      { $sort: { updatedAt: -1 } },

      // limit results
      { $limit: 4 },

      // join quiz answers (attempts)
      {
        $lookup: {
          from: "quizzesanswers", // ⚠️ collection name (plural, lowercase)
          localField: "_id",
          foreignField: "quizId",
          as: "answers",
        },
      },

      // calculate stats
      {
        $addFields: {
          attempts: { $size: "$answers" },
          avgScore: {
            $cond: [
              { $gt: [{ $size: "$answers" }, 0] },
              { $round: [{ $avg: "$answers.score" }, 1] },
              null,
            ],
          },
        },
      },

      // clean output
      {
        $project: {
          title: 1,
          grade: 1,
          updatedAt: 1,
          "results.attempts": "$attempts",
          "results.avg": "$avgScore",
          isDeleted: 1,
        },
      },
    ]);

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
      { $sort: { totalScore: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: dashboardData,
        recentLessons: lessons,
        recentQuizzes: quizzes,
        leaderboard: leaderboard,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentAdmin,
  createAdmin,
  getAdminDashboard,
};
