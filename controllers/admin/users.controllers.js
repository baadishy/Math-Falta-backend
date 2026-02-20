const Users = require("../../models/users.model");
const Admins = require("../../models/admins.model");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Activites = require("../../models/activites.model");
const exceljs = require("exceljs");
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("../../config/cloudinary");
const uploadDocs = require("../../utils/upload-docs");
const Reports = require("../../models/reports.model");
const fs = require("fs");
const path = require("path");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const {
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_TOKEN,
} = require("../../config/env");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await Users.aggregate([
      {
        $lookup: {
          from: "quizzesanswers", // collection name (mongoose plural)
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$attempts.score" },
          quizzesTaken: { $size: "$attempts" },
        },
      },
      {
        $project: {
          name: 1,
          totalScore: 1,
          quizzesTaken: 1,
          grade: 1,
          createdAt: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await Users.aggregate([
      // 1️⃣ Match user
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },

      // 2️⃣ Get quiz attempts by user
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },

      // 3️⃣ Get quizzes data
      {
        $lookup: {
          from: "quizzes",
          localField: "attempts.quizId",
          foreignField: "_id",
          as: "quizzesData",
        },
      },

      // 4️⃣ Get lessons data
      {
        $lookup: {
          from: "lessons",
          localField: "lessonsCompleted.lessonId",
          foreignField: "_id",
          as: "lessonsData",
        },
      },

      // 5️⃣ Final shape
      {
        $project: {
          // user info
          name: 1,
          email: 1,
          parentNumber: 1,
          grade: 1,
          createdAt: 1,
          updatedAt: 1,

          // scores
          totalScore: { $sum: "$attempts.score" },

          // 🟦 lessons with details
          lessons: {
            $map: {
              input: "$lessonsCompleted",
              as: "lc",
              in: {
                $let: {
                  vars: {
                    lesson: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$lessonsData",
                            as: "l",
                            cond: { $eq: ["$$l._id", "$$lc.lessonId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    _id: "$$lesson._id",
                    title: "$$lesson.title",
                    topic: "$$lesson.topic",
                    videoUrl: "$$lesson.videoUrl",
                    lastOpened: "$$lc.lastOpened",
                    progress: "$$lc.progress", // ← new field
                  },
                },
              },
            },
          },

          // 🟩 quizzes with questions & answers
          quizzes: {
            $map: {
              input: "$attempts",
              as: "attempt",
              in: {
                $let: {
                  vars: {
                    quiz: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$quizzesData",
                            as: "q",
                            cond: { $eq: ["$$q._id", "$$attempt.quizId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    title: "$$attempt.title",
                    score: "$$attempt.score",
                    createdAt: "$$attempt.createdAt",
                    timeTaken: "$$attempt.timeTaken",
                    timeLimit: "$$quiz.timeLimit",
                    quizId: "$$attempt.quizId",

                    questions: {
                      $map: {
                        input: "$$quiz.questions",
                        as: "q",
                        in: {
                          questionId: "$$q._id",
                          question: "$$q.question",
                          image: "$$q.image",
                          options: "$$q.options",

                          // ❌ remove for students if needed
                          correctAnswer: "$$q.answer",

                          userAnswer: {
                            $let: {
                              vars: {
                                ua: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: "$$attempt.questions",
                                        as: "a",
                                        cond: {
                                          $eq: ["$$a.questionId", "$$q._id"],
                                        },
                                      },
                                    },
                                    0,
                                  ],
                                },
                              },
                              in: "$$ua.userAnswer",
                            },
                          },

                          isCorrect: {
                            $let: {
                              vars: {
                                ua: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: "$$attempt.questions",
                                        as: "a",
                                        cond: {
                                          $eq: ["$$a.questionId", "$$q._id"],
                                        },
                                      },
                                    },
                                    0,
                                  ],
                                },
                              },
                              in: "$$ua.isCorrect",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);

    if (!user.length) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const latestActivities = await Activites.find({
      userId: id,
      activityType: "lesson",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { ...user[0], latestActivities: latestActivities },
    });
  } catch (err) {
    next(err);
  }
};

const updateUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const updates = req.body;

    let updatedUser = await Users.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    updatedUser = await Users.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },
      {
        $addFields: {
          totalScore: { $sum: "$attempts.score" },
        },
      },
      {
        $project: {
          name: 1,
          totalScore: 1,
          email: 1,
          parentNumber: 1,
          grade: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (error) {
    next(error);
  }
};

const deleteUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const deletedUser = await Users.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const exportUsers = async (req, res, next) => {
  try {
    const { format = "json", grade, search } = req.query;

    // ===== Build Match Stage =====
    const matchStage = {};

    if (grade) {
      matchStage.grade = grade;
    }

    if (search) {
      matchStage.name = {
        $regex: search,
        $options: "i",
      };
    }

    // ===== Aggregation =====
    const users = await Users.aggregate([
      { $match: matchStage },

      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },

      {
        $addFields: {
          totalScore: { $sum: "$attempts.score" },
          quizzesTaken: { $size: "$attempts" },
        },
      },

      {
        $project: {
          name: 1,
          email: 1,
          parentNumber: 1,
          grade: 1,
          createdAt: 1,
          totalScore: 1,
          quizzesTaken: 1,
        },
      },

      {
        $sort: { totalScore: -1 },
      },
    ]);

    // =========================================================
    // ======================== PDF =============================
    // =========================================================

    if (format === "pdf") {
      const doc = new jsPDF("l", "mm", "a4");

      const primary = [19, 91, 236]; // #135bec
      const headerBg = [241, 245, 249]; // slate-50
      const textDark = [15, 23, 42]; // slate-900
      const textMuted = [100, 116, 139]; // slate-500
      const borderColor = [226, 232, 240]; // slate-200

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...textDark);
      doc.text("Users Management Report", 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(...textMuted);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

      // Primary divider
      doc.setDrawColor(...primary);
      doc.setLineWidth(1.5);
      doc.line(14, 30, 280, 30);

      autoTable.default(doc, {
        startY: 36,
        head: [
          [
            "Rank",
            "Student",
            "Grade",
            "Email",
            "Parent",
            "Score",
            "Quizzes",
            "Joined",
          ],
        ],
        body: users.map((user, index) => [
          index + 1,
          user.name || "-",
          user.grade || "-",
          user.email || "-",
          user.parentNumber || "-",
          user.totalScore || 0,
          user.quizzesTaken || 0,
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-",
        ]),
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: textDark,
          lineColor: borderColor,
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: headerBg,
          textColor: textDark,
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Users Report.pdf",
      );

      return res.send(Buffer.from(doc.output("arraybuffer")));
    }

    // =========================================================
    // ======================== EXCEL ==========================
    // =========================================================

    if (format === "xlsx") {
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Users");

      const headerBg = "FFF1F5F9";
      const borderColor = "FFE2E8F0";

      // Title
      worksheet.mergeCells("A1:H1");
      worksheet.getCell("A1").value = "Users Management Report";
      worksheet.getCell("A1").font = { size: 16, bold: true };

      worksheet.mergeCells("A2:H2");
      worksheet.getCell("A2").value =
        `Generated: ${new Date().toLocaleString()}`;
      worksheet.getCell("A2").font = {
        size: 10,
        color: { argb: "FF64748B" },
      };

      worksheet.addRow([]);

      // Header
      const headerRow = worksheet.addRow([
        "Rank",
        "Student",
        "Grade",
        "Email",
        "Parent",
        "Score",
        "Quizzes",
        "Joined",
      ]);

      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: headerBg },
        };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: borderColor } },
          left: { style: "thin", color: { argb: borderColor } },
          bottom: { style: "thin", color: { argb: borderColor } },
          right: { style: "thin", color: { argb: borderColor } },
        };
      });

      // Data
      users.forEach((user, index) => {
        const row = worksheet.addRow([
          index + 1,
          user.name || "-",
          user.grade || "-",
          user.email || "-",
          user.parentNumber || "-",
          user.totalScore || 0,
          user.quizzesTaken || 0,
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-",
        ]);

        row.eachCell((cell) => {
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: borderColor } },
            left: { style: "thin", color: { argb: borderColor } },
            bottom: { style: "thin", color: { argb: borderColor } },
            right: { style: "thin", color: { argb: borderColor } },
          };
        });
      });

      worksheet.columns = [
        { width: 8 },
        { width: 22 },
        { width: 12 },
        { width: 28 },
        { width: 18 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
      ];

      worksheet.views = [{ state: "frozen", ySplit: 4 }];
      worksheet.autoFilter = { from: "A4", to: "H4" };

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Users Report.xlsx",
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // =========================================================
    // ======================== JSON ===========================
    // =========================================================

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/* ================= UPLOAD QUIZ REPORT (PDF) ================= */
const uploadQuizReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const files = req.files?.docs || [];
    if (!files.length) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // return the first uploaded file info (Cloudinary provides .path and .filename)
    const file = files[0];
    const fileInfo = {
      url: file.path || file.location || file.secure_url || null,
      publicId: file.filename || file.public_id || null,
      originalName: file.originalname || file.originalName || null,
    };

    return res.status(200).json({ success: true, data: fileInfo });
  } catch (err) {
    next(err);
  }
};

/* ================ GET USER REPORTS ================= */
const getUserReports = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const reports = await Reports.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();
    return res
      .status(200)
      .json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

/* ================ GENERATE & UPLOAD QUIZ REPORT (PDF) ================ */
const generateQuizReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quizId } = req.body || {};

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message:
          "quizId is required. This endpoint generates a report for a single quiz.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const force =
      (req.query && req.query.force === "true") || req.body?.force === true;

    // ===== Get User + Attempts =====
    const userAgg = await Users.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "quizzesanswers",
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "attempts.quizId",
          foreignField: "_id",
          as: "quizzesData",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          parentNumber: 1,
          grade: 1,
          attempts: 1,
          quizzesData: 1,
        },
      },
    ]);

    if (!userAgg.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userAgg[0];

    // ===== Check Existing Report =====
    if (!force) {
      const existing = await Reports.findOne({
        userId: id,
        quizId: new mongoose.Types.ObjectId(quizId),
      })
        .sort({ createdAt: -1 })
        .lean();

      if (existing) {
        return res.status(200).json({
          success: true,
          existing: true,
          data: existing,
        });
      }
    }

    // ===== Filter Attempts =====
    let attempts = Array.isArray(user.attempts)
      ? user.attempts.filter((a) => String(a.quizId) === String(quizId))
      : [];

    if (!attempts.length) {
      return res.status(400).json({
        success: false,
        message: "No quiz attempts found",
      });
    }

    // ===== Generate image (SVG) summary =====
    const quiz = user.quizzesData.find((q) => String(q._id) === String(quizId));

    // pick the most recent attempt for this quiz
    attempts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const attempt = attempts[0];

    const total = Array.isArray(attempt.questions)
      ? attempt.questions.length
      : quiz && Array.isArray(quiz.questions)
        ? quiz.questions.length
        : 0;

    const correct = Array.isArray(attempt.questions)
      ? attempt.questions.reduce((s, q) => s + (q.isCorrect ? 1 : 0), 0)
      : 0;

    const incorrect = Math.max(total - correct, 0);
    const percent = total ? Math.round((correct / total) * 100) : null;
    const attemptDate =
      attempt && attempt.createdAt ? new Date(attempt.createdAt) : new Date();
    const timeSpentRaw =
      attempt &&
      (attempt.timeSpent ||
        attempt.duration ||
        attempt.time ||
        attempt.timeTaken)
        ? attempt.timeSpent ||
          attempt.duration ||
          attempt.time ||
          attempt.timeTaken
        : null;

    // normalize to a human-friendly string (attempt fields are seconds or strings)
    let timeSpent = null;
    if (timeSpentRaw !== null && timeSpentRaw !== undefined) {
      const secs = Number(timeSpentRaw) || 0;
      const mm = Math.floor(secs / 60);
      const ss = secs % 60;
      timeSpent = `${mm}m ${ss}s`;
    }

    // build a richer SVG image: embed optional logo and draw a simple performance chart
    const width = 1000;
    const height = 560;
    const bg = "#ffffff";
    const primary = "#135bec";
    const muted = "#64748b";

    // try to locate a logo file in known locations (admin can drop their image there)
    let logoDataUri = null;
    const logoCandidates = [
      path.join(__dirname, "../../public/logo.jpg"),
      path.join(
        __dirname,
        "../../..",
        "Math-Falta-frontend",
        "assets",
        "logo.jpg",
      ),
      path.join(__dirname, "../../..", "Math-Falta-frontend", "logo.jpg"),
    ];
    for (const p of logoCandidates) {
      try {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const b64 = buf.toString("base64");
          logoDataUri = `data:image/png;base64,${b64}`;
          break;
        }
      } catch (e) {
        // ignore and continue
      }
    }

    // small performance bar chart
    const barTotal = 260;
    const correctPct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const correctWidth = Math.round((correctPct / 100) * barTotal);
    const incorrectWidth = Math.max(barTotal - correctWidth, 0);

    const chartBlock = `
      <g transform="translate(620,40)">
        <text class="label" x="0" y="0">Performance</text>
        <rect x="0" y="14" width="${barTotal}" height="18" rx="9" fill="#eef2ff" />
        <rect x="0" y="14" width="${correctWidth}" height="18" rx="9" fill="#10b981" />
        <text class="muted" x="0" y="52">Correct: ${correct}</text>
        <text class="muted" x="${barTotal}" y="52" text-anchor="end">Incorrect: ${incorrect}</text>
        <text class="big" x="${barTotal / 2}" y="110" text-anchor="middle">${percent !== null ? percent + "%" : "-"}</text>
      </g>
    `;

    // assemble SVG with nicer styling and optional logo
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g1" x1="0" x2="1">
      <stop offset="0%" stop-color="#eef2ff" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
  </defs>
  <style>
    .title{font:800 30px Inter, Arial, Helvetica, sans-serif; fill:${primary}}
    .label{font:600 16px Inter, Arial, Helvetica, sans-serif; fill:#0f172a}
    .muted{font:400 13px Inter, Arial, Helvetica, sans-serif; fill:${muted}}
    .big{font:800 42px Inter, Arial, Helvetica, sans-serif; fill:#0f172a}
    .box{fill:url(#g1); stroke:#e6eef7; stroke-width:1}
  </style>

  <rect width="100%" height="100%" fill="${bg}" />
  <g transform="translate(40,28)">
    <text class="title">Math-Falta — Quiz Summary</text>
    <text class="muted" x="0" y="36">Generated: ${new Date().toLocaleString()}</text>

    ${logoDataUri ? `<image href="${logoDataUri}" x="760" y="0" width="180" height="60" preserveAspectRatio="xMidYMid meet" />` : ""}

    <g transform="translate(0,80)">
      <rect class="box" x="0" y="0" width="920" height="440" rx="16" />

      <text class="label" x="28" y="52">Student:</text>
      <text class="muted" x="150" y="52">${escapeXml(user.name || "-")}</text>

      <text class="label" x="28" y="90">Quiz:</text>
      <text class="muted" x="150" y="90">${escapeXml(quiz?.title || "-")}</text>

      <text class="label" x="28" y="128">Grade:</text>
      <text class="muted" x="150" y="128">${escapeXml(user.grade || "-")}</text>

      <text class="label" x="28" y="166">Date:</text>
      <text class="muted" x="150" y="166">${attemptDate.toLocaleString()}</text>

      <text class="label" x="28" y="230">Score:</text>
      <text class="big" x="150" y="240">${correct}/${total}</text>

      <text class="label" x="420" y="230">Percentage:</text>
      <text class="big" x="620" y="240">${percent !== null ? percent + "%" : "-"}</text>

      <text class="label" x="28" y="320">Correct:</text>
      <text class="label" x="150" y="320">${correct}</text>

      <text class="label" x="28" y="360">Incorrect:</text>
      <text class="label" x="150" y="360">${incorrect}</text>

      ${timeSpent ? `<text class="label" x="28" y="400">Time Spent:</text><text class="muted" x="150" y="400">${timeSpent}</text>` : ""}
      ${quiz && typeof quiz.timeLimit !== "undefined" ? `<text class="label" x="28" y="436">Time Limit:</text><text class="muted" x="150" y="436">${quiz.timeLimit && Number(quiz.timeLimit) > 0 ? quiz.timeLimit + " min" : "No limit"}</text>` : ""}

      ${chartBlock}

    </g>
  </g>
</svg>`;

    // Convert SVG to buffer and upload as image/svg+xml
    const buffer = Buffer.from(svg);

    const uploadResp = await uploadDocs.uploadFile(buffer, {
      folder: "math-falta/reports",
      resource_type: "image",
      public_id: `${id}-${quizId}-${Date.now()}`,
      format: "svg",
      contentType: "image/svg+xml",
    });

    const fileUrl = uploadResp.secure_url || uploadResp.url;

    // ===== Save Report =====
    const savedReport = await Reports.create({
      userId: id,
      quizId,
      url: fileUrl,
      publicId: uploadResp.public_id,
      meta: uploadResp,
    });

    return res.status(200).json({ success: true, data: savedReport });
  } catch (err) {
    next(err);
  }
};

/* ================= SEND QUIZ REPORT VIA WhatsApp Cloud API ================= */
const sendQuizReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { url, message } = req.body || {};

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "File URL is required" });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // from Meta Cloud API
    const token = process.env.WHATSAPP_TOKEN; // bearer token

    if (!phoneNumberId || !token) {
      return res.status(501).json({
        success: false,
        message: "WhatsApp Cloud API not configured on server",
      });
    }

    const user = await Users.findById(id).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const phoneRaw = user.parentNumber || user.phone || null;
    if (!phoneRaw) {
      return res.status(400).json({
        success: false,
        message: "No parent phone number for this user",
      });
    }

    const phone = phoneRaw.replace(/\D/g, "");

    const apiUrl = `https://graph.facebook.com/v15.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "document",
      document: {
        link: url,
        caption: message || `Quiz report for ${user.name || "student"}`,
      },
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const resp = await axios.post(apiUrl, payload, { headers });

    return res.status(200).json({ success: true, data: resp.data });
  } catch (err) {
    next(err);
  }
};

/* ================= SEND QUIZ REPORT DIRECT (upload file to WhatsApp Cloud API, then send) ================= */
// const sendQuizReportDirect = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const file = req.file;

//     if (!id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "User ID is required" });
//     }

//     if (!file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file provided" });
//     }

//     const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;
//     const token = WHATSAPP_TOKEN;

//     if (!phoneNumberId || !token) {
//       return res.status(501).json({
//         success: false,
//         message: "WhatsApp Cloud API not configured on server",
//       });
//     }

//     const user = await Users.findById(id).lean();
//     if (!user)
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });

