jest.mock("../models/lessons.model", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

const Lessons = require("../models/lessons.model");
const {
  createLesson,
  getLessonById,
} = require("../controllers/admin/lessons.controllers");

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("Admin lessons controllers", () => {
  beforeEach(() => jest.clearAllMocks());

  test("createLesson validates required fields", async () => {
    const req = {
      body: { title: "", topic: "", grade: "", video: "" },
      files: {},
    };
    const res = mockRes();
    await createLesson(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("getLessonById returns 404 when id missing", async () => {
    const req = { params: {} };
    const res = mockRes();
    await getLessonById(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("getLessonById returns lesson when found", async () => {
    const lesson = { _id: "1", title: "L1" };
    Lessons.findOne.mockResolvedValue(lesson);
    const req = { params: { id: "1" } };
    const res = mockRes();
    await getLessonById(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: lesson })
    );
  });
});
