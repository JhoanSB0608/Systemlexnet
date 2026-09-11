const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware.js');

const uploadPath = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeName = decodeURIComponent(file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage: storage });

router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibió archivo.' });
  }
  res.status(200).json({
    fileUrl: `/uploads/${req.file.filename}`,
    uniqueFilename: req.file.filename,
  });
});

module.exports = router;