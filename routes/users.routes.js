const { Router } = require("express");
const { getAllUsers, getUserById, updateUserById } = require("../controllers/users.controllers");
const authMiddleware = require("../middlewares/auth.middleware");
const router = Router();

router.use(authMiddleware);

router.get("/leaderboard", getAllUsers);

router.get("/me", getUserById);

router.put("/me", updateUserById);

module.exports = router;
