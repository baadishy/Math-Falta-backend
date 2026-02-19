const express = require("express");
const router = express.Router();
const { redirectReport } = require("../controllers/reports.controllers");

// Public short link: GET /r/:reportId
router.get("/:reportId", redirectReport);

module.exports = router;
