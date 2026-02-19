const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const { getCurrentAdmin, createAdmin, getAdminDashboard } = require("../../controllers/admin/admin.controllers");

router.get("/me", authMiddleware, adminMiddleware, getCurrentAdmin);
router.get("/dashboard", authMiddleware, adminMiddleware, getAdminDashboard)
router.post('/', authMiddleware, adminMiddleware, createAdmin);

module.exports = router;