const Lessons = require("../models/lessons.model");
const mongoose = require("mongoose");
const Users = require("../models/users.model");
const Activites = require("../models/activites.model");

const getAllLessons = async (req, res, next) => {
  try {
    const lessons = await Lessons.find({
      grade: req.user.grade,
      isDeleted: false,
    }).sort({ createdAt: -1 }); // Newest first

    if (!lessons)
      return res.status(400).json({ success: false, msg: "Lessons not found" });

    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    next(error);
  }
};

const addLessonActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ success: false, msg: "Lesson Id param is required" });

    const lesson = Lessons.findOne({
      _id: id,
      grade: req.user.grade,
      isDeleted: false,
    });

    if (!lesson)
      return res.status(400).json({ success: false, msg: "Lesson not found" });

    if (lesson.grade != req.user.grade) {
      return res
        .status(403)
        .json({ success: false, msg: "Access to this lesson is forbidden" });
    }

    const user = await Users.findById(req.user._id);
    if (user) {
      const lessonExists = user.lessonsCompleted.some(
        (completedLesson) => completedLesson.lessonId.toString() === id
      );

      if (!lessonExists) {
        user.lessonsCompleted.push({
          lessonId: id,
          lastOpened: Date.now(),
        });
        await user.save();
      }
    }

    const latestActivities = await Activites.create({
      userId: req.user._id,
      activityId: id,
      activityType: "lesson",
      description: `Opened lesson: ${lesson.title}`,
    });

    res
      .status(200)
      .json({
        success: true,
        msg: `Lesson: ${lesson.title} activity recorded`,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLessons,
  addLessonActivity,
};