//     const phoneRaw = user.parentNumber || user.phone || null;
//     if (!phoneRaw) throw new Error("No parent phone number for this user");

//     // Remove non-digits
//     let phone = phoneRaw.replace(/\D/g, "");

//     // Remove leading 0 if exists
//     if (phone.startsWith("0")) phone = phone.slice(1);

//     // Prepend country code (Egypt = 20)
//     const toPhone = `20${phone}`;

//     // 1) Upload media to WhatsApp Cloud API
//     const mediaUrl = `https://graph.facebook.com/v15.0/${phoneNumberId}/media`;
//     const mediaForm = new FormData();
//     mediaForm.append("file", file.buffer, {
//       filename: file.originalname || "report.pdf",
//       contentType: file.mimetype || "application/pdf",
//       knownLength: file.size,
//     });

//     const mediaResp = await axios.post(mediaUrl, mediaForm, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         ...mediaForm.getHeaders(),
//       },
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity,
//     });

//     const mediaId = mediaResp.data?.id;
//     if (!mediaId)
//       return res
//         .status(500)
//         .json({ success: false, message: "Media upload failed" });

//     // 2) Send document message using media id
//     const msgUrl = `https://graph.facebook.com/v15.0/${phoneNumberId}/messages`;
//     const payload = {
//       messaging_product: "whatsapp",
//       to: toPhone,
//       type: "document",
//       document: {
//         id: mediaId,
//         caption: `Quiz report for ${user.name || "student"}`,
//       },
//     };

