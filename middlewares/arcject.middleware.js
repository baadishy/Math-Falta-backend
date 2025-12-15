const aj = require("../config/arcjet");

const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {requested: 1});

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit())
        return res
          .status(429)
          .json({ success: false, msg: "Too many requests" });

      if (decision.reason.isBot())
        return res.status(403).json({ success: false, msg: "Bot detected" });

      return res.status(403).json({ success: false, msg: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
    next(error);
  }
};

module.exports = arcjetMiddleware;