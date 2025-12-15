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

module.exports = uploadDocs.fields([{ name: "docs", maxCount: 100 }]);
