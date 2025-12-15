const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const adminMiddleware = require("../../middlewares/admin.middleware");
const { getAllUsers, getUserById, updateUserById, deleteUserById, createAdmin } = require("../../controllers/admin/users.controllers");

router.use(authMiddleware, adminMiddleware);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createAdmin);
router.put('/:id', updateUserById);
router.delete('/:id', deleteUserById);

module.exports = router;