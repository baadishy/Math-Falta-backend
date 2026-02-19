const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const path = require("path");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname); // .pdf .docx .pptx ...

    return {
      folder: "math-falta/docs",
      resource_type: "raw",

      // keep filename WITHOUT extension
      public_id: `${Date.now()}-${path.basename(file.originalname, ext)}`,

      // 🔴 THIS IS THE IMPORTANT PART
      format: ext.replace(".", ""), // keeps extension in Cloudinary
    };
  },
});

const uploadDocs = multer({ storage });

// middleware for incoming uploads (keeps existing default export)
const middleware = uploadDocs.fields([{ name: "docs", maxCount: 100 }]);

// programmatic upload helper: accepts Buffer or data URI
async function uploadFile(input, options = {}) {
  let dataUri = input;

  // If a Buffer was provided, convert to data URI. Caller may pass contentType via options.
  if (Buffer.isBuffer(input)) {
    const contentType = options.contentType || "application/pdf";
    dataUri = `data:${contentType};base64,${input.toString("base64")}`;
  }

  const opts = Object.assign({}, options);

  // Ensure resource_type/raw is used for docs unless overridden
  if (!opts.resource_type) opts.resource_type = "raw";
  // Ensure public upload type (avoid authenticated/private delivery)
  if (!opts.type) opts.type = "upload";

  return cloudinary.uploader.upload(dataUri, opts);
}

module.exports = middleware;
module.exports.uploadFile = uploadFile;
