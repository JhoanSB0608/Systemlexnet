const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createConciliacion, getConciliacionDocumento, getConciliacionById, updateConciliacion, getMisConciliaciones, saveBorrador, updateBorrador, deleteBorrador } = require('../controllers/conciliacionController.js');
const { protect } = require('../middleware/authMiddleware.js');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

const uploadFields = upload.fields([
  { name: 'anexos' },
  { name: 'firma', maxCount: 1 }
]);

router.route('/')
  .post(protect, uploadFields, createConciliacion)
  .get(protect, getMisConciliaciones);

// Rutas de borrador (guardado parcial). Se registran antes de /:id para que
// "borrador" no sea interpretado como un ObjectId.
router.route('/borrador')
  .post(protect, saveBorrador);

router.route('/borrador/:id')
  .put(protect, updateBorrador)
  .delete(protect, deleteBorrador);

router.route('/:id')
    .get(protect, getConciliacionById)
    .put(protect, uploadFields, updateConciliacion);

router.route('/:id/documento').get(protect, getConciliacionDocumento);

module.exports = router;
