const express = require("express");
const app = express();
const cors = require("cors");
const { PORT, MONGODB_URI } = require("./config/env");
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

app.use(express.json(), cors());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(arcjetMiddleware);

app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/lessons", lessonsRouter);

app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/quizzes", adminQuizzesRouter);
app.use("/api/admin/lessons", adminLessonsRouter);

app.use(errMiddleware);

app.post("/", async (req, res) => {
  res.send("server running");
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to mongodb");
    app.listen(PORT, async () => {
      console.log(`server is listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log(err.message));
