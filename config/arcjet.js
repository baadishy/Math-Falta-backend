// arcjet.js
const { ARCJET_KEY } = require("../config/env");

let aj;

// Use async IIFE to load the ES module
(async () => {
  // Dynamically import the ES module
  const arcjetModule = await import("@arcjet/node");

  // Access exports from the module
  const { shield, detectBot, tokenBucket } = arcjetModule;

  // Initialize ArcJet
  aj = arcjetModule.default({
    key: ARCJET_KEY,
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({
        mode: "DRY_RUN",
        allow: ["CATEGORY:SEARCH_ENGINE", "USER_AGENT:PostmanRuntime"],
      }),
      tokenBucket({
        mode: "LIVE",
        refillRate: 10,
        interval: 2,
        capacity: 10,
      }),
    ],
  });
})();

// Export a function to get the initialized instance
// This ensures the import finishes before using it
module.exports = async function getArcJet() {
  // Wait until aj is initialized
  while (!aj) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return aj;
};
