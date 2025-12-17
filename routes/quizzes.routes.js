const { Router } = require("express");
const router = Router();
const {
  getTitlesByGrade,
  getQuizByQuizId,
  getQuizAnswersByQuizId,
  addQuizAnswersByUserId,
  getQuizzesResultsByUserId,
} = require("../controllers/quizzes.controllers");
const authMiddleware = require("../middlewares/auth.middleware.js");

router.use(authMiddleware);

// Specific routes first to avoid being shadowed by the parameterized route
router.get("/titles", getTitlesByGrade);
router.get("/answers", getQuizzesResultsByUserId);
router.get("/answers/:quizAnswersId", getQuizAnswersByQuizId);
router.post("/answers", addQuizAnswersByUserId);

// Parameterized route should come last
router.get("/:id", getQuizByQuizId);

module.exports = router;
