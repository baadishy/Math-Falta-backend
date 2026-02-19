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
  getQuizByIdEdit
} = require("../../controllers/admin/quizzes.controllers");

router.use(authMiddleware, adminMiddleware);

router.get("/", getAllQuizzes);
// Specific routes first
router.get("/answers/:quizAnswersId/:id", getQuizAnswersById);
router.get("/trash", getDeletedQuizzes);
// Parameterized route last
router.get("/:id", getQuizById);
router.get('/edit/:id', getQuizByIdEdit); // to fetch quiz data for editing

router.post("/", uploadImages, createQuiz);

router.put("/:id", updateQuizById); // update quiz info
router.put("/:id/questions/add", uploadImages, addQuizQuestions);
router.put("/:quizId/questions/:questionId", uploadImages, updateQuizQuestion);
router.delete("/:quizId/questions/:questionId", deleteQuizQuestion);
router.put("/:id/restore", restoreQuizById);
router.put("/:id/delete", softDeleteQuizById);
router.delete("/:id", deleteQuizById);

module.exports = router;
