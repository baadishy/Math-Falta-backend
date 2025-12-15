const Lessons = require("../models/lessons.model");
const mongoose = require("mongoose");

const getAllLessons = async (req, res, next) => {
  try {
    const lessons = await Lessons.find({ grade: req.user.grade, isDeleted: false });

    if (!lessons)
      return res.status(400).json({ success: false, msg: "Lessons not found" });

    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    next(error);
  }
};

const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ success: false, msg: "Lesson Id param is required" });

    const lesson = Lessons.find({ _id: id, isDeleted: false });

    if (!lesson)
      return res.status(400).json({ success: false, msg: "Lesson not found" });

    if (lesson.grade != req.user.grade) {
      return res
        .status(403)
        .json({ success: false, msg: "Access to this lesson is forbidden" });
    }

    res.status(200).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLessons,
  getLessonById,
};
