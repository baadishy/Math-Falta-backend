const imagekit = require('../config/imagekit');

async function uploadPdf(file, options = {}) {
  return new Promise((resolve, reject) => {
    imagekit.upload(
      {
        file: file.buffer,
        fileName: file.originalname,
        folder: 'math-falta/pdfs',
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
}

module.exports = {
  uploadPdf,
};
