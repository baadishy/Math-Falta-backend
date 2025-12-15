const errMiddleware = (error, req, res, next) => {
  try {
    let err = { ...error };
    err.message = error.message;

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      err = new Error(messages.join(", "));
      err.statusCode = 400;
    }

    if (error.code === 11000) {
      const message = `Duplicate field value entered: ${JSON.stringify(
        error.keyValue
      )}`;
      err = new Error(message);
      err.statusCode = 400;
    }

    if (error.name === "CastError") {
      const message = `Resource not found`;
      err = new Error(message);
      err.statusCode = 404;
    }

    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Server Error",
    });

    console.error("Error:", error);
  } catch (error) {
    console.error("Error in error handling middleware:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = errMiddleware;