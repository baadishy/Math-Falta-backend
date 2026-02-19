const mongoose = require("mongoose");
const Reports = require("../models/reports.model");

// GET /r/:reportId
exports.redirectReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    const report = await Reports.findById(reportId).lean();
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    // Redirect to the stored URL
    return res.redirect(`http://localhost:3000/view-report.html?url=${encodeURIComponent(report.url)}`);
  } catch (err) {
    next(err);
  }
};
