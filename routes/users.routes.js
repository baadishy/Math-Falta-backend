const { Router } = require("express");
const {
  getAllUsers,
  getUserById,
  updateUserById,
  sendReport,
} = require("../controllers/users.controllers");
const authMiddleware = require("../middlewares/auth.middleware");
const router = Router();

router.use(authMiddleware);

router.get("/leaderboard", getAllUsers);

router.get("/me", getUserById);
router.get("/header", getUserById);

router.put("/me", updateUserById);

router.post("/send-report", sendReport);

module.exports = router;
