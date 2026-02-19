const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  exportUsers,
  uploadQuizReport,
  generateQuizReport,
  sendQuizReport,
  sendQuizReportDirect,
  getUserReports,
} = require("../../controllers/admin/users.controllers");
const uploadDocs = require("../../utils/upload-docs");
const uploadMemory = require("../../utils/upload-memory");

router.use(authMiddleware, adminMiddleware);

router.get("/", getAllUsers);
router.get("/export", exportUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUserById);
router.delete("/:id", deleteUserById);
router.post("/:id/report", uploadDocs, uploadQuizReport);
router.post("/:id/report/generate", generateQuizReport);
router.get("/:id/reports", getUserReports);
router.post("/:id/report/send", sendQuizReport);
router.post(
  "/:id/report/send-file",
  uploadMemory.single("file"),
  sendQuizReportDirect,
);

module.exports = router;
