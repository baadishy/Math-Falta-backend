const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware.js");
const {
  getAllLessons,
  addLessonActivity,
} = require("../controllers/lessons.controllers.js");

router.use(authMiddleware);

router.get("/", getAllLessons);
router.get("/:id/start", addLessonActivity);

module.exports = router;
