const Lessons = require("../../models/lessons.model");
const cloudinary = require("../../config/cloudinary");

/* ================= GET ALL LESSONS ================= */
const getAllLessons = async (req, res, next) => {
  try {
    const lessons = await Lessons.find({ isDeleted: false });
    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    next(error);
  }
};

const getDeletedLessons = async (req, res, next) => {
  try {
    const lessons = await Lessons.find({ isDeleted: true });
    res.json({ success: true, data: lessons });
  } catch (error) {
    next(error);
  }
};

/* ================= GET LESSON BY ID ================= */
const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lesson ID is required",
      });
    }

    const lesson = await Lessons.findOne({ _id: id, isDeleted: false });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    res.status(200).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

/* ================= CREATE LESSON ================= */
const createLesson = async (req, res, next) => {
  try {
    const { title, topic, grade, video, labels } = req.body;
    const docs = req.files?.docs || [];

    if (!title || !topic || !grade || !video) {
      return res.status(400).json({
        success: false,
        message: "Title, topic, grade, and video are required",
      });
    }

    let parsedLabels = [];
    if (labels) {
      try {
        parsedLabels = JSON.parse(labels);
      } catch {
        parsedLabels = [];
      }
    }

    const lessonDocs = docs.map((doc, i) => ({
      url: doc.path,
      publicId: doc.filename,
      originalName: doc.originalname,
      label: parsedLabels[i] || null,
    }));

    const lesson = new Lessons({
      title,
      topic,
      grade,
      video,
      docs: lessonDocs,
    });

    await lesson.save();

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

/* ================= UPDATE LESSON (TEXT ONLY) ================= */
const updateLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, topic, grade, video } = req.body;

    const lesson = await Lessons.findOne({ _id: id, isDeleted: false });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (title) lesson.title = title;
    if (topic) lesson.topic = topic;
    if (grade) lesson.grade = grade;
    if (video) lesson.video = video;

    await lesson.save();

    res.status(200).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

/* ================= ADD DOCS (PARTIAL UPDATE) ================= */
const addLessonDocs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { labels } = req.body;

    const lesson = await Lessons.find({ _id: id, isDeleted: false });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    let parsedLabels = [];
    if (labels) {
      try {
        parsedLabels = JSON.parse(labels);
      } catch {
        parsedLabels = [];
      }
    }

    const newDocs = req.files.docs.map((file, i) => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
      label: parsedLabels[i] || null,
    }));

    lesson.docs.push(...newDocs);
    await lesson.save();

    res.status(200).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

/* ================= DELETE ONE DOC ================= */
const deleteLessonDoc = async (req, res, next) => {
  try {
    const { lessonId, docId } = req.params;

    const lesson = await Lessons.findOne({ _id: lessonId, isDeleted: false });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const doc = lesson.docs.id(docId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    await cloudinary.uploader.destroy(doc.publicId, {
      resource_type: "raw",
    });

    await doc.remove();
    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ================= UPDATE DOC LABEL ================= */
const updateLessonDocLabel = async (req, res, next) => {
  try {
    const { lessonId, docId } = req.params;
    const { label } = req.body;

    const lesson = await Lessons.find({ _id: lessonId, isDeleted: false });
    if (!lesson) {
      return res.status(404).json({ success: false });
    }

    const doc = lesson.docs.id(docId);
    if (!doc) {
      return res.status(404).json({ success: false });
    }

    doc.label = label;
    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Label updated",
    });
  } catch (error) {
    next(error);
  }
};

/* ================= DELETE LESSON ================= */
const deleteLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lesson = await Lessons.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    for (const doc of lesson.docs) {
      await cloudinary.uploader.destroy(doc.publicId, {
        resource_type: "raw",
      });
    }

    await Lessons.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const softDeleteLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lesson = await Lessons.findOne({ _id: id, isDeleted: false });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    lesson.isDeleted = true;
    lesson.deletedAt = new Date();

    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson soft deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const restoreLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lesson = await Lessons.find({ _id: id, isDeleted: true });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    lesson.isDeleted = false;
    lesson.deletedAt = null;

    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson restored successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLessonById,
  addLessonDocs,
  deleteLessonDoc,
  updateLessonDocLabel,
  deleteLessonById,
  softDeleteLessonById,
  restoreLessonById,
  getDeletedLessons,
};
