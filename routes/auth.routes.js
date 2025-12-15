const { Router } = require("express");
const router = Router();
const {signIn, signUp} = require("../controllers/auth.controllers");

router.post("/sign-up", signUp);

router.post("/sign-in", signIn);

module.exports = router;
