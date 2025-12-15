const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'math-falta/images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
  },
});

const uploadImages = multer({ storage: storage });

// Accept multiple fields: image0, image1, image2, etc.
const maxQuestions = 100; // or any max number of questions you want
const imageFields = Array.from({ length: maxQuestions }, (_, i) => ({ name: `image${i}` }));

module.exports = uploadImages.fields(imageFields)