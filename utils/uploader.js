const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const imagekit = require("../config/imagekit");
const path = require("path");

// Use memory storage to access file buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

function isPdfExtension(fileName = "") {
  return path.extname(fileName).toLowerCase() === ".pdf";
}

// Middleware to upload files to the appropriate cloud provider
const uploadToCloud = async (req, res, next) => {
  if (!req.files) {
    return next();
  }

  const uploads = [];
  // when using multer.fields, req.files is an object of arrays
  // { docs: [file1, file2], otherField: [file3] }
  // we need to handle all fields
  const fileFields = Object.keys(req.files);

  for (const field of fileFields) {
    for (const file of req.files[field]) {
      const isPdf = isPdfExtension(file.originalname);

      try {
        let result;
        if (isPdf) {
          // Upload to ImageKit
          result = await imagekit.upload({
            file: file.buffer,
            fileName: file.originalname,
            folder: "math-falta/docs",
          });
        } else {
          // Upload to Cloudinary
          const b64 = Buffer.from(file.buffer).toString("base64");
          let dataURI = "data:" + file.mimetype + ";base64," + b64;
          result = await cloudinary.uploader.upload(dataURI, {
            resource_type: "raw",
            folder: "math-falta/docs",
            public_id: `${Date.now()}-${path.basename(file.originalname)}`,
          });
        }
        // Add a property to distinguish between providers
        result.provider = isPdf ? "imagekit" : "cloudinary";
        result.originalname = file.originalname; // Carry over the original name
        uploads.push(result);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
  }

  req.uploadedDocs = uploads;
  next();
};

const uploadDocs = upload.fields([{ name: "docs", maxCount: 100 }]);

async function uploadFile(input, options = {}) {
  const isPdf = options.fileName
    ? isPdfExtension(options.fileName)
    : options.isPdf || options.contentType === "application/pdf";

  try {
    if (isPdf) {
      const result = await imagekit.upload({
        file: input,
        fileName: options.fileName || "file.pdf",
        folder: options.folder || "math-falta/docs",
      });
      result.provider = "imagekit";
      return result;
    } else {
      let dataUri = input;
      if (Buffer.isBuffer(input)) {
        const contentType = options.contentType || "application/octet-stream";
        dataUri = `data:${contentType};base64,${input.toString("base64")}`;
      }

      const opts = { ...options, resource_type: "raw", type: "upload" };
      const result = await cloudinary.uploader.upload(dataUri, opts);
      result.provider = "cloudinary";
      return result;
    }
  } catch (error) {
    console.error("Programmatic upload error:", error);
    throw error;
  }
}

module.exports = {
  uploadDocs,
  uploadToCloud,
  uploadFile,
};

