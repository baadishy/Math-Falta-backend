const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const uploadImages = require("../../utils/upload-images");

const {
  getAllQuizzes,
  getQuizById,
  getQuizAnswersById,
  createQuiz,
  updateQuizById,
  addQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
  deleteQuizById,
  softDeleteQuizById,
  restoreQuizById,
  getDeletedQuizzes,
} = require("../../controllers/admin/quizzes.controllers");

router.use(authMiddleware, adminMiddleware);

router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);
router.get("/answers/:quizAnswersId/:id", getQuizAnswersById);
router.get("/trash", getDeletedQuizzes);

router.post("/", uploadImages, createQuiz);

router.put("/:id", updateQuizById); // update quiz info
router.put("/:id/questions/add", uploadImages, addQuizQuestions);
router.put("/:quizId/questions/:questionId", uploadImages, updateQuizQuestion);
router.delete("/:quizId/questions/:questionId", deleteQuizQuestion);
router.put("/:id/restore", restoreQuizById);
router.put("/:id/delete", softDeleteQuizById);
router.delete("/:id", deleteQuizById);

module.exports = router;
