jest.mock("../models/quizzes.model", () => {
  return jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
});

jest.mock("../models/quizzes-answers.model", () => ({ findOne: jest.fn() }));

jest.mock("../config/cloudinary", () => ({ uploader: { destroy: jest.fn() } }));

const Quizzes = require("../models/quizzes.model");
const {
  createQuiz,
  addQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
  softDeleteQuizById,
} = require("../controllers/admin/quizzes.controllers");

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("Admin quizzes controllers", () => {
  beforeEach(() => jest.clearAllMocks());

  test("createQuiz should parse questions and save quiz", async () => {
    const req = {
      body: {
        title: "Test Quiz",
        grade: "10",
        questions: JSON.stringify([
          { question: "q1", options: ["a"], answer: 0 },
        ]),
      },
      files: {},
    };
    const res = mockRes();
    await createQuiz(req, res, jest.fn());

    expect(Quizzes).toHaveBeenCalled();
    // The constructor was called with normalized answers (numeric 0 -> 'A')
    expect(Quizzes.mock.calls[0][0].questions[0].answer).toBe("A");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("addQuizQuestions should append new questions to existing quiz", async () => {
    const existing = {
      _id: "1",
      questions: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Quizzes.findOne = jest.fn().mockResolvedValue(existing);

    const req = {
      params: { id: "1" },
      body: {
        questions: JSON.stringify([
          { question: "q2", options: ["a"], answer: 0 },
        ]),
      },
      files: {},
    };
    const res = mockRes();
    await addQuizQuestions(req, res, jest.fn());

    expect(Quizzes.findOne).toHaveBeenCalledWith({
      _id: "1",
      isDeleted: false,
    });
    // New questions should have normalized answers
    expect(existing.questions[0].answer).toBe("A");
    expect(existing.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("updateQuizQuestion returns 404 when quiz not found", async () => {
    Quizzes.findOne = jest.fn().mockResolvedValue(null);
    const req = { params: { quizId: "no", questionId: "q" }, body: {} };
    const next = jest.fn();
    const res = mockRes();
    await updateQuizQuestion(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("updateQuizQuestion normalizes numeric answer to letter", async () => {
    const questionObj = { _id: "q", answer: "B" };
    const quiz = {
      _id: "1",
      questions: { id: jest.fn().mockReturnValue(questionObj) },
      save: jest.fn(),
    };
    Quizzes.findOne = jest.fn().mockResolvedValue(quiz);

    const req = {
      params: { quizId: "1", questionId: "q" },
      body: { answer: 0 },
      files: {},
    };
    const res = mockRes();
    await updateQuizQuestion(req, res, jest.fn());

    expect(questionObj.answer).toBe("A");
    expect(quiz.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("deleteQuizQuestion returns 404 when question not found", async () => {
    // make questions a Mongoose-like array with id() helper
    const quiz = {
      _id: "1",
      questions: { id: jest.fn().mockReturnValue(null) },
      save: jest.fn(),
    };
    Quizzes.findOne = jest.fn().mockResolvedValue(quiz);
    const req = { params: { quizId: "1", questionId: "missing" } };
    const res = mockRes();
    await deleteQuizQuestion(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("softDeleteQuizById marks quiz as deleted", async () => {
    const quiz = {
      _id: "1",
      isDeleted: false,
      save: jest.fn().mockResolvedValue(true),
    };
    Quizzes.findOne = jest.fn().mockResolvedValue(quiz);
    const req = { params: { id: "1" } };
    const res = mockRes();
    await softDeleteQuizById(req, res, jest.fn());
    expect(quiz.isDeleted).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
