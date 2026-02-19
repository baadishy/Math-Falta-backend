const Lessons = require("../models/lessons.model");
const mongoose = require("mongoose");
const Users = require("../models/users.model");
const Activites = require("../models/activites.model");

const getAllLessons = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const lessons = await Lessons.aggregate([
      // 1️⃣ Match lessons by grade + not deleted
      {
        $match: {
          grade: req.user.grade,
          isDeleted: false,
        },
      },

      // 2️⃣ Sort newest first
      {
        $sort: { createdAt: -1 },
      },

      // 3️⃣ Lookup user's progress for each lesson
      {
        $lookup: {
          from: "users",
          let: { lessonId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", userId] },
              },
            },
            {
              $project: {
                lessonsCompleted: {
                  $filter: {
                    input: "$lessonsCompleted",
                    as: "lc",
                    cond: {
                      $eq: ["$$lc.lessonId", "$$lessonId"],
                    },
                  },
                },
              },
            },
          ],
          as: "userProgress",
        },
      },

      // 4️⃣ Extract progress fields (or defaults)
      {
        $addFields: {
          _progressObj: {
            $arrayElemAt: [
              { $arrayElemAt: ["$userProgress.lessonsCompleted", 0] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          progress: { $ifNull: ["$_progressObj.progress", 0] },
          lastTime: { $ifNull: ["$_progressObj.lastTime", 0] },
          lastOpened: { $ifNull: ["$_progressObj.lastOpened", null] },
        },
      },
      {
        $project: {
          userProgress: 0,
          _progressObj: 0,
        },
      },

      // 5️⃣ Cleanup
      {
        $project: {
          userProgress: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    next(error);
  }
};

const addLessonActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, msg: "Lesson Id param is required" });
    }

    // 1️⃣ Find lesson and check access
    const lesson = await Lessons.findOne({
      _id: id,
      grade: req.user.grade,
      isDeleted: false,
    });

    if (!lesson) {
      return res.status(404).json({ success: false, msg: "Lesson not found" });
    }

    if (lesson.grade !== req.user.grade) {
      return res
        .status(403)
        .json({ success: false, msg: "Access to this lesson is forbidden" });
    }

    // 2️⃣ Update user's lessonsCompleted: add if not exists, always update lastOpened
    const user = await Users.findById(req.user._id);
    if (user) {
      let lessonEntry = user.lessonsCompleted.find(
        (lc) => lc.lessonId.toString() === id,
      );

      if (!lessonEntry) {
        // add new entry
        lessonEntry = {
          lessonId: id,
          lastOpened: new Date(),
        };
        user.lessonsCompleted.push(lessonEntry);
      } else {
        // update lastOpened
        lessonEntry.lastOpened = new Date();
      }

      await user.save();
    }

    // 3️⃣ Check latest activity
    const latestActivity = await Activites.findOne({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    if (
      latestActivity &&
      latestActivity.activityType === "lesson" &&
      latestActivity.activityId.toString() === id
    ) {
      // Same lesson → update timestamp
      const updated = await Activites.updateOne(
        { _id: latestActivity._id },
        { $set: { updatedAt: new Date() } },
        { new: true },
      );
      return res.status(200).json({
        success: true,
        msg: "Updated existing activity timestamp for the same lesson",
      });
    } else {
      // Different lesson or last activity was a quiz → create new activity
      const created = await Activites.create({
        userId: req.user._id,
        activityId: id,
        activityType: "lesson",
        description: `Opened lesson: ${lesson.title}`,
      });
      return res.status(200).json({
        success: true,
        msg: "Created new activity for opened lesson",
      });
    }
  } catch (error) {
    next(error);
  }
};

const updateLessonProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const progressUpdates = req.body; // [{ lessonId, progress, lastTime, lastOpened }]

    if (!Array.isArray(progressUpdates) || progressUpdates.length === 0) {
      return res.status(400).json({ message: "No progress data provided" });
    }

    await Promise.all(
      progressUpdates.map(
        async ({ lessonId, progress = 0, lastTime = 0, lastOpened }) => {
          // 1️⃣ Try to update existing lesson
          const updated = await Users.updateOne(
            { _id: userId, "lessonsCompleted.lessonId": lessonId },
            {
              $max: { "lessonsCompleted.$.progress": progress },
              $set: {
                "lessonsCompleted.$.lastTime": lastTime,
                "lessonsCompleted.$.lastOpened": lastOpened
                  ? new Date(lastOpened)
                  : new Date(),
              },
            },
          );

          // 2️⃣ If lesson entry doesn't exist, add it
          if (updated.matchedCount === 0) {
            await Users.updateOne(
              { _id: userId },
              {
                $push: {
                  lessonsCompleted: {
                    lessonId,
                    progress,
                    lastTime,
                    lastOpened: lastOpened ? new Date(lastOpened) : new Date(),
                  },
                },
              },
            );
          }
        },
      ),
    );

    return res.status(200).json({ message: "Progress updated successfully" });
  } catch (err) {
    console.error("Failed to update lesson progress:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllLessons,
  addLessonActivity,
  updateLessonProgress,
};
