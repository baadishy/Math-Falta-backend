const { Router } = require("express");
const router = Router();
const fs = require("fs").promises;
const Quizzes = require("../models/quizzes.model");
const {
  getTopicsByGrade,
  getQuizByQuizId,
  getQuizAnswersByQuizId,
  addQuizAnswersByUserId
} = require("../controllers/quizzes.controllers");
const authMiddleware = require('../middlewares/auth.middleware.js')

router.use(authMiddleware)

router.get("/:id", getQuizByQuizId);

router.get("/topics/:grade", getTopicsByGrade);

router.get("/answers/:quizAnswersId", getQuizAnswersByQuizId);

router.post("/answers", addQuizAnswersByUserId);

module.exports = router;
