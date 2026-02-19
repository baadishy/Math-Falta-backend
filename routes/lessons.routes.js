const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware.js");
const {
  getAllLessons,
  addLessonActivity,
  updateLessonProgress,
} = require("../controllers/lessons.controllers.js");

router.use(authMiddleware);

router.get("/", getAllLessons);
router.post("/:id/watch", addLessonActivity);
router.post("/progress", updateLessonProgress); // new route to update progress

module.exports = router;
