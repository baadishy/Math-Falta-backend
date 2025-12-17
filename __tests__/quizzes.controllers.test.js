const {
  getTitlesByGrade,
  getQuizByQuizId,
  addQuizAnswersByUserId,
} = require("../controllers/quizzes.controllers");

jest.mock("../models/quizzes.model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/quizzes-answers.model", () => ({
  create: jest.fn(),
}));

jest.mock("../models/activites.model", () => ({
  create: jest.fn(),
}));

const Quizzes = require("../models/quizzes.model");
const QuizzesAnswers = require("../models/quizzes-answers.model");

describe("Quizzes controllers (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getTitlesByGrade returns titles for grade", async () => {
    const req = { user: { grade: "7" } };
    const quizzes = [{ title: "A" }, { title: "B" }];
    Quizzes.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(quizzes),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getTitlesByGrade(req, res, () => {});

    expect(Quizzes.find).toHaveBeenCalledWith({ grade: "7", isDeleted: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: ["A", "B"] });
  });

  test("getQuizByQuizId forbids access when grade mismatch", async () => {
    const req = { params: { id: "q1" }, user: { grade: "5" } };
    const quiz = { grade: "6" };
    Quizzes.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(quiz),
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getQuizByQuizId(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Access to this quiz is forbidden",
    });
  });

  test("addQuizAnswersByUserId validates quizId and attaches title", async () => {
    const req = { user: { _id: "u1" }, body: { quizId: "q1", questions: [] } };
    const quiz = { title: "T1" };
    Quizzes.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(quiz),
    });
    QuizzesAnswers.create.mockResolvedValue({
      _id: "a1",
      quizId: "q1",
      title: "T1",
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await addQuizAnswersByUserId(req, res, () => {});

    expect(Quizzes.findById).toHaveBeenCalledWith("q1");
    expect(QuizzesAnswers.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
