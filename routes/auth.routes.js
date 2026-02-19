const { Router } = require("express");
const router = Router();
const { signIn, signUp, signOut } = require("../controllers/auth.controllers");

router.post("/sign-up", signUp);

router.post("/sign-in", signIn);

// Sign out will clear the auth cookie
router.get("/sign-out", signOut);

module.exports = router;