//     const msgResp = await axios.post(msgUrl, payload, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     });

//     return res.status(200).json({ success: true, data: msgResp.data });
//   } catch (err) {
//     next(err);
//   }
// };

// controllers/admin/users.controllers.js

const sendQuizReportDirect = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file provided" });
    }

    const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;
    const token = WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      return res.status(501).json({
        success: false,
        message: "WhatsApp Cloud API not configured on server",
      });
    }

    // Fetch user
    const user = await Users.findById(id).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const phoneRaw = user.parentNumber || user.phone;
    if (!phoneRaw)
      return res.status(400).json({
        success: false,
        message: "No parent phone number for this user",
      });

    // Format phone number
    let phone = phoneRaw.replace(/\D/g, ""); // remove non-digits
    if (phone.startsWith("0")) phone = phone.slice(1); // remove leading 0
    const toPhone = `20${phone}`; // Egypt country code example

    // 1️⃣ Upload PDF to WhatsApp Cloud API (v24.0)
    const mediaForm = new FormData();
    mediaForm.append("file", file.buffer, {
      filename: file.originalname || "report.pdf",
      contentType: file.mimetype || "application/pdf",
      knownLength: file.size,
    });
    mediaForm.append("messaging_product", "whatsapp"); // REQUIRED for v24.0

    const mediaUrl = `https://graph.facebook.com/v24.0/${phoneNumberId}/media`;
    const mediaResp = await axios.post(mediaUrl, mediaForm, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...mediaForm.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const mediaId = mediaResp.data?.id;
    if (!mediaId) {
      console.error("Media upload response:", mediaResp.data);
      return res
        .status(500)
        .json({ success: false, message: "Media upload failed" });
    }

    // 2️⃣ Send document via WhatsApp
    const payload = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "document",
      document: {
        id: mediaId,
        caption: `Quiz report for ${user.name || "student"}`,
      },
    };

    const msgUrl = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;
    const msgResp = await axios.post(msgUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({ success: true, data: msgResp.data });
  } catch (err) {
    console.error(
      "Error sending quiz report:",
      err.response?.data || err.message,
    );
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  exportUsers,
  uploadQuizReport,
  generateQuizReport,
  getUserReports,
  sendQuizReport,
  sendQuizReportDirect,
};
