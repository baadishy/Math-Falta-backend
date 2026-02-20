const express = require("express");
console.log("server.js starting");
const app = express();
const cors = require("cors");
const path = require("path");
const { PORT, MONGODB_URI, FRONTEND_URL } = require("./config/env");
const authRouter = require("./routes/auth.routes");
const usersRouter = require("./routes/users.routes");
const quizzesRouter = require("./routes/quizzes.routes");
const lessonsRouter = require("./routes/lessons.routes");
const mongoose = require("mongoose");
const errMiddleware = require("./middlewares/err.middleware");
const arcjetMiddleware = require("./middlewares/arcject.middleware");
const cookieParser = require("cookie-parser");
const adminUsersRouter = require("./routes/admin/users.routes");
const adminQuizzesRouter = require("./routes/admin/quizzes.routes");
const adminLessonsRouter = require("./routes/admin/lessons.routes");
const adminRouter = require("./routes/admin/admin.routes");
const reportsRouter = require("./routes/reports.routes");
const { ensurePortFree } = require("./utils/port-check");

// Configure CORS to accept requests from the frontend only and allow credentials (cookies)
const isProd = process.env.NODE_ENV === "production";
const corsOptions = {
  origin: isProd && FRONTEND_URL ? FRONTEND_URL : true,
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(arcjetMiddleware);

// Do NOT serve the frontend by default in production.
// If you need to serve the frontend for local development, set `SERVE_FRONTEND=true`.
if (process.env.SERVE_FRONTEND === "true") {
  const frontendPath = path.join(__dirname, "../Math-Falta-frontend");
  try {
    if (require("fs").existsSync(frontendPath)) {
      app.use(express.static(frontendPath));
      console.log("Serving frontend from", frontendPath);
    }
  } catch (e) {
    console.warn("Could not serve frontend:", e.message);
  }
}

app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/lessons", lessonsRouter);

app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/quizzes", adminQuizzesRouter);
app.use("/api/admin/lessons", adminLessonsRouter);
app.use("/api/admin", adminRouter);

// Short public report redirect (e.g. /r/605c8f...)
app.use("/r", reportsRouter);

app.use(errMiddleware);

// Simple dev PID file to avoid running multiple local server instances
const fs = require("fs");
const PID_FILE = ".server.pid";
function writePidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const existing = fs.readFileSync(PID_FILE, "utf8").trim();
      if (existing) {
        const pid = Number(existing);
        try {
          // Check if process exists
          process.kill(pid, 0);
          console.error(
            `PID file ${PID_FILE} exists and process ${pid} appears alive. If this is unexpected, kill the process or remove ${PID_FILE}.`,
          );
          process.exit(1);
        } catch (err) {
          // Process not running - stale PID file
          console.log(`Stale PID file found (${pid}), overwriting.`);
        }
      }
    }
    fs.writeFileSync(PID_FILE, String(process.pid));
    const remove = () => {
      try {
        if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
      } catch (e) {}
    };
    process.on("exit", remove);
    process.on("SIGINT", () => {
      remove();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      remove();
      process.exit(0);
    });
    process.on("uncaughtException", (err) => {
      console.error(err);
      remove();
      process.exit(1);
    });
  } catch (e) {
    console.warn("Could not write PID file:", e.message);
  }
}

writePidFile();

app.post("/", async (req, res) => {
  res.send("server running");
});

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("connected to mongodb");
    console.log(`attempting to listen on port ${PORT}...`);
    try {
      // Ensure port is free (retries to handle short races from restarts)
      await ensurePortFree(PORT, { retries: 4, delay: 300 });
    } catch (err) {
      console.error("Port check failed:", err.message);
      console.error(
        "Server will exit. See troubleshooting notes in README.md for how to free the port.",
      );
      process.exit(1);
    }

    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`server is listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log(err.message));
