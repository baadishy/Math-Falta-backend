const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const uploadDocs = require("../../utils/upload-docs");
const {
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
} = require("../../controllers/admin/lessons.controllers");

// Apply auth and admin middlewares
router.use(authMiddleware, adminMiddleware);

/* ================= LESSON ROUTES ================= */
router.get("/", getAllLessons); // Get all lessons
router.get("/:id", getLessonById); // Get lesson by ID
router.post("/", uploadDocs, createLesson); // Create lesson
router.put("/:id", updateLessonById); // Update lesson fields (text/video)
router.put('/trash', getDeletedLessons); // Get all soft-deleted lessons

/* ================= DOCS PARTIAL ROUTES ================= */
router.post("/:id/docs", uploadDocs, addLessonDocs); // Add new docs
router.delete("/:lessonId/docs/:docId", deleteLessonDoc); // Delete ONE doc
router.put("/:lessonId/docs/:docId", updateLessonDocLabel); // Update doc label

router.put("/:id/restore", restoreLessonById); // Restore soft-deleted lesson
router.put("/:id/delete", softDeleteLessonById); // Soft delete lesson
router.delete("/:id", deleteLessonById); // Delete entire lesson

module.exports = router;
